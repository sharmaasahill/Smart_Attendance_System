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
    """Create tables from the ORM metadata (used for tests and quick local dev)."""
    import app.models  # noqa: F401  ensure models are registered on Base.metadata

    Base.metadata.create_all(bind=engine)


def run_migrations() -> None:
    """
    Apply Alembic migrations to head (production-grade schema management).

    If the database already has the app's tables but was never stamped by
    Alembic (legacy schema created via create_all), it is stamped at head
    instead of re-creating tables.
    """
    from alembic import command
    from alembic.config import Config
    from sqlalchemy import inspect

    from app.core.config import BASE_DIR

    cfg = Config(str(BASE_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BASE_DIR / "alembic"))

    tables = inspect(engine).get_table_names()
    if "users" in tables and "alembic_version" not in tables:
        command.stamp(cfg, "head")
    else:
        command.upgrade(cfg, "head")
