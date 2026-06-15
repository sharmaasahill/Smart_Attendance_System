"""Face quality, liveness, and enrollment endpoints for the current user."""

import logging
import os
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.db.session import get_db
from app.models import User
from app.services.face_recognition import face_service

logger = logging.getLogger("smart_attendance.face")

router = APIRouter(prefix="/face", tags=["face"])


@router.post("/check-liveness")
async def check_liveness_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_user),
):
    """Real-time liveness detection (anti-spoofing)."""
    temp_path = None
    try:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
        temp_path = os.path.join(settings.UPLOAD_DIR, f"liveness_check_{timestamp}.jpg")
        with open(temp_path, "wb") as buffer:
            buffer.write(await file.read())

        liveness_result = face_service.check_image_liveness(temp_path)
        return {
            "liveness_check": liveness_result,
            "timestamp": datetime.now().isoformat(),
            "status": "live_person" if liveness_result["is_live"] else "spoof_detected",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Liveness check failed: {str(e)}")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/check-quality")
async def check_face_quality_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_user),
):
    """Real-time face quality check for image capture."""
    temp_path = None
    try:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
        temp_path = os.path.join(settings.UPLOAD_DIR, f"quality_check_{timestamp}.jpg")
        with open(temp_path, "wb") as buffer:
            buffer.write(await file.read())

        quality_result = face_service.check_image_quality(temp_path)
        return {"quality_check": quality_result, "timestamp": datetime.now().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quality check failed: {str(e)}")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/register")
async def register_face(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Register face images for the current user (stored in the database)."""
    if len(files) < 5:
        raise HTTPException(status_code=400, detail="At least 5 face images required")
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 face images allowed")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    temp_paths = []
    try:
        for i, file in enumerate(files):
            ts = datetime.now().strftime("%Y%m%d%H%M%S%f")
            path = os.path.join(settings.UPLOAD_DIR, f"enroll_{current_user.unique_id}_{i}_{ts}.jpg")
            with open(path, "wb") as buffer:
                buffer.write(await file.read())
            temp_paths.append(path)

        # Reject if this face is already enrolled to a different user.
        try:
            duplicate_user = face_service.find_duplicate_face(temp_paths[0], db, current_user.unique_id)
        except Exception as e:
            logger.warning(f"Duplicate detection failed: {str(e)}")
            duplicate_user = None
        if duplicate_user:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"This face is already registered to user: {duplicate_user['full_name']} "
                    f"(ID: {duplicate_user['unique_id']}). Each person can only register once."
                ),
            )

        result = face_service.enroll_user(db, current_user, temp_paths)
        stats = result["statistics"]
        return {
            "message": "Face registration successful",
            "user_id": current_user.unique_id,
            "statistics": stats,
            "quality_summary": {
                "total_images": stats["total_images"],
                "acceptable_images": stats["acceptable_images"],
                "average_quality_score": round(stats["average_quality_score"], 2),
                "liveness_checked": stats.get("liveness_checked", False),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face registration failed: {str(e)}")
    finally:
        for path in temp_paths:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass

