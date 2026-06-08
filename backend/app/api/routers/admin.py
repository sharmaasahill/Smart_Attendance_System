"""Admin endpoints: user management, attendance management, face management."""

import logging
import os
import pickle
import shutil
import base64
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.db.session import get_db
from app.models import Attendance, User
from app.schemas import AttendanceResponse, UserResponse
from app.services.face_recognition import face_service

logger = logging.getLogger("smart_attendance.admin")

router = APIRouter(prefix="/admin", tags=["admin"])


def _user_dir(unique_id: str) -> str:
    return os.path.join(settings.DATASET_DIR, unique_id)


@router.get("/users")
async def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    users = db.query(User).all()
    return [UserResponse.from_orm(user) for user in users]


@router.get("/attendance")
async def get_attendance_records(
    date: str = None,
    user_id: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    query = db.query(Attendance).join(User)
    if date:
        query = query.filter(Attendance.date == datetime.strptime(date, "%Y-%m-%d").date())
    if user_id:
        user = db.query(User).filter(User.unique_id == user_id).first()
        if user:
            query = query.filter(Attendance.user_id == user.id)

    records = query.all()
    result = []
    for record in records:
        user = db.query(User).filter(User.id == record.user_id).first()
        result.append({
            "id": record.id,
            "user": UserResponse.from_orm(user),
            "date": record.date.isoformat(),
            "time_in": record.time_in.isoformat() if record.time_in else None,
            "status": record.status,
            "created_at": record.created_at.isoformat(),
        })
    return result


@router.post("/mark-absent")
async def mark_absent_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    today = datetime.now().date()
    all_users = db.query(User).filter(User.is_active == True).all()  # noqa: E712
    attended_user_ids = db.query(Attendance.user_id).filter(Attendance.date == today).all()
    attended_user_ids = [uid[0] for uid in attended_user_ids]

    absent_count = 0
    for user in all_users:
        if user.id not in attended_user_ids:
            db.add(Attendance(user_id=user.id, date=today, status="absent"))
            absent_count += 1
    db.commit()
    return {"message": f"Marked {absent_count} users as absent for {today}"}


@router.put("/attendance/{attendance_id}")
async def update_attendance_record(
    attendance_id: int,
    status: str = Form(...),
    time_in: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    attendance.status = status
    if status == "present" and time_in:
        try:
            attendance.time_in = datetime.strptime(time_in, "%H:%M").time()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")
    elif status == "absent":
        attendance.time_in = None

    db.commit()
    db.refresh(attendance)
    user = db.query(User).filter(User.id == attendance.user_id).first()
    return {
        "message": f"Updated attendance for {user.full_name}",
        "attendance": {
            "id": attendance.id,
            "user": UserResponse.from_orm(user),
            "date": attendance.date.isoformat(),
            "time_in": attendance.time_in.isoformat() if attendance.time_in else None,
            "status": attendance.status,
            "created_at": attendance.created_at.isoformat(),
        },
    }


@router.post("/attendance/bulk-update")
async def bulk_update_attendance(
    record_ids: list[int] = Form(...),
    status: str = Form(...),
    time_in: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    updated_count = 0
    for record_id in record_ids:
        attendance = db.query(Attendance).filter(Attendance.id == record_id).first()
        if attendance:
            attendance.status = status
            if status == "present" and time_in:
                try:
                    attendance.time_in = datetime.strptime(time_in, "%H:%M").time()
                except ValueError:
                    continue
            elif status == "absent":
                attendance.time_in = None
            updated_count += 1
    db.commit()
    return {"message": f"Updated {updated_count} attendance records"}


@router.post("/attendance/mark-present/{user_id}")
async def mark_user_present(
    user_id: str,
    time_in: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    user = db.query(User).filter(User.unique_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    today = datetime.now().date()
    attendance = (
        db.query(Attendance)
        .filter(Attendance.user_id == user.id, Attendance.date == today)
        .first()
    )

    if time_in:
        try:
            time_obj = datetime.strptime(time_in, "%H:%M").time()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")
    else:
        time_obj = datetime.now().time()

    if attendance:
        attendance.status = "present"
        attendance.time_in = time_obj
    else:
        attendance = Attendance(user_id=user.id, date=today, time_in=time_obj, status="present")
        db.add(attendance)

    db.commit()
    db.refresh(attendance)
    return {
        "message": f"Marked {user.full_name} as present",
        "attendance": AttendanceResponse.from_orm(attendance),
    }


@router.delete("/user/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    user = db.query(User).filter(User.unique_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_dir = _user_dir(user.unique_id)
    if os.path.exists(user_dir):
        shutil.rmtree(user_dir)

    db.query(Attendance).filter(Attendance.user_id == user.id).delete()
    db.delete(user)
    db.commit()
    return {"message": f"User {user.full_name} deleted successfully"}


@router.get("/users/face-status")
async def get_users_face_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    users = db.query(User).all()
    users_status = []
    for user in users:
        user_dir = _user_dir(user.unique_id)
        encoding_file = os.path.join(user_dir, "encoding.pkl")
        face_registered = os.path.exists(encoding_file)

        registration_details = None
        if face_registered:
            try:
                with open(encoding_file, "rb") as f:
                    data = pickle.load(f)
                registration_details = {
                    "registered_date": datetime.fromtimestamp(os.path.getctime(encoding_file)).isoformat(),
                    "valid_images": data.get("count", data.get("valid_images", 0)),
                    "model": data.get("model", "unknown"),
                    "quality_checked": data.get("quality_checked", True),
                    "liveness_checked": data.get("liveness_checked", False),
                }
            except Exception as e:
                logger.error(f"Error reading face data for {user.unique_id}: {str(e)}")

        face_images_count = 0
        if os.path.exists(user_dir):
            face_images_count = len(
                [f for f in os.listdir(user_dir) if f.startswith("face_") and f.endswith(".jpg")]
            )

        users_status.append({
            "user": UserResponse.from_orm(user),
            "face_registered": face_registered,
            "face_images_count": face_images_count,
            "registration_details": registration_details,
        })

    return {
        "total_users": len(users),
        "users_with_faces": sum(1 for u in users_status if u["face_registered"]),
        "users_without_faces": sum(1 for u in users_status if not u["face_registered"]),
        "users": users_status,
    }


@router.delete("/user/{user_id}/face")
async def delete_user_face_data(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    user = db.query(User).filter(User.unique_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_dir = _user_dir(user.unique_id)
    if not os.path.exists(user_dir):
        raise HTTPException(status_code=404, detail="No face data found for this user")

    shutil.rmtree(user_dir)
    user.face_registered = False
    user.face_encoding_path = None
    db.commit()
    return {
        "message": f"Face data deleted successfully for {user.full_name}",
        "user_id": user_id,
        "user_name": user.full_name,
    }


@router.post("/user/{user_id}/face/register")
async def admin_register_user_face(
    user_id: str,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    target_user = db.query(User).filter(User.unique_id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    if len(files) < 5:
        raise HTTPException(status_code=400, detail="At least 5 face images required")
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 face images allowed")

    user_dir = _user_dir(target_user.unique_id)
    try:
        if os.path.exists(user_dir):
            shutil.rmtree(user_dir)
        os.makedirs(user_dir, exist_ok=True)

        image_paths = []
        for i, file in enumerate(files):
            file_path = os.path.join(user_dir, f"face_{i + 1}.jpg")
            with open(file_path, "wb") as buffer:
                buffer.write(await file.read())
            image_paths.append(file_path)

        result = face_service.train_user_face(target_user.unique_id, image_paths, check_liveness=False)
        if not result.get("success", False):
            raise HTTPException(status_code=400, detail=result.get("message", "Face registration failed"))

        target_user.face_registered = True
        target_user.face_encoding_path = os.path.join(user_dir, "encoding.json")
        db.commit()

        stats = result["statistics"]
        return {
            "message": f"Face registration successful for {target_user.full_name}",
            "user_id": target_user.unique_id,
            "user_name": target_user.full_name,
            "registered_by_admin": current_user.full_name,
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
        if os.path.exists(user_dir):
            shutil.rmtree(user_dir)
        raise HTTPException(status_code=500, detail=f"Face registration failed: {str(e)}")


@router.get("/user/{user_id}/face/images")
async def get_user_face_images_admin(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    target_user = db.query(User).filter(User.unique_id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    user_dir = _user_dir(target_user.unique_id)
    if not os.path.exists(user_dir):
        raise HTTPException(status_code=404, detail="No face data found for this user")

    face_images = []
    for filename in os.listdir(user_dir):
        if filename.startswith("face_") and filename.endswith(".jpg"):
            file_path = os.path.join(user_dir, filename)
            try:
                with open(file_path, "rb") as img_file:
                    img_data = base64.b64encode(img_file.read()).decode("utf-8")
                face_images.append({
                    "filename": filename,
                    "data": f"data:image/jpeg;base64,{img_data}",
                    "registered_date": datetime.fromtimestamp(os.path.getctime(file_path)).isoformat(),
                })
            except Exception as e:
                logger.error(f"Error reading image {filename}: {str(e)}")
                continue

    encoding_file = os.path.join(user_dir, "encoding.pkl")
    registration_details = None
    if os.path.exists(encoding_file):
        try:
            with open(encoding_file, "rb") as f:
                data = pickle.load(f)
            registration_details = {
                "registered_date": datetime.fromtimestamp(os.path.getctime(encoding_file)).isoformat(),
                "valid_images": data.get("count", data.get("valid_images", 0)),
                "model": data.get("model", "unknown"),
                "quality_checked": data.get("quality_checked", True),
                "liveness_checked": data.get("liveness_checked", False),
            }
        except Exception as e:
            logger.error(f"Error reading registration details: {str(e)}")

    return {
        "user_id": target_user.unique_id,
        "user_name": target_user.full_name,
        "face_registered": target_user.face_registered,
        "total_images": len(face_images),
        "images": face_images,
        "registration_details": registration_details,
    }


@router.get("/user/{user_id}/face/details")
async def get_user_face_details(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    user = db.query(User).filter(User.unique_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_dir = _user_dir(user.unique_id)
    encoding_file = os.path.join(user_dir, "encoding.pkl")
    if not os.path.exists(encoding_file):
        return {
            "user": UserResponse.from_orm(user),
            "face_registered": False,
            "message": "No face data registered for this user",
        }

    try:
        with open(encoding_file, "rb") as f:
            face_data = pickle.load(f)

        registration_date = datetime.fromtimestamp(os.path.getctime(encoding_file))
        file_size = os.path.getsize(encoding_file)

        face_images = []
        if os.path.exists(user_dir):
            for filename in sorted(os.listdir(user_dir)):
                if filename.startswith("face_") and filename.endswith(".jpg"):
                    file_path = os.path.join(user_dir, filename)
                    face_images.append({
                        "filename": filename,
                        "size": os.path.getsize(file_path),
                        "created": datetime.fromtimestamp(os.path.getctime(file_path)).isoformat(),
                    })

        return {
            "user": UserResponse.from_orm(user),
            "face_registered": True,
            "registration_info": {
                "registered_date": registration_date.isoformat(),
                "file_size_bytes": file_size,
                "model": face_data.get("model", "unknown"),
                "valid_images": face_data.get("count", face_data.get("valid_images", 0)),
                "quality_checked": face_data.get("quality_checked", True),
                "liveness_checked": face_data.get("liveness_checked", False),
            },
            "face_images": face_images,
            "total_images": len(face_images),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read face data: {str(e)}")


@router.post("/faces/bulk-delete")
async def bulk_delete_face_data(
    user_ids: list[str] = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    deleted_count = 0
    errors = []
    for user_id in user_ids:
        try:
            user = db.query(User).filter(User.unique_id == user_id).first()
            if not user:
                errors.append(f"User {user_id} not found")
                continue
            user_dir = _user_dir(user.unique_id)
            if os.path.exists(user_dir):
                shutil.rmtree(user_dir)
                user.face_registered = False
                user.face_encoding_path = None
                deleted_count += 1
            else:
                errors.append(f"No face data for user {user_id}")
        except Exception as e:
            errors.append(f"Error deleting {user_id}: {str(e)}")
    db.commit()
    return {
        "message": f"Deleted face data for {deleted_count} users",
        "deleted_count": deleted_count,
        "total_requested": len(user_ids),
        "errors": errors if errors else None,
    }
