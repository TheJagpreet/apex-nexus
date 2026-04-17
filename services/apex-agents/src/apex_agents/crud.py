"""Database CRUD helpers."""
from __future__ import annotations

from sqlalchemy.orm import Session

from .models import Agent, AgentMemory, CustomTool
from .schemas import AgentCreate, AgentUpdate, CustomToolCreate, CustomToolUpdate, HandoffSchema


# ---------------------------------------------------------------------------
# Agent CRUD
# ---------------------------------------------------------------------------


def list_agents(db: Session) -> list[Agent]:
    return db.query(Agent).order_by(Agent.created_at).all()


def get_agent(db: Session, agent_id: str) -> Agent | None:
    return db.query(Agent).filter(Agent.id == agent_id).first()


def create_agent(db: Session, data: AgentCreate) -> Agent:
    agent = Agent(
        id=data.id,
        name=data.name,
        description=data.description,
        color=data.color,
        system_prompt=data.system_prompt,
        is_builtin=False,
    )
    agent.tools = data.tools
    agent.handoffs = [h.model_dump() for h in data.handoffs]
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


def update_agent(db: Session, agent: Agent, data: AgentUpdate) -> Agent:
    if data.name is not None:
        agent.name = data.name
    if data.description is not None:
        agent.description = data.description
    if data.color is not None:
        agent.color = data.color
    if data.system_prompt is not None:
        agent.system_prompt = data.system_prompt
    if data.tools is not None:
        agent.tools = data.tools
    if data.handoffs is not None:
        agent.handoffs = [h.model_dump() for h in data.handoffs]
    db.commit()
    db.refresh(agent)
    return agent


def delete_agent(db: Session, agent: Agent) -> None:
    db.delete(agent)
    db.commit()


# ---------------------------------------------------------------------------
# Memory CRUD
# ---------------------------------------------------------------------------


def get_memory(db: Session, agent_id: str, key: str) -> str | None:
    row = (
        db.query(AgentMemory)
        .filter(AgentMemory.agent_id == agent_id, AgentMemory.key == key)
        .first()
    )
    return row.value if row else None


def set_memory(db: Session, agent_id: str, key: str, value: str) -> None:
    row = (
        db.query(AgentMemory)
        .filter(AgentMemory.agent_id == agent_id, AgentMemory.key == key)
        .first()
    )
    if row:
        row.value = value
    else:
        row = AgentMemory(agent_id=agent_id, key=key, value=value)
        db.add(row)
    db.commit()


# ---------------------------------------------------------------------------
# Custom Tool CRUD
# ---------------------------------------------------------------------------


def list_custom_tools(db: Session) -> list[CustomTool]:
    return db.query(CustomTool).order_by(CustomTool.created_at).all()


def get_custom_tool(db: Session, tool_id: str) -> CustomTool | None:
    return db.query(CustomTool).filter(CustomTool.id == tool_id).first()


def create_custom_tool(db: Session, data: CustomToolCreate) -> CustomTool:
    tool = CustomTool(
        id=data.id,
        name=data.name,
        description=data.description,
        code=data.code,
    )
    db.add(tool)
    db.commit()
    db.refresh(tool)
    return tool


def update_custom_tool(db: Session, tool: CustomTool, data: CustomToolUpdate) -> CustomTool:
    if data.name is not None:
        tool.name = data.name
    if data.description is not None:
        tool.description = data.description
    if data.code is not None:
        tool.code = data.code
    db.commit()
    db.refresh(tool)
    return tool


def delete_custom_tool(db: Session, tool: CustomTool) -> None:
    db.delete(tool)
    db.commit()
