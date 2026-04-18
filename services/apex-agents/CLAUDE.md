# CLAUDE.md — apex-agents

Agent registry and LangGraph execution engine. Manages agent configs in SQLite, runs them with tool dispatch and SSE streaming.

## Commands

```bash
# From this directory (services/apex-agents/)
uv venv .venv --python 3.11
source .venv/bin/activate
uv pip install -e ".[dev]"

python server.py               # port 8003
pytest tests/
ruff check src/
mypy src/
```

Or from repo root: `make dev-agents` / `make test-agents` / `make lint-agents`

## Architecture

- **Storage**: `agents` and `custom_tools` tables — id, name, description, color, system_prompt, tools (JSON), handoffs (JSON), is_builtin
- **Seed**: 5 built-in agents seeded on startup (Research Assistant, Q&A Expert, Writing Assistant, Data Analyst, Support Agent)
- **Runner** (`runner.py`): ChatOllama streaming → `<tool_call>` detection → tool dispatch → SSE events
- **Built-in Tools** (enabled per-agent): `rag_query`, `llm_generate`, `memory_read`, `memory_write`, `handoff`, `file_read`, `code_exec`, `web_fetch`, `web_search`
- **Custom Tools**: User-defined Python functions stored in SQLite, executed in a sandboxed thread pool

## Key Files

- `src/apex_agents/main.py` — FastAPI app, routes
- `src/apex_agents/runner.py` — LangGraph execution, SSE event emission
- `src/apex_agents/seed.py` — Built-in agent definitions
- `src/apex_agents/crud.py` — DB CRUD operations
- `src/apex_agents/models.py` — SQLAlchemy ORM models
- `src/apex_agents/schemas.py` — Pydantic schemas
- `src/apex_agents/config.py` — Settings

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness |
| GET | `/agents` | List agents (summary) |
| POST | `/agents` | Create agent |
| GET | `/agents/{id}` | Get agent detail |
| PUT | `/agents/{id}` | Update agent |
| DELETE | `/agents/{id}` | Delete agent (custom only, 403 for built-ins) |
| POST | `/agents/{id}/run` | Run agent — SSE stream |
| GET | `/tools` | List built-in + custom tools |
| POST | `/tools/test` | Sandbox-test a custom tool code snippet |
| POST | `/tools` | Save a new custom tool |
| GET | `/tools/{id}` | Get tool detail |
| PUT | `/tools/{id}` | Update custom tool |
| DELETE | `/tools/{id}` | Delete custom tool |

## SSE Event Format

```json
{ "type": "token",    "content": "..." }
{ "type": "tool_use", "tool": "...", "input": {} }
{ "type": "handoff",  "to": "...", "prompt": "..." }
{ "type": "done",     "answer": "..." }
{ "type": "error",    "detail": "..." }
```

## Testing

`tests/conftest.py` provides in-memory SQLite + async test client.

## Code Quality

`ruff` (line-length 100) + `mypy --strict`. Run both before committing.
