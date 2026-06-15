"""
Face recognition service unit tests (DB-backed) — model calls are stubbed.

Covers:
  - embedding cache builds from DB and refreshes on change
  - cosine k-NN matching returns the correct user
  - threshold enforcement (low-similarity → no match)
  - duplicate detection across users (and skipping self)
"""

from unittest.mock import patch

import numpy as np

from app.models import FaceEmbedding, User
from app.services.face_recognition import face_service


def _unit_vector(dim_index: int, size: int = 512) -> np.ndarray:
    v = np.zeros(size, dtype=np.float32)
    v[dim_index] = 1.0
    return v


def _add_user_with_embedding(db, unique_id: str, email: str, emb: np.ndarray) -> User:
    user = User(
        email=email,
        password="hashed",
        full_name=unique_id,
        unique_id=unique_id,
        role="user",
        is_active=True,
        face_registered=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    arr = emb.reshape(1, -1).astype(np.float32)
    db.add(FaceEmbedding(
        user_id=user.id,
        embeddings=arr.tobytes(),
        count=1,
        dim=int(arr.shape[1]),
        model="buffalo_l",
    ))
    db.commit()
    return user


def _two_users(db):
    a = _add_user_with_embedding(db, "USR_A", "a@test.com", _unit_vector(0))
    b = _add_user_with_embedding(db, "USR_B", "b@test.com", _unit_vector(1))
    face_service.invalidate_cache()
    return a, b


# ── Cache ─────────────────────────────────────────────────────────────────────

def test_cache_builds_from_db(db_session):
    _add_user_with_embedding(db_session, "USR_X", "x@test.com", _unit_vector(0))
    face_service.invalidate_cache()
    face_service._refresh_cache(db_session)
    assert face_service._cache_embeddings is not None
    assert face_service._cache_labels == ["USR_X"]


def test_cache_empty_when_no_enrollments(db_session):
    face_service.invalidate_cache()
    face_service._refresh_cache(db_session)
    assert face_service._cache_embeddings is None
    assert face_service._cache_labels == []


# ── Recognition ─────────────────────────────────────────────────────────────

def test_recognize_returns_correct_user(db_session):
    _two_users(db_session)
    with patch.object(face_service, "get_embedding", return_value=_unit_vector(0)):
        result = face_service.recognize("dummy.jpg", db_session)
    assert result is not None
    assert result["user_id"] == "USR_A"
    assert result["confidence"] == 100.0


def test_recognize_no_match_below_threshold(db_session):
    _two_users(db_session)
    probe = _unit_vector(2)  # orthogonal to both stored vectors
    with patch.object(face_service, "get_embedding", return_value=probe):
        result = face_service.recognize("dummy.jpg", db_session)
    assert result is None


def test_recognize_returns_none_when_no_embedding(db_session):
    face_service.invalidate_cache()
    with patch.object(face_service, "get_embedding", return_value=None):
        result = face_service.recognize("dummy.jpg", db_session)
    assert result is None


def test_recognize_returns_none_when_cache_empty(db_session):
    face_service.invalidate_cache()
    with patch.object(face_service, "get_embedding", return_value=_unit_vector(0)):
        result = face_service.recognize("dummy.jpg", db_session)
    assert result is None


# ── Duplicate detection ───────────────────────────────────────────────────────

def test_find_duplicate_detects_same_face(db_session):
    _two_users(db_session)
    with patch.object(face_service, "get_embedding", return_value=_unit_vector(0)):
        result = face_service.find_duplicate_face("dummy.jpg", db_session, current_user_id="USR_B")
    assert result is not None
    assert result["unique_id"] == "USR_A"


def test_find_duplicate_skips_own_user(db_session):
    _two_users(db_session)
    with patch.object(face_service, "get_embedding", return_value=_unit_vector(0)):
        result = face_service.find_duplicate_face("dummy.jpg", db_session, current_user_id="USR_A")
    assert result is None


def test_find_duplicate_no_match(db_session):
    _two_users(db_session)
    probe = _unit_vector(2)
    with patch.object(face_service, "get_embedding", return_value=probe):
        result = face_service.find_duplicate_face("dummy.jpg", db_session, current_user_id="USR_C")
    assert result is None
