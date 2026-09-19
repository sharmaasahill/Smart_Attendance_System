"""
Attendance marking rules:
  - Requires at least ATTENDANCE_MIN_FRAMES frames (422)
  - Rejects frames that are not distinct live captures (403)
  - Rejects frames without liveness_verified=true (403)
  - Rejects unrecognized face (404)
  - Marks a recognized user as present (200)
  - Blocks duplicate marking of the same user on the same day (400)
  - Enforces one-row-per-user-per-day at the database level
  - Allows the system to override an admin-set 'absent' to 'present' via face scan
"""

import io
from datetime import date as date_cls, time

import cv2
import numpy as np
import pytest
from sqlalchemy.exc import IntegrityError

from tests.conftest import register_user


def _jpeg_bytes(seed: int) -> bytes:
    """Encode a small deterministic noise image as a real JPEG."""
    rng = np.random.default_rng(seed)
    img = rng.integers(0, 256, size=(64, 64, 3), dtype=np.uint8)
    ok, buf = cv2.imencode(".jpg", img)
    assert ok, "failed to encode test JPEG"
    return buf.tobytes()


def _frames(count: int = 2, seed_start: int = 0):
    """Multipart 'files' entries holding `count` mutually distinct JPEGs."""
    return [
        ("files", (f"frame_{i}.jpg", io.BytesIO(_jpeg_bytes(seed_start + i)), "image/jpeg"))
        for i in range(count)
    ]


def _identical_frames(count: int = 2):
    """Multipart entries holding the same JPEG bytes repeated (replay attempt)."""
    payload = _jpeg_bytes(99)
    return [
        ("files", (f"frame_{i}.jpg", io.BytesIO(payload), "image/jpeg"))
        for i in range(count)
    ]


def _recognized(uid: str, confidence: float = 88.0):
    """Patch target/value pair for a successful recognition of `uid`."""
    return {"user_id": uid, "confidence": confidence, "similarity": confidence / 100}


@pytest.mark.asyncio
async def test_attendance_requires_multiple_frames(client):
    """A single frame cannot satisfy multi-frame voting → 422."""
    data = {"liveness_verified": "true"}
    files = [("files", ("only.jpg", io.BytesIO(_jpeg_bytes(1)), "image/jpeg"))]
    resp = await client.post("/attendance/mark", data=data, files=files)
    assert resp.status_code == 422
    assert "at least" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_attendance_rejects_replayed_identical_frames(client):
    """The same still image submitted repeatedly is not a live capture → 403."""
    data = {"liveness_verified": "true"}
    resp = await client.post("/attendance/mark", data=data, files=_identical_frames(3))
    assert resp.status_code == 403
    assert "liveness" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_attendance_rejects_without_liveness(client):
    """Distinct frames but liveness_verified=false → 403."""
    data = {"liveness_verified": "false"}
    resp = await client.post("/attendance/mark", data=data, files=_frames())
    assert resp.status_code == 403
    assert "liveness" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_attendance_rejects_unrecognized_face(client):
    """With liveness verified but face not in any enrolled encoding → 404."""
    with patch_recognize(None):
        data = {"liveness_verified": "true"}
        resp = await client.post("/attendance/mark", data=data, files=_frames())
    assert resp.status_code == 404
    assert "not recognized" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_attendance_marks_present(client):
    """Recognized user gets marked present for today."""
    reg = await register_user(client, "face@test.com", "Pass123!", "Face User")
    uid = reg["user"]["unique_id"]

    with patch_recognize(_recognized(uid)):
        data = {"liveness_verified": "true"}
        resp = await client.post("/attendance/mark", data=data, files=_frames())

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["attendance"]["status"] == "present"
    assert body["user"]["email"] == "face@test.com"
    assert body["confidence"] == 88.0


@pytest.mark.asyncio
async def test_attendance_blocks_duplicate(client):
    """Same recognized user cannot mark attendance twice on the same day."""
    reg = await register_user(client, "dup@test.com", "Pass123!", "Dup User")
    uid = reg["user"]["unique_id"]

    with patch_recognize(_recognized(uid, 85.0)):
        data = {"liveness_verified": "true"}
        resp1 = await client.post("/attendance/mark", data=data, files=_frames())
        assert resp1.status_code == 200, resp1.text

        # Fresh frames so the rejection comes from the duplicate rule, not the
        # replay guard.
        resp2 = await client.post("/attendance/mark", data=data, files=_frames(seed_start=50))
        assert resp2.status_code == 400
        assert "already marked" in resp2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_attendance_low_confidence_retry(client):
    """A match below the acceptance confidence prompts a retry (422), not a mark."""
    reg = await register_user(client, "lowconf@test.com", "Pass123!", "Low Conf")
    uid = reg["user"]["unique_id"]
    with patch_recognize(_recognized(uid, 45.0)):
        data = {"liveness_verified": "true"}
        resp = await client.post("/attendance/mark", data=data, files=_frames())
    assert resp.status_code == 422
    assert "low confidence" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_attendance_overrides_absent_to_present(client, admin_token):
    """
    If admin has marked a user absent, a subsequent face scan that day
    should upgrade the status to present.
    """
    reg = await register_user(client, "override@test.com", "Pass123!", "Override User")
    uid = reg["user"]["unique_id"]

    await client.post(
        "/admin/mark-absent",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    with patch_recognize(_recognized(uid, 90.0)):
        data = {"liveness_verified": "true"}
        resp = await client.post("/attendance/mark", data=data, files=_frames())

    assert resp.status_code == 200, resp.text
    assert resp.json()["attendance"]["status"] == "present"
    assert "absent to present" in resp.json()["message"].lower()


def test_one_attendance_row_per_user_per_day(db_session):
    """
    The uq_attendance_user_date constraint is what actually prevents duplicate
    rows when two concurrent marks both pass the application-level check.
    """
    from app.models import Attendance, User
    from app.core.security import get_password_hash

    user = User(
        email="constraint@test.com",
        password=get_password_hash("Pass123!"),
        full_name="Constraint User",
        unique_id="USRCONSTRAINT1",
    )
    db_session.add(user)
    db_session.commit()

    today = date_cls.today()
    db_session.add(Attendance(user_id=user.id, date=today, time_in=time(9, 0), status="present"))
    db_session.commit()

    # Second row for the same user and day must be rejected by the database.
    db_session.add(Attendance(user_id=user.id, date=today, time_in=time(10, 0), status="present"))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


# ── helpers ──────────────────────────────────────────────────────────────────

def patch_recognize(return_value):
    """Patch the per-frame recognizer that recognize_frames votes over."""
    from unittest.mock import patch

    return patch(
        "app.services.face_recognition.face_service.recognize",
        return_value=return_value,
    )
