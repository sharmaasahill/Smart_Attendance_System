"""Current-user (self-service) endpoints."""

import base64
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import extract
from sqlalchemy.orm import Session

from app.api import deps
from app.core.security import get_password_hash, validate_password_strength, verify_password
from app.db.session import get_db
from app.models import Attendance, FaceImage, User
from app.schemas import UserChangePassword, UserResponse, UserUpdateProfile

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/profile")
async def get_user_profile(current_user: User = Depends(deps.get_current_user)):
    return UserResponse.model_validate(current_user)


@router.put("/profile")
async def update_user_profile(
    profile_data: UserUpdateProfile,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name
    if profile_data.phone_number is not None:
        current_user.phone_number = profile_data.phone_number
    if profile_data.department is not None:
        current_user.department = profile_data.department

    db.commit()
    db.refresh(current_user)
    return {"message": "Profile updated successfully", "user": UserResponse.model_validate(current_user)}


@router.post("/change-password")
async def change_password(
    password_data: UserChangePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if not verify_password(password_data.current_password, current_user.password):
        raise HTTPException(status_code=400, detail="Invalid current password")
    validate_password_strength(password_data.new_password)
    current_user.password = get_password_hash(password_data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.get("/attendance")
async def get_user_attendance(
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    query = db.query(Attendance).filter(Attendance.user_id == current_user.id)
    if start_date:
        query = query.filter(Attendance.date >= datetime.strptime(start_date, "%Y-%m-%d").date())
    if end_date:
        query = query.filter(Attendance.date <= datetime.strptime(end_date, "%Y-%m-%d").date())

    records = query.order_by(Attendance.date.desc()).all()
    result = [
        {
            "id": record.id,
            "date": record.date.isoformat(),
            "time_in": record.time_in.isoformat() if record.time_in else None,
            "status": record.status,
            "created_at": record.created_at.isoformat(),
        }
        for record in records
    ]
    return {
        "user": UserResponse.model_validate(current_user),
        "attendance_records": result,
        "total_records": len(result),
    }


@router.get("/attendance/stats")
async def get_user_attendance_stats(
    month: int = None,
    year: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    query = db.query(Attendance).filter(Attendance.user_id == current_user.id)
    if year:
        query = query.filter(extract("year", Attendance.date) == year)
    if month:
        query = query.filter(extract("month", Attendance.date) == month)

    total_days = query.count()
    present_days = query.filter(Attendance.status == "present").count()
    absent_days = query.filter(Attendance.status == "absent").count()
    attendance_percentage = (present_days / total_days * 100) if total_days > 0 else 0

    return {
        "user": UserResponse.model_validate(current_user),
        "stats": {
            "total_days": total_days,
            "present_days": present_days,
            "absent_days": absent_days,
            "attendance_percentage": round(attendance_percentage, 2),
        },
        "period": {"month": month, "year": year},
    }


@router.get("/face/images")
async def get_user_registered_faces(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Get the current user's registered face images (stored in the database)."""
    images = (
        db.query(FaceImage)
        .filter(FaceImage.user_id == current_user.id)
        .order_by(FaceImage.position)
        .all()
    )
    if not images:
        raise HTTPException(status_code=404, detail="No face data registered for this user")

    face_images = [
        {
            "filename": f"face_{img.position}.jpg",
            "image_data": f"data:{img.content_type};base64,{base64.b64encode(img.image_data).decode('utf-8')}",
            "created_at": img.created_at.isoformat() if img.created_at else None,
            "quality_score": img.quality_score,
            "quality_details": None,
        }
        for img in images
    ]

    return {
        "user_id": current_user.unique_id,
        "user_name": current_user.full_name,
        "face_registered": current_user.face_registered,
        "total_faces": len(face_images),
        "faces": face_images,
        "registration_date": current_user.created_at.isoformat() if current_user.created_at else None,
    }
