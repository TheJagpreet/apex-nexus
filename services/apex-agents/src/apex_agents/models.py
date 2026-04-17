"""SQLAlchemy ORM models."""
from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    color: Mapped[str] = mapped_column(String(20), default="#6366f1")
    system_prompt: Mapped[str] = mapped_column(Text, default="")
    _tools: Mapped[str] = mapped_column("tools", Text, default="[]")
    _handoffs: Mapped[str] = mapped_column("handoffs", Text, default="[]")
    is_builtin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    memories: Mapped[list[AgentMemory]] = relationship(
        "AgentMemory", back_populates="agent", cascade="all, delete-orphan"
    )

    @property
    def tools(self) -> list[str]:
        return json.loads(self._tools)

    @tools.setter
    def tools(self, value: list[str]) -> None:
        self._tools = json.dumps(value)

    @property
    def handoffs(self) -> list[dict]:
        return json.loads(self._handoffs)

    @handoffs.setter
    def handoffs(self, value: list[dict]) -> None:
        self._handoffs = json.dumps(value)


class AgentMemory(Base):
    __tablename__ = "agent_memory"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_id: Mapped[str] = mapped_column(String, ForeignKey("agents.id", ondelete="CASCADE"))
    key: Mapped[str] = mapped_column(String, nullable=False)
    value: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )

    agent: Mapped[Agent] = relationship("Agent", back_populates="memories")


class CustomTool(Base):
    """User-defined tools stored as Python source code."""
    __tablename__ = "custom_tools"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # slug e.g. "my-tool"
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    code: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
