"""Attendance marking endpoint (kiosk; liveness verified on client and server)."""

import logging
import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.limiter import limiter
from app.core.time_utils import now_local, today_local
from app.api.deps import get_optional_current_user
from app.db.session import get_db
from app.models import Attendance, User
from app.schemas import AttendanceResponse, UserResponse
from app.services.face_recognition import face_service

logger = logging.getLogger("smart_attendance.attendance")

router = APIRouter(prefix="/attendance", tags=["attendance"])


def _already_marked(user: User, record: Attendance) -> HTTPException:
    """Build the 'already marked today' 400 for an existing attendance row."""
    detail = f"Attendance already marked for {user.full_name} today as {record.status}"
    if record.time_in:
        detail += f" at {record.time_in.strftime('%I:%M %p')}"
    return HTTPException(status_code=400, detail=detail)


@router.post("/mark")
@limiter.limit(settings.RATE_LIMIT_ATTENDANCE)
async def mark_attendance(
    request: Request,
    file: Optional[UploadFile] = File(None),
    files: List[UploadFile] = File(None),
    liveness_verified: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Mark attendance from multiple captured frames.

    Frames are recognized independently and must reach majority agreement
    (multi-frame voting), which reduces false accepts/rejects from a single bad
    frame.

    Liveness is checked on both sides. The client runs an active blink challenge
    (MediaPipe) and reports the result via ``liveness_verified``; because that
    flag is client-supplied it is treated as a necessary but not sufficient
    signal. Independently, the server verifies that the submitted frames are
    genuinely distinct captures, which rejects a client replaying a single still
    image. See ``face_service.frames_are_distinct`` for the limits of that
    guard.

    When the request is authenticated (a logged-in user), recognition is
    restricted to that account: showing another person's face is rejected so a
    user cannot mark attendance for someone else. When unauthenticated (kiosk
    mode), any registered user can be recognized.
    """
    temp_paths: List[str] = []
    try:
        # Accept either a single `file` or a list of `files`.
        uploads = [f for f in ([file] + (files or [])) if f is not None]
        if not uploads:
            raise HTTPException(status_code=422, detail="No image frame provided.")

        min_frames = settings.ATTENDANCE_MIN_FRAMES
        if len(uploads) < min_frames:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Attendance requires at least {min_frames} live camera frames; "
                    f"received {len(uploads)}."
                ),
            )

        for i, upload in enumerate(uploads):
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
            path = os.path.join(settings.UPLOAD_DIR, f"temp_{timestamp}_{i}.jpg")
            with open(path, "wb") as buffer:
                buffer.write(await upload.read())
            temp_paths.append(path)
        logger.info(f"Attendance frames received: {len(temp_paths)}")

        # Server-side replay guard. Checked before the client's own claim so a
        # forged `liveness_verified=true` cannot stand on its own.
        diversity = face_service.frames_are_distinct(temp_paths)
        if not diversity["distinct"]:
            logger.warning(
                f"Attendance replay guard rejected submission: {diversity['reason']} "
                f"(min_diff={diversity['min_diff']})"
            )
            raise HTTPException(
                status_code=403,
                detail=(
                    "Liveness could not be confirmed from the submitted frames. "
                    "Please look at the camera and blink so we can capture a live sequence."
                ),
            )

        if not liveness_verified:
            raise HTTPException(
                status_code=403,
                detail="Liveness not verified. Please look at the camera and blink so we can confirm a live person.",
            )

        recognition = face_service.recognize_frames(temp_paths, db)
        if not recognition:
            raise HTTPException(
                status_code=404,
                detail="Face not recognized. Please ensure your face is clearly visible and that you have registered.",
            )

        confidence = recognition["confidence"]
        recognized_user_id = recognition["user_id"]

        # If the request is authenticated, the recognized face must belong to
        # the logged-in account. This prevents one user from marking another
        # user's attendance by showing their face.
        if current_user is not None and recognized_user_id != current_user.unique_id:
            logger.info(
                f"Face mismatch: recognized {recognized_user_id} but logged in as "
                f"{current_user.unique_id}"
            )
            raise HTTPException(
                status_code=403,
                detail="This face does not belong to the logged-in account.",
            )

        # Confidence band: matched, but not confident enough → ask to retry.
        if confidence < settings.FACE_ATTENDANCE_MIN_CONFIDENCE:
            logger.info(f"Low-confidence match {recognized_user_id} ({confidence}%) — retry requested")
            raise HTTPException(
                status_code=422,
                detail=f"Low confidence ({confidence:.0f}%). Move closer, face the camera directly, and try again.",
            )

        logger.info(
            f"Recognition: {recognized_user_id} (confidence {confidence}%, "
            f"{recognition.get('frames_agreed')}/{recognition.get('frames_total')} frames)"
        )

        user = db.query(User).filter(User.unique_id == recognized_user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found in database")

        today = today_local()
        existing_attendance = (
            db.query(Attendance)
            .filter(Attendance.user_id == user.id, Attendance.date == today)
            .first()
        )

        if existing_attendance:
            if existing_attendance.status == "absent":
                existing_attendance.status = "present"
                existing_attendance.time_in = now_local().time()
                db.commit()
                db.refresh(existing_attendance)
                return {
                    "message": f"Attendance updated for {user.full_name} - status changed from absent to present",
                    "user": UserResponse.model_validate(user),
                    "attendance": AttendanceResponse.model_validate(existing_attendance),
                    "confidence": confidence,
                }
            raise _already_marked(user, existing_attendance)

        attendance = Attendance(
            user_id=user.id,
            date=today,
            time_in=now_local().time(),
            status="present",
        )
        db.add(attendance)
        try:
            db.commit()
        except IntegrityError:
            # A concurrent request inserted today's row between the check above
            # and this commit. The uq_attendance_user_date constraint is what
            # stops the duplicate; resolve the race by reporting the row that
            # won, so the caller sees the same result as a sequential retry.
            db.rollback()
            winner = (
                db.query(Attendance)
                .filter(Attendance.user_id == user.id, Attendance.date == today)
                .first()
            )
            logger.info(f"Concurrent attendance mark for {user.unique_id} resolved to existing row")
            if winner is None:
                raise
            raise _already_marked(user, winner)
        db.refresh(attendance)
        logger.info(f"Attendance marked for {user.full_name} ({user.unique_id})")

        return {
            "message": f"Attendance marked successfully for {user.full_name}",
            "user": UserResponse.model_validate(user),
            "attendance": AttendanceResponse.model_validate(attendance),
            "confidence": confidence,
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Attendance marking failed")
        raise HTTPException(status_code=500, detail="Attendance marking failed. Please try again.")
    finally:
        for path in temp_paths:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass
