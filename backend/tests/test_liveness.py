"""
Server-verified active liveness (head-turn challenge).

This is the defence that stops a photo or a phone screen from enrolling or
marking attendance. The key property under test: verification reads the head
pose out of the submitted frames, so a caller cannot pass by asserting success.

Frame measurement is stubbed because real pose values require real faces; what
matters here is the decision logic built on top of those measurements, plus the
challenge lifecycle (single-use, expiring).
"""

import io
import time
from unittest.mock import patch

import cv2
import numpy as np
import pytest

from app.core.config import settings
from app.services.liveness import (
    Challenge,
    LivenessError,
    challenge_store,
    verify_challenge_frames,
)
from tests.conftest import register_user


# ── helpers ──────────────────────────────────────────────────────────────────

def _measurement(index, yaw, with_landmarks=True):
    """Build a fake per-frame measurement with a given yaw."""
    from app.services.liveness import FrameMeasurement

    rng = np.random.default_rng(index)
    lm = rng.random((106, 2)).astype(np.float32) * 100 if with_landmarks else None
    return FrameMeasurement(
        index=index,
        yaw=float(yaw),
        pitch=0.0,
        roll=0.0,
        landmarks=lm,
        bbox_area=10000.0,
    )


def _patch_measurements(yaws):
    """Stub frame analysis with a yaw series."""
    return patch(
        "app.services.liveness._measure_frames",
        return_value=[_measurement(i, y) for i, y in enumerate(yaws)],
    )


def _challenge(direction="left"):
    return Challenge(
        challenge_id="test-challenge",
        direction=direction,
        created_at=time.time(),
    )


def _paths(n):
    return [f"/tmp/frame_{i}.jpg" for i in range(n)]


@pytest.fixture(autouse=True)
def _clear_store():
    challenge_store.clear()
    yield
    challenge_store.clear()


# ── challenge lifecycle ──────────────────────────────────────────────────────

def test_issued_challenge_has_direction_and_instruction():
    c = challenge_store.issue()
    assert c.direction in ("left", "right")
    assert c.direction.upper() in c.instruction.upper()
    assert not c.consumed
    assert not c.expired


def test_challenge_is_single_use():
    """
    Single-use is what stops one genuine head turn from being replayed to mark
    attendance repeatedly.
    """
    c = challenge_store.issue()
    challenge_store.consume(c.challenge_id)
    with pytest.raises(LivenessError, match="already used"):
        challenge_store.consume(c.challenge_id)


def test_unknown_challenge_rejected():
    with pytest.raises(LivenessError, match="not found"):
        challenge_store.consume("never-issued")


def test_expired_challenge_rejected():
    c = challenge_store.issue()
    # Backdate past the TTL rather than sleeping or setting TTL to 0; on Windows
    # time.time() is coarse enough that "issued just now" can read as 0.0s old.
    c.created_at -= settings.LIVENESS_CHALLENGE_TTL_SECONDS + 1
    assert c.expired
    with pytest.raises(LivenessError):
        challenge_store.consume(c.challenge_id)


def test_directions_are_not_always_the_same():
    """
    The direction must vary between attempts, otherwise a pre-recorded clip of
    the right movement would always work.
    """
    seen = {challenge_store.issue().direction for _ in range(40)}
    assert seen == {"left", "right"}


# ── verification logic ───────────────────────────────────────────────────────

def test_static_frames_rejected():
    """
    THE core case: a photo or phone screen cannot change its yaw, so the sweep
    is ~0 and verification must fail.
    """
    with _patch_measurements([4.0, 4.0, 4.01, 3.99, 4.0, 4.0]):
        with pytest.raises(LivenessError, match="No head movement"):
            verify_challenge_frames(_challenge(), _paths(6))


def test_genuine_sweep_accepted():
    """A real turn produces a wide yaw range and passes."""
    yaws = [0.0, 5.0, 11.0, 18.0, 24.0, 15.0, 3.0]
    with _patch_measurements(yaws):
        result = verify_challenge_frames(_challenge(), _paths(len(yaws)))
    assert result["metrics"]["yaw_sweep"] >= settings.LIVENESS_MIN_YAW_SWEEP
    assert result["frontal_paths"]


def test_sweep_just_below_threshold_rejected(monkeypatch):
    monkeypatch.setattr(settings, "LIVENESS_MIN_YAW_SWEEP", 12.0)
    yaws = [0.0, 3.0, 6.0, 9.0, 11.0, 10.0]
    with _patch_measurements(yaws):
        with pytest.raises(LivenessError, match="No head movement"):
            verify_challenge_frames(_challenge(), _paths(len(yaws)))


