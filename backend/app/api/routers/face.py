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
    """Register face images for current user with quality checks."""
    if len(files) < 5:
        raise HTTPException(status_code=400, detail="At least 5 face images required")
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 face images allowed")

    try:
        image_paths = []
        user_dir = os.path.join(settings.DATASET_DIR, current_user.unique_id)
        os.makedirs(user_dir, exist_ok=True)

        # Save uploaded images temporarily for duplicate check
        temp_image_paths = []
        for i, file in enumerate(files):
            file_path = os.path.join(user_dir, f"temp_face_{i + 1}.jpg")
            with open(file_path, "wb") as buffer:
                buffer.write(await file.read())
            temp_image_paths.append(file_path)

        # Check for duplicate faces in the database
        try:
            duplicate_user = face_service.find_duplicate_face(
                temp_image_paths[0], db, current_user.unique_id
            )
            if duplicate_user:
                for temp_file in temp_image_paths:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"This face is already registered to user: {duplicate_user['full_name']} "
                        f"(ID: {duplicate_user['unique_id']}). Each person can only register once."
                    ),
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Duplicate detection failed: {str(e)}")

        # Remove any previously registered face images so re-registration
        # always reflects the latest capture (avoids stale/older faces lingering)
        for old_file in os.listdir(user_dir):
            if old_file.startswith("face_") and old_file.endswith((".jpg", ".jpeg", ".png")):
                old_path = os.path.join(user_dir, old_file)
                if old_path not in temp_image_paths:
                    try:
                        os.remove(old_path)
                    except OSError:
                        pass

        # Rename temp files to final names
        for i, temp_file in enumerate(temp_image_paths):
            final_file = os.path.join(user_dir, f"face_{i + 1}.jpg")
            if os.path.exists(final_file):
                os.remove(final_file)
            os.rename(temp_file, final_file)
            image_paths.append(final_file)

        result = face_service.train_user_face(current_user.unique_id, image_paths)
        if not result.get("success", False):
            raise HTTPException(
                status_code=400,
                detail=result.get("message", "Face registration failed"),
            )

        current_user.face_registered = True
        current_user.face_encoding_path = os.path.join(user_dir, "encoding.json")
        db.commit()

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
                "average_liveness_confidence": (
                    round(stats["average_liveness_confidence"], 2)
                    if stats.get("average_liveness_confidence")
                    else None
                ),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face registration failed: {str(e)}")
