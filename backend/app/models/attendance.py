from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Time
from sqlalchemy.orm import relationship

from app.db.base import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    time_in = Column(Time, nullable=True)
    status = Column(String, nullable=False)  # "present" or "absent"
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="attendances")
