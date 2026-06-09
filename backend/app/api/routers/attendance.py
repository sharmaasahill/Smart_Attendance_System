"""Attendance marking endpoint (kiosk; liveness verified client-side)."""

import logging
import os
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models import Attendance, User
from app.schemas import AttendanceResponse, UserResponse
from app.services.face_recognition import face_service

logger = logging.getLogger("smart_attendance.attendance")

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("/mark")
async def mark_attendance(
    file: UploadFile = File(...),
    liveness_verified: bool = Form(False),
    db: Session = Depends(get_db),
):
    """
    Mark attendance from a single captured frame.

    Liveness/anti-spoofing is performed live on the client via an active
    blink/motion challenge (MediaPipe). The client sends liveness_verified=true
    only after a genuine blink is observed; the server rejects frames that were
    not liveness-verified.
    """
    temp_path = None
    try:
        if not liveness_verified:
            raise HTTPException(
                status_code=403,
                detail="Liveness not verified. Please look at the camera and blink so we can confirm a live person.",
            )

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
        temp_path = os.path.join(settings.UPLOAD_DIR, f"temp_{timestamp}.jpg")
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        logger.info(f"Attendance frame received: {len(content)} bytes")

        recognition = face_service.recognize(temp_path)
        if not recognition:
            raise HTTPException(
                status_code=404,
                detail="Face not recognized. Please ensure your face is clearly visible and that you have registered.",
            )

        recognized_user_id = recognition["user_id"]
        confidence = recognition["confidence"]
        logger.info(f"Recognition: {recognized_user_id} (confidence {confidence}%)")

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
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
