"""Admin authorization tests: endpoints reject non-admin tokens and accept admin tokens."""

import pytest
from tests.conftest import register_user, login_user


@pytest.mark.asyncio
async def test_admin_users_blocked_for_regular_user(client, user_token):
    resp = await client.get(
        "/admin/users",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_users_allowed_for_admin(client, admin_token):
    resp = await client.get(
        "/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_admin_attendance_blocked_for_regular_user(client, user_token):
    resp = await client.get(
        "/admin/attendance",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_face_status_blocked_for_regular_user(client, user_token):
    resp = await client.get(
        "/admin/users/face-status",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_mark_absent(client, admin_token):
    """Admin can trigger mark-absent even when no one is absent (idempotent)."""
    # Register a user to give the endpoint something to work with
    await register_user(client, "staff@test.com", "Pass123!", "Staff")
    resp = await client.post(
        "/admin/mark-absent",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert "absent" in resp.json()["message"].lower()


@pytest.mark.asyncio
async def test_admin_delete_user(client, admin_token):
    """Admin can delete a user; the user no longer appears in the list."""
    reg = await register_user(client, "delete_me@test.com", "Pass123!", "Delete Me")
    uid = reg["user"]["unique_id"]

    del_resp = await client.delete(
        f"/admin/user/{uid}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_resp.status_code == 200

    users = await client.get(
        "/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    emails = [u["email"] for u in users.json()]
    assert "delete_me@test.com" not in emails


@pytest.mark.asyncio
async def test_admin_users_pagination(client, admin_token):
    """limit/offset paginate users and X-Total-Count reports the full total."""
    # admin_token already created 1 admin; add 3 more users
    for i in range(3):
        await register_user(client, f"p{i}@test.com", "Pass123!", f"User {i}")

    resp = await client.get(
        "/admin/users?limit=2&offset=0",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 2
    assert resp.headers.get("X-Total-Count") == "4"


@pytest.mark.asyncio
async def test_admin_update_attendance(client, admin_token):
    """Admin can change an attendance record status."""
    from datetime import date

    # Create a user and register an absence
    reg = await register_user(client, "edit@test.com", "Pass123!", "Edit User")

    # Mark absent via the admin endpoint
    await client.post(
        "/admin/mark-absent",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Fetch attendance to get the record id
    att_resp = await client.get(
        f"/admin/attendance?date={date.today().isoformat()}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    records = att_resp.json()
    rec = next((r for r in records if r["user"]["email"] == "edit@test.com"), None)
    assert rec is not None

    # Edit the record to present
    edit_resp = await client.put(
        f"/admin/attendance/{rec['id']}",
        data={"status": "present", "time_in": "09:00"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert edit_resp.status_code == 200
    assert edit_resp.json()["attendance"]["status"] == "present"
