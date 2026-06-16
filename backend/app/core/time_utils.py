"""
Timezone-aware "now"/"today" helpers.

Attendance dates and times must be recorded in the organization's local
timezone (``settings.APP_TIMEZONE``) so they match what users see in their
browser. The hosting server may run in UTC (e.g. Hugging Face Spaces), so we
never rely on the bare server clock for user-facing dates.

The DB columns for attendance are naive ``Date``/``Time``, so these helpers
return naive values already shifted to the configured timezone.
"""

from datetime import date, datetime, time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.config import settings


def _tz() -> ZoneInfo:
    try:
        return ZoneInfo(settings.APP_TIMEZONE)
    except (ZoneInfoNotFoundError, ValueError):
        # Fall back to UTC if the timezone name is invalid or the tz database
        # is unavailable, so the app still runs.
        return ZoneInfo("UTC")


def now_local() -> datetime:
    """Current wall-clock time in the configured timezone, as a naive datetime."""
    return datetime.now(_tz()).replace(tzinfo=None)


def today_local() -> date:
    """Current date in the configured timezone."""
    return now_local().date()


def time_local() -> time:
    """Current time-of-day in the configured timezone."""
    return now_local().time()
