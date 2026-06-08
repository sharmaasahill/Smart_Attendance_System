from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel


class AttendanceResponse(BaseModel):
    id: int
    user_id: int
    date: date
    time_in: Optional[time]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
