"""Tests for chat session and message endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers, register_and_login


@pytest.mark.asyncio
async def test_create_session(client: AsyncClient):
    _, token = await register_and_login(client)
    hdrs = auth_headers(token)

    resp = await client.post("/sessions", json={"title": "My Chat"}, headers=hdrs)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "My Chat"
    assert data["message_count"] == 0


@pytest.mark.asyncio
async def test_list_sessions(client: AsyncClient):
    _, token = await register_and_login(client)
    hdrs = auth_headers(token)

    await client.post("/sessions", json={"title": "Chat 1"}, headers=hdrs)
    await client.post("/sessions", json={"title": "Chat 2"}, headers=hdrs)

    resp = await client.get("/sessions", headers=hdrs)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


@pytest.mark.asyncio
async def test_get_session_detail(client: AsyncClient):
    _, token = await register_and_login(client)
    hdrs = auth_headers(token)

    resp = await client.post("/sessions", json={"title": "Detail Chat"}, headers=hdrs)
    session_id = resp.json()["id"]

    resp = await client.get(f"/sessions/{session_id}", headers=hdrs)
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Detail Chat"
    assert data["messages"] == []


@pytest.mark.asyncio
async def test_update_session(client: AsyncClient):
    _, token = await register_and_login(client)
    hdrs = auth_headers(token)

    resp = await client.post("/sessions", json={"title": "Old Title"}, headers=hdrs)
    session_id = resp.json()["id"]

    resp = await client.patch(
        f"/sessions/{session_id}", json={"title": "New Title"}, headers=hdrs
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "New Title"


@pytest.mark.asyncio
async def test_delete_session(client: AsyncClient):
    _, token = await register_and_login(client)
    hdrs = auth_headers(token)

    resp = await client.post("/sessions", json={"title": "Delete Me"}, headers=hdrs)
    session_id = resp.json()["id"]

    resp = await client.delete(f"/sessions/{session_id}", headers=hdrs)
    assert resp.status_code == 204

    resp = await client.get(f"/sessions/{session_id}", headers=hdrs)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_session_not_found(client: AsyncClient):
    _, token = await register_and_login(client)
    resp = await client.get("/sessions/nonexistent", headers=auth_headers(token))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_add_and_list_messages(client: AsyncClient):
    _, token = await register_and_login(client)
    hdrs = auth_headers(token)

    resp = await client.post("/sessions", json={"title": "Msg Test"}, headers=hdrs)
    session_id = resp.json()["id"]

    # Add user message
    msg1 = {"role": "user", "content": "Hello?", "files": ["doc.pdf"]}
    resp = await client.post(f"/sessions/{session_id}/messages", json=msg1, headers=hdrs)
    assert resp.status_code == 201
    data = resp.json()
    assert data["role"] == "user"
    assert data["content"] == "Hello?"
    assert data["files"] == ["doc.pdf"]

    # Add assistant reply with sources
    msg2 = {
        "role": "assistant",
        "content": "Here's what I found.",
        "sources": [{"text": "chunk 1", "score": 0.95}],
    }
    resp = await client.post(f"/sessions/{session_id}/messages", json=msg2, headers=hdrs)
    assert resp.status_code == 201

    # List messages
    resp = await client.get(f"/sessions/{session_id}/messages", headers=hdrs)
    assert resp.status_code == 200
    msgs = resp.json()
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user"
    assert msgs[1]["sources"] == [{"text": "chunk 1", "score": 0.95}]


@pytest.mark.asyncio
async def test_invalid_message_role(client: AsyncClient):
    _, token = await register_and_login(client)
    hdrs = auth_headers(token)

    resp = await client.post("/sessions", json={"title": "Role Test"}, headers=hdrs)
    session_id = resp.json()["id"]

    resp = await client.post(
        f"/sessions/{session_id}/messages",
        json={"role": "hacker", "content": "nope"},
        headers=hdrs,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_session_isolation(client: AsyncClient):
    """A user cannot see another user's sessions."""
    # Register user 1
    _, token1 = await register_and_login(client)

    # Register user 2
    user2 = {
        "username": "other",
        "email": "other@example.com",
        "password": "OtherP@ss123",
    }
    await client.post("/auth/register", json=user2)
    resp = await client.post(
        "/auth/login", json={"username": "other", "password": "OtherP@ss123"}
    )
    token2 = resp.json()["access_token"]

    # User 1 creates a session
    resp = await client.post(
        "/sessions", json={"title": "Private"}, headers=auth_headers(token1)
    )
    session_id = resp.json()["id"]

    # User 2 cannot access it
    resp = await client.get(f"/sessions/{session_id}", headers=auth_headers(token2))
    assert resp.status_code == 404
