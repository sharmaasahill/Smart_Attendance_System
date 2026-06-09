from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AttendanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    date: date
    time_in: Optional[time]
    status: str
    created_at: datetime
