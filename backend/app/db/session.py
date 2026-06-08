"""Database engine and session management (SQLite locally, PostgreSQL in prod)."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base import Base

# SQLite needs check_same_thread=False for FastAPI's threaded request handling.
connect_args = {"check_same_thread": False} if settings.is_sqlite else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables from the ORM metadata (used for local/dev; prod uses Alembic)."""
    import app.models  # noqa: F401  ensure models are registered on Base.metadata

    Base.metadata.create_all(bind=engine)
