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

    # ----- Security -----
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ADMIN_EMAIL: str = ""

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
    FACE_MATCH_THRESHOLD: float = 0.42
    FACE_DUPLICATE_THRESHOLD: float = 0.50
    FACE_KNN_K: int = 5
    FACE_MIN_DET_SCORE: float = 0.55
    FACE_MIN_FACE_SIZE: int = 50
    FACE_MIN_BLUR_VAR: float = 40.0
    FACE_MIN_QUALITY_SCORE: int = 45
    FACE_MIN_ENCODINGS: int = 3

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
