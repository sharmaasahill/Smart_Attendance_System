"""
Shared test fixtures.

Each test session gets a fresh in-memory SQLite database and an
httpx AsyncClient wired to the FastAPI app.  No data from the real
attendance_system.db is touched.
"""

import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Point at a temporary database before any app code runs.
TEST_DB_URL = "sqlite:///./test_attendance.db"
os.environ.setdefault("DATABASE_URL", TEST_DB_URL)
os.environ.setdefault("SECRET_KEY", "test-secret-key-which-is-long-enough-32+chars-xyz")
os.environ.setdefault("ADMIN_EMAIL", "admin@test.com")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")

from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402

# ── DB engine shared across the session ──────────────────────────────────────

engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables and ensure storage directories exist for the test session."""
    # The app lifespan creates these dirs at startup, but tests don't trigger lifespan.
    from app.core.config import settings
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.DATASET_DIR, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    # Close all connections before attempting to delete the file
    engine.dispose()
    # Give Windows a moment to release the file handle
    import time
    time.sleep(0.1)
    if os.path.exists("test_attendance.db"):
        try:
            os.remove("test_attendance.db")
        except PermissionError:
            pass  # File still locked, skip cleanup


@pytest.fixture(autouse=True)
def clean_tables():
    """Truncate every table before each test to keep tests independent."""
    yield
    with engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.commit()


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


# ── Helper: register + log in a user ─────────────────────────────────────────

async def register_user(client: AsyncClient, email: str, password: str, full_name: str = "Test User") -> dict:
    resp = await client.post("/auth/register", json={
        "email": email,
        "password": password,
        "full_name": full_name,
    })
    assert resp.status_code == 200, resp.text
    return resp.json()


async def login_user(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def admin_token(client):
    """Register the ADMIN_EMAIL user and return its token."""
    data = await register_user(client, "admin@test.com", "AdminPass1!", "Admin User")
    return data["access_token"]


@pytest_asyncio.fixture
async def user_token(client):
    """Register a regular user and return its token."""
    data = await register_user(client, "user@test.com", "UserPass1!", "Regular User")
    return data["access_token"]
