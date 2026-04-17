"""Shared pytest fixtures for Apex Identity tests."""

from __future__ import annotations

from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from apex_identity.database import get_db
from apex_identity.main import app
from apex_identity.models import Base

# In-memory SQLite for tests
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a fresh in-memory database for each test."""
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provide an httpx AsyncClient wired to the test database."""

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ── Helpers ──────────────────────────────────────────────────────

TEST_USER = {
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecureP@ss123",
    "display_name": "Test User",
}


async def register_and_login(client: AsyncClient) -> tuple[str, str]:
    """Register TEST_USER, log in, and return (user_id, access_token)."""
    resp = await client.post("/auth/register", json=TEST_USER)
    assert resp.status_code == 201
    user_id = resp.json()["id"]

    resp = await client.post(
        "/auth/login",
        json={"username": TEST_USER["username"], "password": TEST_USER["password"]},
    )
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return user_id, token


def auth_headers(token: str) -> dict[str, str]:
    """Return Authorization headers for a Bearer token."""
    return {"Authorization": f"Bearer {token}"}
