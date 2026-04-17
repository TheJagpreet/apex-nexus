# API Reference — apex-agents (port 8003)

Agent registry and LangGraph execution service.

## GET /health

**Response** `200`
```json
{ "status": "ok" }
```

---

## Agents

### GET /agents

List all agents (built-in + custom).

**Response** `200`
```json
[
  {
    "id": "orchestrator",
    "name": "Orchestrator",
    "description": "Routes tasks to the right specialist agent",
    "color": "#007aff",
    "is_builtin": true
  }
]
```

---

### POST /agents

Create a custom agent.

**Body**
```json
{
  "id": "my-researcher",
  "name": "My Researcher",
  "description": "Researches topics using RAG",
  "color": "#30d158",
  "system_prompt": "You are a research assistant. Use the rag_query tool to find relevant information.",
  "tools": ["rag_query", "llm_generate"],
  "handoffs": []
}
```

**Response** `201` — created agent object.

**Errors**: `409` if id already exists.

---

### GET /agents/{id}

Get full agent detail.

**Response** `200`
```json
{
  "id": "orchestrator",
  "name": "Orchestrator",
  "description": "Routes tasks to the right specialist agent",
  "color": "#007aff",
  "system_prompt": "You are an orchestrator...",
  "tools": ["handoff"],
  "handoffs": ["planner", "architect", "solutioner"],
  "is_builtin": true
}
```

---

### PUT /agents/{id}

Update an agent. Built-in agents can be updated (system_prompt, tools, handoffs).

**Body** (all fields optional)
```json
{
  "name": "Updated name",
  "description": "...",
  "color": "#ff9f0a",
  "system_prompt": "...",
  "tools": ["rag_query"],
  "handoffs": ["planner"]
}
```

**Response** `200` — updated agent.

---

### DELETE /agents/{id}

Delete a custom agent. Built-in agents cannot be deleted.

**Response** `204`

**Errors**: `403` if built-in, `404` if not found.

---

## Tools

### GET /tools

List all available tools.

**Response** `200`
```json
[
  {
    "id": "rag_query",
    "name": "RAG Query",
    "description": "Search the knowledge base for relevant information",
    "is_builtin": true
  },
  {
    "id": "llm_generate",
    "name": "LLM Generate",
    "description": "Generate text using the LLM",
    "is_builtin": true
  }
]
```

### Built-in Tools

| Tool | Description | Calls |
|------|-------------|-------|
| `llm_generate` | Generate text via LLM | → apex-gateway |
| `rag_query` | Search knowledge base | → apex-rag |
| `memory_read` | Read from agent memory | local |
| `memory_write` | Write to agent memory | local |
| `handoff` | Transfer to another agent | → self (new agent) |
| `file_read` | Read a local file | local |
| `code_exec` | Execute Python code | **disabled by default** |

---

## Agent Run (SSE)

### POST /agents/{id}/run

Run an agent and receive streamed SSE events.

**Body**
```json
{
  "message": "Explain the architecture of this system",
  "session_id": "optional-session-uuid",
  "context": {}
}
```

**Response** `200` — `text/event-stream`

SSE event shapes:
```
data: {"type": "token",    "content": "The system is..."}
data: {"type": "tool_use", "tool": "rag_query", "input": {"query": "architecture"}}
data: {"type": "handoff",  "to": "architect", "prompt": "Explain..."}
data: {"type": "done",     "answer": "The full answer..."}
data: {"type": "error",    "detail": "Something went wrong"}
```

**Consuming in JavaScript:**
```javascript
import { runAgent } from './src/api/agents.js'

for await (const event of runAgent('orchestrator', { message: 'hello' })) {
  if (event.type === 'token')    appendToken(event.content)
  if (event.type === 'tool_use') showToolUse(event.tool)
  if (event.type === 'done')     finalize(event.answer)
  if (event.type === 'error')    showError(event.detail)
}
```

---

## Built-in Agents

| ID | Name | Role |
|----|------|------|
| `orchestrator` | Orchestrator | Routes tasks, coordinates multi-agent flows |
| `planner` | Planner | Creates structured plans from high-level goals |
| `architect` | Architect | System design, technical architecture |
| `solutioner` | Solutioner | Implements solutions from plans |
| `tester` | Tester | Test strategy, QA, validation |
| `maintenance` | Maintenance | Debugging, monitoring, reliability |
| `skill-creator` | Skill Creator | Creates new agent skills and tools |
