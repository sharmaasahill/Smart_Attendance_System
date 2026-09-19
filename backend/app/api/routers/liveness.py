"""
Active liveness challenge issuance.

The client asks for a challenge, performs the movement it names, then submits
the captured frames to /attendance/mark or /face/register along with the
challenge id. Verification happens server-side in
``app.services.liveness.verify_challenge_frames``.

Unauthenticated by design: the kiosk attendance flow (/mark-attendance) is
itself unauthenticated, so requiring a token here would break it. A challenge
grants no access on its own — it only names a movement to perform, is
single-use, and expires. It is rate limited so it cannot be farmed cheaply.
"""

import logging

from fastapi import APIRouter, Request

from app.core.config import settings
from app.core.limiter import limiter
from app.services.liveness import challenge_store

logger = logging.getLogger("smart_attendance.liveness")

router = APIRouter(prefix="/liveness", tags=["liveness"])


@router.post("/challenge")
@limiter.limit(settings.RATE_LIMIT_ATTENDANCE)
async def create_liveness_challenge(request: Request):
    """Issue a single-use, expiring head-turn challenge."""
    challenge = challenge_store.issue()
    return {
        "challenge_id": challenge.challenge_id,
        "direction": challenge.direction,
        "instruction": challenge.instruction,
        "expires_in_seconds": settings.LIVENESS_CHALLENGE_TTL_SECONDS,
        "min_frames": settings.LIVENESS_MIN_FRAMES,
        "max_frames": settings.LIVENESS_MAX_FRAMES,
    }
