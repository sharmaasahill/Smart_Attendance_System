"""
Deactivating an account must take effect immediately.

Before this was enforced in get_current_user, setting is_active=False only
blocked new logins — an already-issued token kept working until it expired.
"""

import pytest

from tests.conftest import login_user, register_user


async def _deactivate(db_session, email: str) -> None:
    from app.models import User

    user = db_session.query(User).filter(User.email == email).first()
    assert user is not None
    user.is_active = False
    db_session.commit()


@pytest.mark.asyncio
async def test_existing_token_stops_working_once_deactivated(client, db_session):
    """An already-issued token is rejected as soon as the account is disabled."""
    reg = await register_user(client, "deact@test.com", "Pass123!", "Deact User")
    token = reg["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Token works while the account is active.
    ok = await client.get("/user/profile", headers=headers)
    assert ok.status_code == 200

    await _deactivate(db_session, "deact@test.com")

    blocked = await client.get("/user/profile", headers=headers)
    assert blocked.status_code == 403
    assert "deactivated" in blocked.json()["detail"].lower()


@pytest.mark.asyncio
async def test_deactivated_user_cannot_log_in(client, db_session):
    """Login still refuses a disabled account."""
    await register_user(client, "deact2@test.com", "Pass123!", "Deact Two")
    await _deactivate(db_session, "deact2@test.com")

    resp = await client.post(
        "/auth/login",
        json={"email": "deact2@test.com", "password": "Pass123!"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_token_for_deleted_user_is_unauthorized(client, db_session, admin_token):
    """
    A token whose subject no longer exists is an auth failure (401), not a
    404 'User not found'.
    """
    reg = await register_user(client, "gone@test.com", "Pass123!", "Gone User")
    token = reg["access_token"]
    uid = reg["user"]["unique_id"]

    deleted = await client.delete(
        f"/admin/user/{uid}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert deleted.status_code == 200

    resp = await client.get("/user/profile", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_bad_date_param_is_validation_error_not_server_error(client, user_token):
    """
    A malformed date query param must be a 422 validation error. It previously
    reached datetime.strptime unguarded and surfaced as an unhandled 500.
    """
    resp = await client.get(
        "/user/attendance?start_date=not-a-date",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 422
