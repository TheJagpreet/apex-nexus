"""Tests for user preference endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers, register_and_login


@pytest.mark.asyncio
async def test_set_and_get_preference(client: AsyncClient):
    _, token = await register_and_login(client)
    hdrs = auth_headers(token)

    resp = await client.put(
        "/users/me/preferences", json={"key": "theme", "value": "dark"}, headers=hdrs
    )
    assert resp.status_code == 200
    assert resp.json() == {"key": "theme", "value": "dark"}

    resp = await client.get("/users/me/preferences/theme", headers=hdrs)
    assert resp.status_code == 200
    assert resp.json()["value"] == "dark"


@pytest.mark.asyncio
async def test_update_preference(client: AsyncClient):
    _, token = await register_and_login(client)
    hdrs = auth_headers(token)

    await client.put(
        "/users/me/preferences", json={"key": "theme", "value": "dark"}, headers=hdrs
    )
    await client.put(
        "/users/me/preferences", json={"key": "theme", "value": "light"}, headers=hdrs
    )

    resp = await client.get("/users/me/preferences/theme", headers=hdrs)
    assert resp.json()["value"] == "light"


@pytest.mark.asyncio
async def test_list_preferences(client: AsyncClient):
    _, token = await register_and_login(client)
    hdrs = auth_headers(token)

    await client.put(
        "/users/me/preferences", json={"key": "theme", "value": "dark"}, headers=hdrs
    )
    await client.put(
        "/users/me/preferences", json={"key": "language", "value": "en"}, headers=hdrs
    )

    resp = await client.get("/users/me/preferences", headers=hdrs)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    keys = {p["key"] for p in data}
    assert keys == {"theme", "language"}


@pytest.mark.asyncio
async def test_delete_preference(client: AsyncClient):
    _, token = await register_and_login(client)
    hdrs = auth_headers(token)

    await client.put(
        "/users/me/preferences", json={"key": "theme", "value": "dark"}, headers=hdrs
    )
    resp = await client.delete("/users/me/preferences/theme", headers=hdrs)
    assert resp.status_code == 204

    resp = await client.get("/users/me/preferences/theme", headers=hdrs)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_nonexistent_preference(client: AsyncClient):
    _, token = await register_and_login(client)
    resp = await client.delete(
        "/users/me/preferences/ghost", headers=auth_headers(token)
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_preference_isolation(client: AsyncClient):
    """User 1's preferences are invisible to user 2."""
    _, token1 = await register_and_login(client)

    user2 = {
        "username": "other2",
        "email": "other2@example.com",
        "password": "OtherP@ss123",
    }
    await client.post("/auth/register", json=user2)
    resp = await client.post(
        "/auth/login", json={"username": "other2", "password": "OtherP@ss123"}
    )
    token2 = resp.json()["access_token"]

    await client.put(
        "/users/me/preferences",
        json={"key": "secret", "value": "value"},
        headers=auth_headers(token1),
    )

    resp = await client.get(
        "/users/me/preferences/secret", headers=auth_headers(token2)
    )
    assert resp.status_code == 404
