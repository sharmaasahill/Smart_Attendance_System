from pydantic import BaseModel, EmailStr
from datetime import datetime, date, time
from typing import Optional

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

class AttendanceResponse(BaseModel):
    id: int
    user_id: int
    date: date
    time_in: Optional[time]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True 