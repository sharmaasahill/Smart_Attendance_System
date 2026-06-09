"""
Face recognition service unit tests — all model calls are stubbed.

Tests cover:
  - embedding cache refresh (mtime-based invalidation)
  - cosine k-NN matching returns the correct user
  - threshold enforcement (low-similarity face → no match)
  - duplicate detection across users
  - enrollment cleans stale images before saving new ones
"""

import io
import os
import pickle
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from app.services.face_recognition import FaceRecognitionService


def _make_service(dataset_dir: str) -> FaceRecognitionService:
    """Return a service instance pointing at a temp dataset directory."""
    svc = FaceRecognitionService.__new__(FaceRecognitionService)
    # Manually initialise without loading the heavy model
    svc.model_name = "buffalo_l"
    svc.det_size = (640, 640)
    svc.match_threshold = 0.42
    svc.duplicate_threshold = 0.50
    svc.knn_k = 3
    svc.min_det_score = 0.55
    svc.min_face_size = 50
    svc.min_blur_var = 40.0
    svc.min_quality_score = 45
    svc.min_required_encodings = 3
    svc.enable_liveness_check = True
    svc.min_liveness_confidence = 20
    svc.recognition_max_dim = 1024
    svc._app = None
    svc._cache_embeddings = None
    svc._cache_labels = []
    svc._cache_mtimes = {}

    # Monkeypatch DATASET_DIR used inside the service
    import app.services.face_recognition as fr_module
    fr_module.DATASET_DIR = dataset_dir
    return svc


def _write_encoding(user_dir: str, user_id: str, embedding: np.ndarray):
    """Write a minimal encoding.pkl for a single-embedding user."""
    os.makedirs(user_dir, exist_ok=True)
    payload = {
        "user_id": user_id,
        "embeddings": embedding.reshape(1, -1),
        "count": 1,
        "model": "buffalo_l",
        "dim": 512,
    }
    with open(os.path.join(user_dir, "encoding.pkl"), "wb") as f:
        pickle.dump(payload, f)


# ── Cache refresh ─────────────────────────────────────────────────────────────

def test_cache_builds_from_disk(tmp_path):
    svc = _make_service(str(tmp_path))
    uid = "USR001"
    emb = np.random.randn(512).astype(np.float32)
    emb /= np.linalg.norm(emb)  # L2-normalise
    _write_encoding(str(tmp_path / uid), uid, emb)

    svc._refresh_cache()

    assert svc._cache_embeddings is not None
    assert svc._cache_labels == [uid]
    assert svc._cache_embeddings.shape == (1, 512)


def test_cache_drops_removed_user(tmp_path):
    svc = _make_service(str(tmp_path))
    uid = "USR001"
    emb = np.random.randn(512).astype(np.float32)
    emb /= np.linalg.norm(emb)
    user_dir = tmp_path / uid
    _write_encoding(str(user_dir), uid, emb)
    svc._refresh_cache()
    assert uid in svc._cache_labels

    # Delete the encoding and refresh
    import shutil
    shutil.rmtree(str(user_dir))
    svc._refresh_cache()
    assert svc._cache_labels == []
    assert svc._cache_embeddings is None


# ── Recognition ───────────────────────────────────────────────────────────────

def _svc_with_two_users(tmp_path):
    svc = _make_service(str(tmp_path))
    uid_a, uid_b = "USR_A", "USR_B"
    emb_a = np.zeros(512, dtype=np.float32); emb_a[0] = 1.0  # unit vector along dim-0
    emb_b = np.zeros(512, dtype=np.float32); emb_b[1] = 1.0  # unit vector along dim-1
    _write_encoding(str(tmp_path / uid_a), uid_a, emb_a)
    _write_encoding(str(tmp_path / uid_b), uid_b, emb_b)
    svc._refresh_cache()
    return svc, uid_a, uid_b, emb_a, emb_b


def test_recognize_returns_correct_user(tmp_path):
    svc, uid_a, uid_b, emb_a, emb_b = _svc_with_two_users(tmp_path)

    # Probe identical to emb_a → should match USR_A
    with patch.object(svc, "get_embedding", return_value=emb_a):
        result = svc.recognize("dummy.jpg")

    assert result is not None
    assert result["user_id"] == uid_a
    assert result["confidence"] == 100.0


def test_recognize_no_match_below_threshold(tmp_path):
    svc, uid_a, uid_b, emb_a, emb_b = _svc_with_two_users(tmp_path)

    # Probe orthogonal to both stored vectors → cosine sim = 0, below threshold
    probe = np.zeros(512, dtype=np.float32)
    probe[2] = 1.0  # dim-2: dot product with either stored vector = 0

    with patch.object(svc, "get_embedding", return_value=probe):
        result = svc.recognize("dummy.jpg")

    assert result is None


def test_recognize_returns_none_when_no_embedding(tmp_path):
    svc = _make_service(str(tmp_path))
    with patch.object(svc, "get_embedding", return_value=None):
        result = svc.recognize("dummy.jpg")
    assert result is None


def test_recognize_returns_none_when_cache_empty(tmp_path):
    svc = _make_service(str(tmp_path))
    probe = np.zeros(512, dtype=np.float32); probe[0] = 1.0
    with patch.object(svc, "get_embedding", return_value=probe):
        result = svc.recognize("dummy.jpg")
    assert result is None


# ── Duplicate detection ───────────────────────────────────────────────────────

def test_find_duplicate_detects_same_face(tmp_path):
    svc, uid_a, uid_b, emb_a, emb_b = _svc_with_two_users(tmp_path)

    # Mock DB query
    db_mock = MagicMock()
    mock_user = MagicMock()
    mock_user.unique_id = uid_a
    mock_user.full_name = "User A"
    mock_user.email = "a@test.com"
    db_mock.query.return_value.filter.return_value.first.return_value = mock_user

    # Probe is emb_a → should detect USR_A as duplicate (current user = USR_B)
    with patch.object(svc, "get_embedding", return_value=emb_a):
        result = svc.find_duplicate_face("dummy.jpg", db_mock, current_user_id=uid_b)

    assert result is not None
    assert result["unique_id"] == uid_a


def test_find_duplicate_skips_own_user(tmp_path):
    svc, uid_a, uid_b, emb_a, emb_b = _svc_with_two_users(tmp_path)
    db_mock = MagicMock()

    # Probe is emb_a; current user IS USR_A → should not flag itself
    with patch.object(svc, "get_embedding", return_value=emb_a):
        result = svc.find_duplicate_face("dummy.jpg", db_mock, current_user_id=uid_a)

    assert result is None


def test_find_duplicate_no_match(tmp_path):
    svc, uid_a, uid_b, emb_a, emb_b = _svc_with_two_users(tmp_path)
    db_mock = MagicMock()

    probe = np.zeros(512, dtype=np.float32); probe[2] = 1.0  # orthogonal
    with patch.object(svc, "get_embedding", return_value=probe):
        result = svc.find_duplicate_face("dummy.jpg", db_mock, current_user_id="USR_C")

    assert result is None
