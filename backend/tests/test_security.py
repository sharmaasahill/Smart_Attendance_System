"""Security hardening tests: password policy and weak-secret detection."""

import pytest

from app.core.config import is_weak_secret, validate_security, Settings


# ── Weak secret detection ────────────────────────────────────────────────────

def test_known_placeholder_is_weak():
    assert is_weak_secret("change-me-in-production") is True
    assert is_weak_secret("") is True


def test_short_secret_is_weak():
    assert is_weak_secret("short") is True


def test_strong_secret_is_ok():
    assert is_weak_secret("a" * 32) is False
    assert is_weak_secret("test-secret-key-which-is-long-enough-32+chars-xyz") is False


def test_validate_security_raises_in_production_with_weak_secret():
    s = Settings(DEBUG=False, SECRET_KEY="change-me-in-production")
    with pytest.raises(RuntimeError):
        validate_security(s)


def test_validate_security_allows_debug_with_weak_secret():
    s = Settings(DEBUG=True, SECRET_KEY="change-me-in-production")
    validate_security(s)  # should not raise


def test_validate_security_allows_strong_secret():
    s = Settings(DEBUG=False, SECRET_KEY="x" * 48)
    validate_security(s)  # should not raise


# ── Password policy (enforced at register) ───────────────────────────────────

@pytest.mark.asyncio
async def test_register_rejects_short_password(client):
    resp = await client.post("/auth/register", json={
        "email": "weak1@test.com",
        "password": "ab1",
        "full_name": "Weak",
    })
    assert resp.status_code == 400
    assert "at least" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_rejects_password_without_digit(client):
    resp = await client.post("/auth/register", json={
        "email": "weak2@test.com",
        "password": "onlyletters",
        "full_name": "Weak",
    })
    assert resp.status_code == 400
    assert "letter and one number" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_accepts_strong_password(client):
    resp = await client.post("/auth/register", json={
        "email": "strong@test.com",
        "password": "Strong123",
        "full_name": "Strong",
    })
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_change_password_enforces_policy(client, user_token):
    resp = await client.post(
        "/user/change-password",
        json={"current_password": "UserPass1!", "new_password": "weak"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 400
