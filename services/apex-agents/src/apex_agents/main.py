"""
Apex Agents — FastAPI application.

Endpoints:
  GET    /health                       — liveness check
  GET    /agents                       — list all agents
  POST   /agents                       — create a new agent
  GET    /agents/{agent_id}            — get agent detail
  PUT    /agents/{agent_id}            — update agent
  DELETE /agents/{agent_id}            — delete agent (builtin → 403)
  POST   /agents/{agent_id}/run        — run agent, returns SSE stream

  GET    /tools                        — list built-in + custom tools
  POST   /tools/test                   — test a tool code snippet (sandbox)
  POST   /tools                        — save a new custom tool
  GET    /tools/{tool_id}              — get custom tool detail
  PUT    /tools/{tool_id}              — update custom tool
  DELETE /tools/{tool_id}              — delete custom tool
"""
from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.orm import Session

from .config import settings
from .crud import (
    create_agent,
    create_custom_tool,
    delete_agent,
    delete_custom_tool,
    get_agent,
    get_custom_tool,
    list_agents,
    list_custom_tools,
    update_agent,
    update_custom_tool,
)
from .database import get_db, init_db
from .runner import BUILTIN_TOOLS, exec_custom_tool, run_agent_stream
from .schemas import (
    AgentCreate,
    AgentDetail,
    AgentSummary,
    AgentUpdate,
    CustomToolCreate,
    CustomToolUpdate,
    RunRequest,
    ToolInfo,
    ToolTestRequest,
    ToolTestResult,
)
from .seed import seed_builtin_agents

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = next(get_db())
    try:
        seed_builtin_agents(db)
    finally:
        db.close()
    logger.info("apex-agents ready on port %d", settings.port)
    yield


