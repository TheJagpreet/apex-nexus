"""FastAPI application entry-point."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apex_identity.config import settings
from apex_identity.database import engine
from apex_identity.models import Base
from apex_identity.routers import auth, sessions, users


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Create database tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Apex Identity",
    description="Authentication and session management API for Apex Portal",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS – allow the portal's dev server (and any other configured origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(users.router)


@app.get("/health", tags=["health"])
async def health():
    """Simple liveness probe."""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "apex_identity.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
