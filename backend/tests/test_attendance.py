"""
Attendance marking rules:
  - Rejects frame without liveness_verified=true (403)
  - Rejects unrecognized face (404)
  - Marks a recognized user as present (200)
  - Blocks duplicate marking of the same user on the same day (400)
  - Allows the system to override an admin-set 'absent' to 'present' via face scan
"""

import io
import os
from datetime import date, time
from unittest.mock import patch, MagicMock

import pytest

from tests.conftest import register_user

# A minimal valid JPEG in bytes (1x1 white pixel).
_TINY_JPEG = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
    b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
    b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
    b"\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'"
    b"9=82<.342\x1edL@HUNFT::/87+*\x1c((,7,3"
    b"7465372\x00\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00"
    b"\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00"
    b"\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b"
    b"\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04"
    b"\x04\x00\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!1A\x06\x13Qa"
    b"\x07\"q\x142\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1\xf0$3br\x82\t\n"
    b"\x16\x17\x18\x19\x1a%&'()*456789:CDEFGHIJ"
    b"STUVWXYZcdefghijstuvwxyz\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93"
    b"\x94\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa"
    b"\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8"
    b"\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xe1\xe2\xe3\xe4\xe5"
    b"\xe6\xe7\xe8\xe9\xea\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xff"
    b"\xda\x00\x08\x01\x01\x00\x00?\x00\xfb\xd4P\x00\x00\x00\x1f\xff\xd9"
)


def _jpeg_file(name: str = "attendance.jpg"):
    return ("file", (name, io.BytesIO(_TINY_JPEG), "image/jpeg"))


@pytest.mark.asyncio
async def test_attendance_rejects_without_liveness(client):
    """No liveness_verified field → 403."""
    data = {"liveness_verified": "false"}
    files = [_jpeg_file()]
    resp = await client.post("/attendance/mark", data=data, files=files)
    assert resp.status_code == 403
    assert "liveness" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_attendance_rejects_unrecognized_face(client):
    """With liveness verified but face not in any enrolled encoding → 404."""
    with patch(
        "app.services.face_recognition.face_service.recognize",
        return_value=None,
    ):
        data = {"liveness_verified": "true"}
        files = [_jpeg_file()]
        resp = await client.post("/attendance/mark", data=data, files=files)
    assert resp.status_code == 404
    assert "not recognized" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_attendance_marks_present(client):
    """Recognized user gets marked present (201/200) for today."""
    reg = await register_user(client, "face@test.com", "Pass123!", "Face User")
    user_data = reg["user"]
    uid = user_data["unique_id"]

    with patch(
        "app.services.face_recognition.face_service.recognize",
        return_value={"user_id": uid, "confidence": 88.0, "similarity": 0.88},
    ):
        data = {"liveness_verified": "true"}
        files = [_jpeg_file()]
        resp = await client.post("/attendance/mark", data=data, files=files)

    assert resp.status_code == 200
    body = resp.json()
    assert body["attendance"]["status"] == "present"
    assert body["user"]["email"] == "face@test.com"
    assert body["confidence"] == 88.0


@pytest.mark.asyncio
async def test_attendance_blocks_duplicate(client):
    """Same recognized user cannot mark attendance twice on the same day."""
    reg = await register_user(client, "dup@test.com", "Pass123!", "Dup User")
    uid = reg["user"]["unique_id"]
    mock_result = {"user_id": uid, "confidence": 85.0, "similarity": 0.85}

    with patch(
        "app.services.face_recognition.face_service.recognize",
        return_value=mock_result,
    ):
        data = {"liveness_verified": "true"}
        # First mark — succeeds
        resp1 = await client.post("/attendance/mark", data=data, files=[_jpeg_file()])
        assert resp1.status_code == 200

        # Second mark — should be rejected
        resp2 = await client.post("/attendance/mark", data=data, files=[_jpeg_file()])
        assert resp2.status_code == 400
        assert "already marked" in resp2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_attendance_overrides_absent_to_present(client, admin_token):
    """
    If admin has marked a user absent, a subsequent face scan that day
    should upgrade the status to present.
    """
    reg = await register_user(client, "override@test.com", "Pass123!", "Override User")
    uid = reg["user"]["unique_id"]

    # Admin marks them absent
    await client.post(
        "/admin/mark-absent",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Check they're now absent
    mock_result = {"user_id": uid, "confidence": 90.0, "similarity": 0.90}
    with patch(
        "app.services.face_recognition.face_service.recognize",
        return_value=mock_result,
    ):
        data = {"liveness_verified": "true"}
        resp = await client.post("/attendance/mark", data=data, files=[_jpeg_file()])

    assert resp.status_code == 200
    assert resp.json()["attendance"]["status"] == "present"
    assert "absent to present" in resp.json()["message"].lower()