def test_too_few_frames_rejected():
    with _patch_measurements([0.0, 20.0]):
        with pytest.raises(LivenessError, match="at least"):
            verify_challenge_frames(_challenge(), _paths(2))


def test_too_many_frames_rejected():
    n = settings.LIVENESS_MAX_FRAMES + 1
    with _patch_measurements([0.0] * n):
        with pytest.raises(LivenessError, match="Too many frames"):
            verify_challenge_frames(_challenge(), _paths(n))


def test_frames_without_faces_rejected():
    """A burst the face could not be tracked through must not pass."""
    with patch("app.services.liveness._measure_frames", return_value=[]):
        with pytest.raises(LivenessError, match="Could not track"):
            verify_challenge_frames(_challenge(), _paths(8))


def test_low_face_detection_ratio_rejected():
    """Mostly-empty frames cannot dilute the check."""
    # 8 frames submitted, face found in only 3 -> ratio 0.375 < 0.6
    with patch(
        "app.services.liveness._measure_frames",
        return_value=[_measurement(i, y) for i, y in enumerate([0.0, 15.0, 25.0])],
    ):
        with pytest.raises(LivenessError, match="Could not track"):
            verify_challenge_frames(_challenge(), _paths(8))


def test_frontal_paths_ordered_by_closeness_to_centre():
    """
    Recognition should run on the most frontal frames; a turned head matches the
    gallery poorly.
    """
    yaws = [30.0, 1.0, 22.0, -2.0, 14.0, 40.0]
    with _patch_measurements(yaws):
        result = verify_challenge_frames(_challenge(), _paths(len(yaws)))
    # yaw 1.0 is index 1 and -2.0 is index 3 -> those two should lead
    assert result["frontal_paths"][0] == "/tmp/frame_1.jpg"
    assert result["frontal_paths"][1] == "/tmp/frame_3.jpg"


def test_direction_enforced_when_enabled(monkeypatch):
    """
    With direction checking on, a sweep the wrong way fails. Off by default
    until the mirrored-camera sign convention is confirmed from real logs.
    """
    monkeypatch.setattr(settings, "LIVENESS_REQUIRE_DIRECTION", True)
    # Challenge asks for "left" (positive yaw); this sweep goes negative.
    yaws = [0.0, -6.0, -13.0, -20.0, -24.0, -10.0]
    with _patch_measurements(yaws):
        with pytest.raises(LivenessError, match="turn left"):
            verify_challenge_frames(_challenge("left"), _paths(len(yaws)))


def test_direction_correct_passes_when_enabled(monkeypatch):
    monkeypatch.setattr(settings, "LIVENESS_REQUIRE_DIRECTION", True)
    yaws = [0.0, 6.0, 13.0, 20.0, 24.0, 10.0]
    with _patch_measurements(yaws):
        result = verify_challenge_frames(_challenge("left"), _paths(len(yaws)))
    assert result["metrics"]["yaw_directional"] > 0


def test_metrics_reported_for_calibration():
    """
    Every attempt reports its measurements so thresholds (notably the planarity
    one, still unenforced) can be tuned from real numbers.
    """
    yaws = [0.0, 8.0, 16.0, 24.0, 12.0, 2.0]
    with _patch_measurements(yaws):
        metrics = verify_challenge_frames(_challenge(), _paths(len(yaws)))["metrics"]
    for key in (
        "frames_submitted", "frames_with_face", "face_frame_ratio",
        "yaw_min", "yaw_max", "yaw_sweep", "yaw_directional",
        "requested_direction", "planar_residual",
    ):
        assert key in metrics


# ── endpoint integration ─────────────────────────────────────────────────────

def _jpeg(seed):
    rng = np.random.default_rng(seed)
    img = rng.integers(0, 256, size=(64, 64, 3), dtype=np.uint8)
    ok, buf = cv2.imencode(".jpg", img)
    assert ok
    return buf.tobytes()


def _frames(count=6, seed_start=0):
    return [
        ("files", (f"f{i}.jpg", io.BytesIO(_jpeg(seed_start + i)), "image/jpeg"))
        for i in range(count)
    ]


@pytest.mark.asyncio
async def test_challenge_endpoint_returns_usable_challenge(client):
    resp = await client.post("/liveness/challenge")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["direction"] in ("left", "right")
    assert body["challenge_id"]
    assert body["instruction"]
    assert body["min_frames"] == settings.LIVENESS_MIN_FRAMES


