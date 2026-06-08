from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone_number: Optional[str] = None
    department: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    unique_id: str
    phone_number: Optional[str]
    department: Optional[str]
    role: str
    is_active: bool
    face_registered: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserUpdateProfile(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    department: Optional[str] = None


class UserChangePassword(BaseModel):
    current_password: str
    new_password: str
