"""Auth flow tests: register, login, duplicate email, wrong password, inactive account."""

import pytest
from tests.conftest import register_user, login_user


@pytest.mark.asyncio
async def test_register_success(client):
    resp = await client.post("/auth/register", json={
        "email": "new@test.com",
        "password": "Secret123!",
        "full_name": "New User",
    })
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["user"]["email"] == "new@test.com"
    assert body["user"]["role"] == "user"


@pytest.mark.asyncio
async def test_register_admin_email(client):
    """User whose email matches ADMIN_EMAIL env var gets the admin role."""
    resp = await client.post("/auth/register", json={
        "email": "admin@test.com",
        "password": "Admin123!",
        "full_name": "Admin",
    })
    assert resp.status_code == 200
    assert resp.json()["user"]["role"] == "admin"


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    await register_user(client, "dup@test.com", "Pass123!")
    resp = await client.post("/auth/register", json={
        "email": "dup@test.com",
        "password": "Other123!",
        "full_name": "Dup",
    })
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_success(client):
    await register_user(client, "login@test.com", "Pass123!")
    token = await login_user(client, "login@test.com", "Pass123!")
    assert isinstance(token, str) and len(token) > 20


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await register_user(client, "wrong@test.com", "Pass123!")
    resp = await client.post("/auth/login", json={"email": "wrong@test.com", "password": "BadPass"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    resp = await client.post("/auth/login", json={"email": "ghost@test.com", "password": "x"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_requires_token(client):
    resp = await client.get("/user/profile")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_protected_route_with_token(client, user_token):
    resp = await client.get("/user/profile", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "user@test.com"
