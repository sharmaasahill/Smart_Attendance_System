from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Time, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    unique_id = Column(String, unique=True, index=True, nullable=False)
    phone_number = Column(String, nullable=True)
    department = Column(String, nullable=True)
    role = Column(String, default="user", nullable=False)  # "admin" or "user"
    is_active = Column(Boolean, default=True)
    face_registered = Column(Boolean, default=False)
    face_encoding_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    attendances = relationship("Attendance", back_populates="user")

class Attendance(Base):
    __tablename__ = "attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    time_in = Column(Time, nullable=True)
    status = Column(String, nullable=False)  # "present" or "absent"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="attendances") 