from datetime import datetime

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class Attendance(Base):
    __tablename__ = "attendance"

    __table_args__ = (
        # One attendance row per user per day. Enforced by the database so two
        # concurrent marks cannot both pass the application-level "already
        # marked today" check and insert duplicate rows.
        UniqueConstraint("user_id", "date", name="uq_attendance_user_date"),
        # Date-only lookups (analytics periods, admin date filter) are the
        # hottest query path and are not covered by the unique constraint's
        # index, which is ordered (user_id, date).
        Index("ix_attendance_date", "date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    time_in = Column(Time, nullable=True)
    status = Column(String, nullable=False)  # "present" or "absent"
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="attendances")
