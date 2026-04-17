# apex-agents

Agent registry and execution service for the Apex platform. Stores agent configurations in SQLite, runs them via ChatOllama with SSE streaming, and exposes a tool playground for user-defined Python tools.

## Responsibilities

- **Agent registry** — CRUD for agent configs (name, color, system prompt, tools, handoffs) stored in SQLite
- **Built-in agents** — 5 practical web-platform agents seeded on startup (see table below)
- **Custom tools** — Users can write Python tool functions, test them in a sandbox, and save them to the registry
- **Runner** — Executes agents via ChatOllama; detects `<tool_call>` blocks, dispatches tools, loops up to 5 hops
- **SSE streaming** — `POST /agents/{id}/run` streams `token | tool_use | handoff | done | error` events

## Setup

```bash
cd apex-agents
uv venv .venv --python 3.11
source .venv/bin/activate   # Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"
```

Requires [Ollama](https://ollama.com/) running locally with the configured model:

```bash
ollama pull gemma4:e2b
ollama serve
```

Requires **apex-gateway** (port 8002) running for LLM calls. **apex-rag** (port 8000) is optional but needed for `rag_query` tool calls.

## Configuration

`.env` (copy from `.env.example`):

```
APEX_AGENTS_HOST=0.0.0.0
APEX_AGENTS_PORT=8003
APEX_AGENTS_DB_URL=sqlite:///./apex_agents.db
APEX_AGENTS_GATEWAY_URL=http://localhost:8002
APEX_AGENTS_RAG_URL=http://localhost:8000
APEX_AGENTS_OLLAMA_HOST=http://localhost:11434
APEX_AGENTS_OLLAMA_MODEL=gemma4:e2b
APEX_AGENTS_CORS_ORIGINS=http://localhost:5173
```

## Run

```bash
python server.py
# starts on port 8003
```

On first startup the database is created and the 5 built-in agents are seeded. On subsequent startups any stale built-ins (from old versions) are automatically removed.

## API

### `GET /health`
```json
{"status": "ok", "agents_count": 5}
```

### `GET /agents`
Returns `AgentSummary[]` — id, name, description, color, is_builtin.

### `GET /agents/{id}`
Returns full `AgentDetail` including system_prompt, tools, handoffs.

### `POST /agents`
Create a custom agent:
```json
{
  "id": "my-agent",
  "name": "My Agent",
  "description": "Does something useful",
  "color": "#10b981",
  "system_prompt": "You are...",
  "tools": ["rag_query", "memory_read"],
  "handoffs": []
}
```

### `PUT /agents/{id}`
Partial update — any fields from `AgentUpdate`. Built-in agents can be updated (system_prompt, tools, etc.) but not deleted.

### `DELETE /agents/{id}`
Deletes a custom agent. Returns `403` for built-in agents.

### `GET /tools`
Lists all available tool IDs — built-in and custom — with name, description, is_builtin, and code (empty for built-ins).

### `POST /tools`
Save a new custom tool:
```json
{
  "id": "my-tool",
  "name": "My Tool",
  "description": "What the agent should use this for",
  "code": "def run(input: dict) -> str:\n    return str(input)"
}
```

### `PUT /tools/{id}` / `DELETE /tools/{id}`
Update or delete a custom tool. Built-in tools return `403`.

### `POST /tools/test`
Test a tool code snippet in a sandbox before saving:
```json
{"code": "def run(input):\n    return input['x'] * 2", "input": {"x": 21}}
```
Returns `{"success": true, "output": "42", "error": ""}`.

### `POST /agents/{id}/run`
Runs an agent and streams the response as Server-Sent Events.

**Request:**
```json
{
  "message": "Summarise the Q3 financials",
  "history": [],
  "context": "optional RAG context string",
  "session_id": "optional"
}
```

**SSE event stream:**
```
data: {"type": "token",    "content": "Here"}
data: {"type": "tool_use", "tool": "rag_query", "input": {"query": "Q3 financials"}}
data: {"type": "done",     "answer": "Full accumulated response"}
```

## Built-in Agents

| Agent | ID | Color | Tools | Purpose |
|---|---|---|---|---|
| Research Assistant | `research-assistant` | `#3b82f6` | rag_query, memory | Multi-query KB search, cited synthesis |
| Q&A Expert | `qa-expert` | `#10b981` | rag_query, memory_read | Strict factual KB answers, no speculation |
| Writing Assistant | `writing-assistant` | `#8b5cf6` | rag_query, memory_read | Drafts emails, reports, docs |
| Data Analyst | `data-analyst` | `#06b6d4` | code_exec, memory | Python calculations, data interpretation |
| Support Agent | `support-agent` | `#f59e0b` | rag_query, memory_read | Empathetic customer support, KB-driven |

## Built-in Tools

| Tool ID | Description | Default |
|---|---|---|
| `rag_query` | Search the knowledge base | on |
| `memory_read` | Read agent's persistent memory | on |
| `memory_write` | Write to agent's persistent memory | on |
| `handoff` | Delegate to another agent | on |
| `code_exec` | Run a Python snippet, capture stdout | off |
| `web_fetch` | Fetch and strip a public URL to plain text | off |

## Custom Tool Format

Tools must define a plain `def run(input: dict) -> str:` function. Use the portal's **Tools** tab to write, test, and save them.

```python
def run(input: dict) -> str:
    # input contains whatever the LLM passed based on your description.
    # Return a plain string — the agent sees this as the tool result.
    query = input.get("query", "")
    return f"Result for: {query}"
```

## Tool Calling

Agents declare tool calls using an XML marker:

```
<tool_call>{"tool": "rag_query", "input": {"query": "quarterly report"}}</tool_call>
```

The runner detects these, executes the tools, feeds results back as HumanMessages, and loops (max 5 hops).

## Tests

```bash
pytest tests/
```

Tests use an in-memory SQLite database — no running services required.

## Project Layout

```
src/apex_agents/
  config.py      — pydantic-settings (APEX_AGENTS_* env vars)
  database.py    — SQLAlchemy engine + session factory
  models.py      — Agent, AgentMemory, CustomTool ORM models
  schemas.py     — Pydantic request/response schemas
  crud.py        — CRUD helpers for agents, memory, custom tools
  seed.py        — 5 built-in agent definitions + sync-on-startup logic
  runner.py      — ChatOllama execution engine + tool dispatch + SSE streaming
  main.py        — FastAPI app, all routes, lifespan startup
tests/
  conftest.py    — in-memory DB fixture + test client
  test_agents.py — API tests for all endpoints
```
