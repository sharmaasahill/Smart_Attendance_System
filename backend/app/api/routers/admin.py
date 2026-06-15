"""Admin endpoints: user management, attendance management, face management."""

import logging
import os
import base64
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.db.session import get_db
from app.models import Attendance, User
from app.schemas import AttendanceResponse, UserResponse
from app.services.face_recognition import face_service

logger = logging.getLogger("smart_attendance.admin")

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users")
async def get_all_users(
    response: Response,
    limit: int = Query(None, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """List users. Supports optional pagination via limit/offset; the total
    count is returned in the X-Total-Count header."""
    query = db.query(User)
    total = query.count()
    query = query.order_by(User.id)
    if limit is not None:
        query = query.offset(offset).limit(limit)
    elif offset:
        query = query.offset(offset)
    users = query.all()
    response.headers["X-Total-Count"] = str(total)
    return [UserResponse.model_validate(user) for user in users]


@router.get("/attendance")
async def get_attendance_records(
    response: Response,
    date: str = None,
    user_id: str = None,
    limit: int = Query(None, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """List attendance records with optional date/user filters and pagination.
    Total count is returned in the X-Total-Count header."""
    query = db.query(Attendance).join(User)
    if date:
        query = query.filter(Attendance.date == datetime.strptime(date, "%Y-%m-%d").date())
    if user_id:
        user = db.query(User).filter(User.unique_id == user_id).first()
        if user:
            query = query.filter(Attendance.user_id == user.id)

    total = query.count()
    query = query.order_by(Attendance.id.desc())
    if limit is not None:
        query = query.offset(offset).limit(limit)
    elif offset:
        query = query.offset(offset)

    records = query.all()
    users_by_id = {u.id: u for u in db.query(User).all()}
    result = []
    for record in records:
        user = users_by_id.get(record.user_id)
        result.append({
            "id": record.id,
            "user": UserResponse.model_validate(user),
            "date": record.date.isoformat(),
            "time_in": record.time_in.isoformat() if record.time_in else None,
            "status": record.status,
            "created_at": record.created_at.isoformat(),
        })
    response.headers["X-Total-Count"] = str(total)
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
            "user": UserResponse.model_validate(user),
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
        "attendance": AttendanceResponse.model_validate(attendance),
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

    db.query(Attendance).filter(Attendance.user_id == user.id).delete()
    db.delete(user)  # cascades to face_embeddings / face_images
    db.commit()
    return {"message": f"User {user.full_name} deleted successfully"}


@router.get("/users/face-status")
async def get_users_face_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    from app.models import FaceEmbedding, FaceImage

    users = db.query(User).all()
    # Pre-fetch enrollment data for all users.
    embeddings = {fe.user_id: fe for fe in db.query(FaceEmbedding).all()}
    image_counts = dict(
        db.query(FaceImage.user_id, func.count(FaceImage.id)).group_by(FaceImage.user_id).all()
    )

    users_status = []
    for user in users:
        fe = embeddings.get(user.id)
        face_registered = fe is not None
        registration_details = None
        if fe is not None:
            registration_details = {
                "registered_date": fe.created_at.isoformat() if fe.created_at else None,
                "valid_images": fe.count,
                "model": fe.model,
                "quality_checked": True,
                "liveness_checked": False,
            }
        users_status.append({
            "user": UserResponse.model_validate(user),
            "face_registered": face_registered,
            "face_images_count": int(image_counts.get(user.id, 0)),
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
    from app.models import FaceEmbedding, FaceImage

    user = db.query(User).filter(User.unique_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    has_data = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == user.id).first()
    if not has_data:
        raise HTTPException(status_code=404, detail="No face data found for this user")

    db.query(FaceImage).filter(FaceImage.user_id == user.id).delete()
    db.query(FaceEmbedding).filter(FaceEmbedding.user_id == user.id).delete()
    user.face_registered = False
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

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    temp_paths = []
    try:
        for i, file in enumerate(files):
            ts = datetime.now().strftime("%Y%m%d%H%M%S%f")
            path = os.path.join(settings.UPLOAD_DIR, f"admin_enroll_{target_user.unique_id}_{i}_{ts}.jpg")
            with open(path, "wb") as buffer:
                buffer.write(await file.read())
            temp_paths.append(path)

        result = face_service.enroll_user(db, target_user, temp_paths)
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
        raise HTTPException(status_code=500, detail=f"Face registration failed: {str(e)}")
    finally:
        for path in temp_paths:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass


@router.get("/user/{user_id}/face/images")
async def get_user_face_images_admin(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    from app.models import FaceEmbedding, FaceImage

    target_user = db.query(User).filter(User.unique_id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    images = (
        db.query(FaceImage)
        .filter(FaceImage.user_id == target_user.id)
        .order_by(FaceImage.position)
        .all()
    )
    if not images:
        raise HTTPException(status_code=404, detail="No face data found for this user")

    face_images = [
        {
            "filename": f"face_{img.position}.jpg",
            "data": f"data:{img.content_type};base64,{base64.b64encode(img.image_data).decode('utf-8')}",
            "registered_date": img.created_at.isoformat() if img.created_at else None,
        }
        for img in images
    ]

    fe = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == target_user.id).first()
    registration_details = None
    if fe is not None:
        registration_details = {
            "registered_date": fe.created_at.isoformat() if fe.created_at else None,
            "valid_images": fe.count,
            "model": fe.model,
            "quality_checked": True,
            "liveness_checked": False,
        }

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
    from app.models import FaceEmbedding, FaceImage

    user = db.query(User).filter(User.unique_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    fe = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == user.id).first()
    if fe is None:
        return {
            "user": UserResponse.model_validate(user),
            "face_registered": False,
            "message": "No face data registered for this user",
        }

    images = (
        db.query(FaceImage)
        .filter(FaceImage.user_id == user.id)
        .order_by(FaceImage.position)
        .all()
    )
    face_images = [
        {
            "filename": f"face_{img.position}.jpg",
            "size": len(img.image_data),
            "created": img.created_at.isoformat() if img.created_at else None,
        }
        for img in images
    ]

    return {
        "user": UserResponse.model_validate(user),
        "face_registered": True,
        "registration_info": {
            "registered_date": fe.created_at.isoformat() if fe.created_at else None,
            "model": fe.model,
            "valid_images": fe.count,
            "quality_checked": True,
            "liveness_checked": False,
        },
        "face_images": face_images,
        "total_images": len(face_images),
    }


@router.post("/faces/bulk-delete")
async def bulk_delete_face_data(
    user_ids: list[str] = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    from app.models import FaceEmbedding, FaceImage

    deleted_count = 0
    errors = []
    for user_id in user_ids:
        try:
            user = db.query(User).filter(User.unique_id == user_id).first()
            if not user:
                errors.append(f"User {user_id} not found")
                continue
            fe = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == user.id).first()
            if fe is None:
                errors.append(f"No face data for user {user_id}")
                continue
            db.query(FaceImage).filter(FaceImage.user_id == user.id).delete()
            db.query(FaceEmbedding).filter(FaceEmbedding.user_id == user.id).delete()
            user.face_registered = False
            deleted_count += 1
        except Exception as e:
            errors.append(f"Error deleting {user_id}: {str(e)}")
    db.commit()
    return {
        "message": f"Deleted face data for {deleted_count} users",
        "deleted_count": deleted_count,
        "total_requested": len(user_ids),
        "errors": errors if errors else None,
    }
