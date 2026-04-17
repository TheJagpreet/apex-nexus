"""Tests for auth endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import TEST_USER, auth_headers, register_and_login


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    resp = await client.post("/auth/register", json=TEST_USER)
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == TEST_USER["username"]
    assert data["email"] == TEST_USER["email"]
    assert "id" in data
    # Password must never be returned
    assert "password" not in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate(client: AsyncClient):
    await client.post("/auth/register", json=TEST_USER)
    resp = await client.post("/auth/register", json=TEST_USER)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient):
    payload = {**TEST_USER, "password": "short"}
    resp = await client.post("/auth/register", json=payload)
    assert resp.status_code == 422  # validation error


@pytest.mark.asyncio
async def test_register_invalid_email(client: AsyncClient):
    payload = {**TEST_USER, "email": "not-an-email"}
    resp = await client.post("/auth/register", json=payload)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post("/auth/register", json=TEST_USER)
    resp = await client.post(
        "/auth/login",
        json={"username": TEST_USER["username"], "password": TEST_USER["password"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/auth/register", json=TEST_USER)
    resp = await client.post(
        "/auth/login",
        json={"username": TEST_USER["username"], "password": "WrongPassword1"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_user(client: AsyncClient):
    resp = await client.post(
        "/auth/login",
        json={"username": "ghost", "password": "whatever123"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me(client: AsyncClient):
    _, token = await register_and_login(client)
    resp = await client.get("/auth/me", headers=auth_headers(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == TEST_USER["username"]


@pytest.mark.asyncio
async def test_me_no_token(client: AsyncClient):
    resp = await client.get("/auth/me")
    assert resp.status_code in (401, 403)  # HTTPBearer returns 401 or 403 depending on version


@pytest.mark.asyncio
async def test_me_bad_token(client: AsyncClient):
    resp = await client.get("/auth/me", headers=auth_headers("invalid.token.here"))
    assert resp.status_code == 401
