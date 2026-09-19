"""
Server-side anti-replay guard (face_service.frames_are_distinct).

Attendance liveness is challenged on the client (blink) but that result arrives
as a client-supplied flag, so the server independently verifies that the
submitted frames are separate camera captures. These tests pin that behaviour.

Scope note: this guard defeats a client replaying one still image. It does not
detect a printed photo or screen held up to a live camera — that needs a
passive texture/depth anti-spoofing model.
"""

import cv2
import numpy as np
import pytest

from app.core.config import settings
from app.services.face_recognition import face_service


def _write_jpeg(tmp_path, name: str, img: np.ndarray) -> str:
    path = tmp_path / name
    assert cv2.imwrite(str(path), img)
    return str(path)


def _noise(seed: int, size: int = 64) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return rng.integers(0, 256, size=(size, size, 3), dtype=np.uint8)


def test_single_frame_is_not_a_capture_sequence(tmp_path):
    """One frame cannot demonstrate a live sequence."""
    p = _write_jpeg(tmp_path, "a.jpg", _noise(1))
    result = face_service.frames_are_distinct([p])
    assert result["distinct"] is False
    assert "two frames" in result["reason"].lower()


def test_byte_identical_frames_rejected(tmp_path):
    """The same file content submitted twice is a replay, not a capture."""
    img = _noise(2)
    p1 = _write_jpeg(tmp_path, "a.jpg", img)
    p2 = _write_jpeg(tmp_path, "b.jpg", img)
    result = face_service.frames_are_distinct([p1, p2])
    assert result["distinct"] is False
    assert "identical" in result["reason"].lower()


def test_near_identical_frames_rejected(tmp_path):
    """
    Not byte-identical, but visually the same image: a single pixel nudged by 1.
    Mean per-pixel difference is far below the threshold, so this is rejected
    even though the file hashes differ.
    """
    img1 = _noise(3)
    img2 = img1.copy()
    img2[0, 0, 0] = 255 if img1[0, 0, 0] < 128 else 0

    p1 = _write_jpeg(tmp_path, "a.jpg", img1)
    p2 = _write_jpeg(tmp_path, "b.jpg", img2)

    result = face_service.frames_are_distinct([p1, p2])
    assert result["distinct"] is False
    assert result["min_diff"] < settings.ATTENDANCE_MIN_FRAME_DIFF


def test_distinct_frames_accepted(tmp_path):
    """Genuinely different frames pass."""
    p1 = _write_jpeg(tmp_path, "a.jpg", _noise(4))
    p2 = _write_jpeg(tmp_path, "b.jpg", _noise(5))
    result = face_service.frames_are_distinct([p1, p2])
    assert result["distinct"] is True
    assert result["reason"] is None
    assert result["min_diff"] >= settings.ATTENDANCE_MIN_FRAME_DIFF


def test_duplicate_hidden_in_larger_batch_rejected(tmp_path):
    """
    Every pair must differ, so padding a replayed frame with one genuine frame
    does not sneak it through.
    """
    img = _noise(6)
    p1 = _write_jpeg(tmp_path, "a.jpg", img)
    p2 = _write_jpeg(tmp_path, "b.jpg", _noise(7))
    p3 = _write_jpeg(tmp_path, "c.jpg", img)  # same content as p1

    result = face_service.frames_are_distinct([p1, p2, p3])
    assert result["distinct"] is False


def test_unreadable_frame_rejected(tmp_path):
    """A frame that cannot be decoded fails closed rather than passing."""
    p1 = _write_jpeg(tmp_path, "a.jpg", _noise(8))
    bad = tmp_path / "bad.jpg"
    bad.write_bytes(b"not a jpeg at all")
    result = face_service.frames_are_distinct([p1, str(bad)])
    assert result["distinct"] is False
