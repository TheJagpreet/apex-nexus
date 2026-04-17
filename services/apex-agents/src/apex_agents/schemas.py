"""Pydantic request / response schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Agent schemas
# ---------------------------------------------------------------------------


class HandoffSchema(BaseModel):
    label: str
    agent_id: str
    prompt: str = ""


class AgentSummary(BaseModel):
    id: str
    name: str
    description: str
    color: str
    is_builtin: bool

    model_config = {"from_attributes": True}


class AgentDetail(BaseModel):
    id: str
    name: str
    description: str
    color: str
    system_prompt: str
    tools: list[str]
    handoffs: list[HandoffSchema]
    is_builtin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AgentCreate(BaseModel):
    id: str = Field(..., pattern=r"^[a-z0-9_-]+$", description="URL-safe slug")
    name: str = Field(..., min_length=1, max_length=100)
    description: str = ""
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")
    system_prompt: str = ""
    tools: list[str] = []
    handoffs: list[HandoffSchema] = []


class AgentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    system_prompt: str | None = None
    tools: list[str] | None = None
    handoffs: list[HandoffSchema] | None = None


# ---------------------------------------------------------------------------
# Tool schemas
# ---------------------------------------------------------------------------


class ToolInfo(BaseModel):
    """Describes a single tool — built-in or user-defined."""
    id: str
    name: str
    description: str
    enabled_by_default: bool = True
    is_builtin: bool = True
    # Empty string for built-in tools; Python source for custom tools.
    code: str = ""


class CustomToolCreate(BaseModel):
    id: str = Field(..., pattern=r"^[a-z0-9_-]+$", description="URL-safe slug")
    name: str = Field(..., min_length=1, max_length=100)
    description: str = ""
    code: str = ""


class CustomToolUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    code: str | None = None


class ToolTestRequest(BaseModel):
    """Test a snippet of tool code before saving it."""
    code: str
    input: dict = {}


class ToolTestResult(BaseModel):
    success: bool
    output: str
    error: str = ""


# ---------------------------------------------------------------------------
# Run / SSE schemas
# ---------------------------------------------------------------------------


class HistoryMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class RunRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: list[HistoryMessage] = []
    context: str = ""
    collection: str | None = None
    session_id: str | None = None
