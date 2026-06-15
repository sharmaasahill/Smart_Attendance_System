from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


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

    attendances = relationship("Attendance", back_populates="user")
    face_embedding = relationship(
        "FaceEmbedding", back_populates="user", uselist=False,
        cascade="all, delete-orphan",
    )
    face_images = relationship(
        "FaceImage", back_populates="user", cascade="all, delete-orphan",
    )
