"""Attendance marking endpoint (kiosk; liveness verified client-side)."""

import logging
import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.limiter import limiter
from app.db.session import get_db
from app.models import Attendance, User
from app.schemas import AttendanceResponse, UserResponse
from app.services.face_recognition import face_service

logger = logging.getLogger("smart_attendance.attendance")

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("/mark")
@limiter.limit(settings.RATE_LIMIT_ATTENDANCE)
async def mark_attendance(
    request: Request,
    file: Optional[UploadFile] = File(None),
    files: List[UploadFile] = File(None),
    liveness_verified: bool = Form(False),
    db: Session = Depends(get_db),
):
    """
    Mark attendance from one or more captured frames.

    Multiple frames are recognized independently and must reach majority
    agreement (multi-frame voting), which reduces false accepts/rejects from a
    single bad frame. Liveness/anti-spoofing is performed live on the client via
    an active blink challenge; the server rejects frames not liveness-verified.
    """
    temp_paths: List[str] = []
    try:
        if not liveness_verified:
            raise HTTPException(
                status_code=403,
                detail="Liveness not verified. Please look at the camera and blink so we can confirm a live person.",
            )

        # Accept either a single `file` or a list of `files`.
        uploads = [f for f in ([file] + (files or [])) if f is not None]
        if not uploads:
            raise HTTPException(status_code=422, detail="No image frame provided.")

        for i, upload in enumerate(uploads):
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
            path = os.path.join(settings.UPLOAD_DIR, f"temp_{timestamp}_{i}.jpg")
            with open(path, "wb") as buffer:
                buffer.write(await upload.read())
            temp_paths.append(path)
        logger.info(f"Attendance frames received: {len(temp_paths)}")

        recognition = face_service.recognize_frames(temp_paths)
        if not recognition:
            raise HTTPException(
                status_code=404,
                detail="Face not recognized. Please ensure your face is clearly visible and that you have registered.",
            )

        confidence = recognition["confidence"]
        recognized_user_id = recognition["user_id"]

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

        today = datetime.now().date()
        existing_attendance = (
            db.query(Attendance)
            .filter(Attendance.user_id == user.id, Attendance.date == today)
            .first()
        )

        if existing_attendance:
            if existing_attendance.status == "absent":
                existing_attendance.status = "present"
                existing_attendance.time_in = datetime.now().time()
                db.commit()
                db.refresh(existing_attendance)
                return {
                    "message": f"Attendance updated for {user.full_name} - status changed from absent to present",
                    "user": UserResponse.model_validate(user),
                    "attendance": AttendanceResponse.model_validate(existing_attendance),
                    "confidence": confidence,
                }
            time_str = (
                existing_attendance.time_in.strftime("%I:%M %p")
                if existing_attendance.time_in
                else existing_attendance.status
            )
            raise HTTPException(
                status_code=400,
                detail=f"Attendance already marked for {user.full_name} today as {existing_attendance.status}"
                + (f" at {time_str}" if existing_attendance.time_in else ""),
            )

        attendance = Attendance(
            user_id=user.id,
            date=today,
            time_in=datetime.now().time(),
            status="present",
        )
        db.add(attendance)
        db.commit()
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
    except Exception as e:
        logger.exception("Attendance marking failed")
        raise HTTPException(status_code=500, detail=f"Attendance marking failed: {str(e)}")
    finally:
        for path in temp_paths:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass
