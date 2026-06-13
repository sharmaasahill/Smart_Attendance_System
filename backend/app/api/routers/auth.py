"""Authentication endpoints."""

import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    get_password_hash,
    validate_password_strength,
    verify_password,
)
from app.db.session import get_db
from app.models import User
from app.schemas import LoginRequest, UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
@limiter.limit(settings.RATE_LIMIT_REGISTER)
async def register(request: Request, user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    validate_password_strength(user_data.password)
    hashed_password = get_password_hash(user_data.password)
    # Generate unique ID with timestamp + 4 random hex digits to avoid collisions
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    random_suffix = secrets.token_hex(2)  # 4 hex characters
    unique_id = f"USR{timestamp}{random_suffix}"

    admin_email = settings.ADMIN_EMAIL
    user_role = "admin" if admin_email and user_data.email == admin_email else "user"

    db_user = User(
        email=user_data.email,
        password=hashed_password,
        full_name=user_data.full_name,
        unique_id=unique_id,
        phone_number=user_data.phone_number,
        department=user_data.department,
        role=user_role,
        is_active=True,
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    access_token = create_access_token(data={"sub": db_user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(db_user),
    }


@router.post("/login")
@limiter.limit(settings.RATE_LIMIT_LOGIN)
async def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(login_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated. Please contact administrator.")

    access_token = create_access_token(data={"sub": user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user),
    }
