"""Password hashing and JWT token utilities."""

import re
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import HTTPException
from jose import JWTError, jwt

from app.core.config import settings


def validate_password_strength(password: str) -> None:
    """
    Enforce a baseline password policy. Raises HTTP 400 if the password is
    too weak. Policy: at least MIN_PASSWORD_LENGTH chars, with a letter and a digit.
    """
    min_len = settings.MIN_PASSWORD_LENGTH
    if len(password) < min_len:
        raise HTTPException(
            status_code=400,
            detail=f"Password must be at least {min_len} characters long.",
        )
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one letter and one number.",
        )


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