app = FastAPI(
    title="Apex Agents API",
    description="Agent registry and execution service for the Apex platform.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


@app.get("/health", tags=["meta"])
def health(db: Session = Depends(get_db)) -> dict:
    from .models import Agent
    count = db.query(Agent).count()
    return {"status": "ok", "agents_count": count}


# ---------------------------------------------------------------------------
# Agents CRUD
# ---------------------------------------------------------------------------


@app.get("/agents", response_model=list[AgentSummary], tags=["agents"])
def get_agents(db: Session = Depends(get_db)) -> list[AgentSummary]:
    return list_agents(db)  # type: ignore[return-value]


@app.post("/agents", response_model=AgentDetail, status_code=201, tags=["agents"])
def post_agent(data: AgentCreate, db: Session = Depends(get_db)) -> AgentDetail:
    if get_agent(db, data.id):
        raise HTTPException(status_code=409, detail=f"Agent '{data.id}' already exists.")
    agent = create_agent(db, data)
    return _agent_to_detail(agent)


@app.get("/agents/{agent_id}", response_model=AgentDetail, tags=["agents"])
def get_agent_by_id(agent_id: str, db: Session = Depends(get_db)) -> AgentDetail:
    agent = get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found.")
    return _agent_to_detail(agent)


@app.put("/agents/{agent_id}", response_model=AgentDetail, tags=["agents"])
def put_agent(agent_id: str, data: AgentUpdate, db: Session = Depends(get_db)) -> AgentDetail:
    agent = get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found.")
    agent = update_agent(db, agent, data)
    return _agent_to_detail(agent)


@app.delete("/agents/{agent_id}", tags=["agents"])
def delete_agent_by_id(agent_id: str, db: Session = Depends(get_db)) -> dict:
    agent = get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found.")
    if agent.is_builtin:
        raise HTTPException(
            status_code=403,
            detail=f"Built-in agent '{agent_id}' cannot be deleted.",
        )
    delete_agent(db, agent)
    return {"deleted": agent_id}


# ---------------------------------------------------------------------------
# Agent run — SSE
# ---------------------------------------------------------------------------


@app.post("/agents/{agent_id}/run", tags=["agents"])
async def run_agent(
    agent_id: str,
    req: RunRequest,
    db: Session = Depends(get_db),
) -> EventSourceResponse:
    """Run an agent and stream the response as Server-Sent Events."""
    agent = get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found.")

    async def generate():
        try:
            async for event in run_agent_stream(agent, req, db, settings):
                yield {"data": json.dumps(event)}
        except Exception as exc:
            logger.exception("run_agent_stream raised unexpectedly")
            yield {"data": json.dumps({"type": "error", "detail": str(exc)})}

    return EventSourceResponse(generate())


# ---------------------------------------------------------------------------
# Tools — list (built-in + custom)
# ---------------------------------------------------------------------------


@app.get("/tools", response_model=list[ToolInfo], tags=["tools"])
def get_tools(db: Session = Depends(get_db)) -> list[ToolInfo]:
    result: list[ToolInfo] = [
        ToolInfo(
            id=tid,
            name=info["name"],
            description=info["description"],
            enabled_by_default=info["enabled_by_default"],
            is_builtin=True,
            code="",
        )
        for tid, info in BUILTIN_TOOLS.items()
    ]
    for ct in list_custom_tools(db):
        result.append(
            ToolInfo(
                id=ct.id,
                name=ct.name,
                description=ct.description,
                enabled_by_default=True,
                is_builtin=False,
                code=ct.code,
            )
        )
    return result


# ---------------------------------------------------------------------------
# Tools — test sandbox  (must come BEFORE /tools/{tool_id} to avoid clash)
# ---------------------------------------------------------------------------


@app.post("/tools/test", response_model=ToolTestResult, tags=["tools"])
async def test_tool(req: ToolTestRequest) -> ToolTestResult:
    """
    Execute a tool code snippet in a sandbox and return the result.
    The code must define a function:  def run(input: dict) -> str
    """
    output = await exec_custom_tool(req.code, req.input)
    success = not output.startswith("[error") and not output.startswith("[compilation") and not output.startswith("[runtime")
    return ToolTestResult(
        success=success,
        output=output if success else "",
        error=output if not success else "",
    )


# ---------------------------------------------------------------------------
# Tools — custom tool CRUD
# ---------------------------------------------------------------------------


@app.post("/tools", response_model=ToolInfo, status_code=201, tags=["tools"])
def create_tool(data: CustomToolCreate, db: Session = Depends(get_db)) -> ToolInfo:
    if data.id in BUILTIN_TOOLS:
        raise HTTPException(status_code=409, detail=f"'{data.id}' is a built-in tool id.")
    if get_custom_tool(db, data.id):
        raise HTTPException(status_code=409, detail=f"Tool '{data.id}' already exists.")
    tool = create_custom_tool(db, data)
    return _custom_tool_to_info(tool)


@app.get("/tools/{tool_id}", response_model=ToolInfo, tags=["tools"])
def get_tool_by_id(tool_id: str, db: Session = Depends(get_db)) -> ToolInfo:
    if tool_id in BUILTIN_TOOLS:
        info = BUILTIN_TOOLS[tool_id]
        return ToolInfo(
            id=tool_id,
            name=info["name"],
            description=info["description"],
            enabled_by_default=info["enabled_by_default"],
            is_builtin=True,
            code="",
        )
    tool = get_custom_tool(db, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found.")
    return _custom_tool_to_info(tool)


@app.put("/tools/{tool_id}", response_model=ToolInfo, tags=["tools"])
def put_tool(tool_id: str, data: CustomToolUpdate, db: Session = Depends(get_db)) -> ToolInfo:
    if tool_id in BUILTIN_TOOLS:
        raise HTTPException(status_code=403, detail="Built-in tools cannot be modified.")
    tool = get_custom_tool(db, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found.")
    tool = update_custom_tool(db, tool, data)
    return _custom_tool_to_info(tool)


@app.delete("/tools/{tool_id}", tags=["tools"])
def delete_tool_by_id(tool_id: str, db: Session = Depends(get_db)) -> dict:
    if tool_id in BUILTIN_TOOLS:
        raise HTTPException(status_code=403, detail="Built-in tools cannot be deleted.")
    tool = get_custom_tool(db, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found.")
    delete_custom_tool(db, tool)
    return {"deleted": tool_id}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _agent_to_detail(agent) -> AgentDetail:  # type: ignore[return]
    from .schemas import HandoffSchema
    return AgentDetail(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        color=agent.color,
        system_prompt=agent.system_prompt,
        tools=agent.tools,
        handoffs=[HandoffSchema(**h) for h in agent.handoffs],
        is_builtin=agent.is_builtin,
        created_at=agent.created_at,
    )


def _custom_tool_to_info(tool) -> ToolInfo:  # type: ignore[return]
    return ToolInfo(
        id=tool.id,
        name=tool.name,
        description=tool.description,
        enabled_by_default=True,
        is_builtin=False,
        code=tool.code,
    )