@pytest.mark.asyncio
async def test_attendance_requires_challenge_when_enabled(client, monkeypatch):
    """Without a challenge id the mark is refused outright."""
    monkeypatch.setattr(settings, "LIVENESS_CHALLENGE_ENABLED", True)
    resp = await client.post(
        "/attendance/mark",
        data={"liveness_verified": "true"},
        files=_frames(6),
    )
    assert resp.status_code == 403
    assert "challenge" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_attendance_rejects_static_burst_end_to_end(client, monkeypatch):
    """
    Full path: real challenge, real frames, but the head never moved. This is the
    phone-screen / printed-photo case and it must be refused.
    """
    monkeypatch.setattr(settings, "LIVENESS_CHALLENGE_ENABLED", True)
    ch = (await client.post("/liveness/challenge")).json()

    with _patch_measurements([5.0] * 6):
        resp = await client.post(
            "/attendance/mark",
            data={"liveness_verified": "true", "challenge_id": ch["challenge_id"]},
            files=_frames(6),
        )
    assert resp.status_code == 403
    assert "movement" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_attendance_accepts_real_turn_end_to_end(client, monkeypatch):
    """With a genuine sweep, liveness passes and recognition proceeds."""
    monkeypatch.setattr(settings, "LIVENESS_CHALLENGE_ENABLED", True)
    reg = await register_user(client, "turn@test.com", "Pass123!", "Turn User")
    uid = reg["user"]["unique_id"]

    ch = (await client.post("/liveness/challenge")).json()
    yaws = [0.0, 7.0, 15.0, 23.0, 11.0, 1.0]

    with _patch_measurements(yaws), patch(
        "app.services.face_recognition.face_service.recognize",
        return_value={"user_id": uid, "confidence": 91.0, "similarity": 0.91},
    ):
        resp = await client.post(
            "/attendance/mark",
            data={"liveness_verified": "true", "challenge_id": ch["challenge_id"]},
            files=_frames(6),
        )
    assert resp.status_code == 200, resp.text
    assert resp.json()["attendance"]["status"] == "present"


@pytest.mark.asyncio
async def test_challenge_cannot_be_reused_for_second_mark(client, monkeypatch):
    """A single turn must not be replayable into repeated marks."""
    monkeypatch.setattr(settings, "LIVENESS_CHALLENGE_ENABLED", True)
    reg = await register_user(client, "reuse@test.com", "Pass123!", "Reuse User")
    uid = reg["user"]["unique_id"]

    ch = (await client.post("/liveness/challenge")).json()
    yaws = [0.0, 7.0, 15.0, 23.0, 11.0, 1.0]
    recognize = patch(
        "app.services.face_recognition.face_service.recognize",
        return_value={"user_id": uid, "confidence": 91.0, "similarity": 0.91},
    )

    with _patch_measurements(yaws), recognize:
        first = await client.post(
            "/attendance/mark",
            data={"liveness_verified": "true", "challenge_id": ch["challenge_id"]},
            files=_frames(6),
        )
        assert first.status_code == 200, first.text

        second = await client.post(
            "/attendance/mark",
            data={"liveness_verified": "true", "challenge_id": ch["challenge_id"]},
            files=_frames(6, seed_start=50),
        )
    assert second.status_code == 403
    assert "already used" in second.json()["detail"].lower()


@pytest.mark.asyncio
async def test_enrollment_requires_challenge(client, user_token, monkeypatch):
    """Enrolling a spoofed face poisons the gallery, so it is gated too."""
    monkeypatch.setattr(settings, "LIVENESS_CHALLENGE_ENABLED", True)
    resp = await client.post(
        "/face/register",
        headers={"Authorization": f"Bearer {user_token}"},
        files=_frames(6),
    )
    assert resp.status_code == 403
    assert "challenge" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_enrollment_rejects_static_burst(client, user_token, monkeypatch):
    """A photo held to the camera during enrollment is refused."""
    monkeypatch.setattr(settings, "LIVENESS_CHALLENGE_ENABLED", True)
    ch = (await client.post("/liveness/challenge")).json()

    with _patch_measurements([2.0] * 6):
        resp = await client.post(
            "/face/register",
            headers={"Authorization": f"Bearer {user_token}"},
            data={"challenge_id": ch["challenge_id"]},
            files=_frames(6),
        )
    assert resp.status_code == 403
    assert "movement" in resp.json()["detail"].lower()
