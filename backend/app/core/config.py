"""
Centralized application configuration.

Settings are environment-driven (12-factor). Values come from environment
variables / the backend ``.env`` file, with sensible local-dev defaults.

Database:
  * Local/dev defaults to SQLite (zero setup).
  * Production sets DATABASE_URL to a PostgreSQL DSN, e.g.
    ``postgresql+psycopg2://user:pass@host:5432/attendance``.
"""

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ directory (this file: backend/app/core/config.py)
BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ----- App -----
    PROJECT_NAME: str = "Smart Attendance System"
    API_VERSION: str = "2.0.0"
    DEBUG: bool = False
    # IANA timezone used for attendance dates/times (the organization's local
    # time). Keep this aligned with where attendance is recorded so dates match
    # what users see in the browser. Override via the APP_TIMEZONE env var.
    APP_TIMEZONE: str = "Asia/Kolkata"

    # ----- Security -----
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ADMIN_EMAIL: str = ""
    MIN_PASSWORD_LENGTH: int = 8

    # ----- Rate limiting -----
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_REGISTER: str = "10/hour"
    RATE_LIMIT_ATTENDANCE: str = "20/minute"

    # ----- CORS (comma-separated origins) -----
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000"

    # ----- Database -----
    # Default: SQLite file in the backend directory (local dev).
    DATABASE_URL: str = f"sqlite:///{(BASE_DIR / 'attendance_system.db').as_posix()}"

    # ----- Storage (absolute paths so behaviour is independent of CWD) -----
    DATASET_DIR: str = str(BASE_DIR / "dataset")
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")

    # ----- Face recognition -----
    FACE_MODEL_PACK: str = "buffalo_l"
    FACE_USE_GPU: bool = False
    FACE_MATCH_THRESHOLD: float = 0.42
    FACE_DUPLICATE_THRESHOLD: float = 0.50
    FACE_KNN_K: int = 5
    FACE_MIN_DET_SCORE: float = 0.55
    FACE_MIN_FACE_SIZE: int = 50
    FACE_MIN_BLUR_VAR: float = 40.0
    FACE_MIN_QUALITY_SCORE: int = 45
    FACE_MIN_ENCODINGS: int = 3
    # Minimum confidence (%) required to accept an attendance mark.
    # Matches below this (but above the match threshold) prompt a retry.
    FACE_ATTENDANCE_MIN_CONFIDENCE: float = 50.0

    # ----- Active liveness challenge (server-verified) -----
    # The server issues a randomized head-turn challenge and verifies from the
    # submitted frames that the turn actually happened. This is deterministic
    # rather than statistical: a photo or phone screen cannot change its yaw, so
    # it fails by geometry regardless of lighting, skin tone, or camera quality.
    LIVENESS_CHALLENGE_ENABLED: bool = True
    # How long an issued challenge stays valid. Long enough to read the prompt
    # and turn, short enough to limit how long a nonce is useful to an attacker.
    LIVENESS_CHALLENGE_TTL_SECONDS: int = 90
    # Degrees of yaw the head must sweep across the submitted frames. A live
    # turn easily exceeds this; a static image sweeps ~0.
    LIVENESS_MIN_YAW_SWEEP: float = 12.0
    # Also require the sweep to be predominantly in the direction the server
    # asked for. This is the part a pre-recorded video cannot reliably satisfy,
    # since the direction is chosen per attempt.
    #
    # OFF by default and intentionally so. The webcam preview is mirrored and
    # react-webcam mirrors its screenshots too, so the browser's notion of
    # "left" may be the opposite sign to InsightFace's yaw. Enforcing an
    # unverified sign would reject every genuine user. The signed figure is
    # logged as `yaw_directional` on every attempt; once real logs confirm the
    # sign, set this to true. Blocking static photos does not depend on it —
    # that comes from the sweep magnitude below, which is sign-independent.
    LIVENESS_REQUIRE_DIRECTION: bool = False
    # Frames needed to evidence a turn. Too few and there is no motion to check.
    LIVENESS_MIN_FRAMES: int = 5
    LIVENESS_MAX_FRAMES: int = 30
    # Minimum fraction of submitted frames in which a face must be found, so a
    # burst of mostly-empty frames cannot dilute the check.
    LIVENESS_MIN_FACE_FRAME_RATIO: float = 0.6
    # Planarity (homography residual) check: a flat photo being tilted moves as
    # a plane, a real head does not. Measured and logged on every attempt but
    # NOT enforced until calibrated against real-world numbers, because an
    # uncalibrated threshold here would reject genuine users.
    LIVENESS_ENFORCE_PLANARITY: bool = False
    LIVENESS_MIN_PLANAR_RESIDUAL: float = 0.60

    # ----- Attendance anti-replay -----
    # Attendance must be submitted as multiple distinct live frames. Requiring
    # more than one frame makes multi-frame voting meaningful (with a single
    # frame the "majority" is trivially 1) and lets the server verify the
    # frames actually differ from one another.
    ATTENDANCE_MIN_FRAMES: int = 2
    # Mean absolute per-pixel difference (0-255 scale) required between
    # submitted frames. Consecutive frames from a live camera always differ by
    # at least sensor noise; a replayed still image duplicated N times does
    # not. Deliberately low so genuine near-static faces are never rejected.
    ATTENDANCE_MIN_FRAME_DIFF: float = 0.75

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")


@lru_cache
def get_settings() -> "Settings":
    return Settings()


settings = get_settings()


# ── Security validation ──────────────────────────────────────────────────────

KNOWN_WEAK_SECRETS = {
    "",
    "change-me-in-production",
    "your-secret-key-here-make-it-secure-in-production",
}


def is_weak_secret(key: str) -> bool:
    """A secret is weak if it's a known placeholder or shorter than 32 chars."""
    return key in KNOWN_WEAK_SECRETS or len(key) < 32


def validate_security(s: "Settings") -> None:
    """Fail fast on insecure configuration in production (non-DEBUG)."""
    if not s.DEBUG and is_weak_secret(s.SECRET_KEY):
        raise RuntimeError(
            "SECRET_KEY is weak or unset. Set a strong (>=32 char) SECRET_KEY "
            "environment variable in production, e.g. "
            "`python -c \"import secrets; print(secrets.token_urlsafe(48))\"`. "
            "For local development set DEBUG=true to bypass this check."
        )
