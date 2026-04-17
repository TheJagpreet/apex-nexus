"""Pydantic schemas for request / response validation."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

# ── Auth ──────────────────────────────────────────────────────────


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    display_name: str | None = Field(None, max_length=200)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    display_name: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Chat Sessions ────────────────────────────────────────────────


class SessionCreate(BaseModel):
    title: str = Field("New conversation", max_length=300)


class SessionUpdate(BaseModel):
    title: str = Field(..., max_length=300)


class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    model_config = {"from_attributes": True}


class SessionDetailResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[MessageResponse]

    model_config = {"from_attributes": True}


# ── Messages ─────────────────────────────────────────────────────


class MessageCreate(BaseModel):
    role: str = Field(..., pattern=r"^(user|assistant|system|error)$")
    content: str
    sources: list[dict] | dict | None = None
    files: list[str] | None = None


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    sources: list[dict] | dict | None = None
    files: list[str] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── User Preferences ────────────────────────────────────────────


class PreferenceSet(BaseModel):
    key: str = Field(..., max_length=100)
    value: str


class PreferenceResponse(BaseModel):
    key: str
    value: str

    model_config = {"from_attributes": True}
