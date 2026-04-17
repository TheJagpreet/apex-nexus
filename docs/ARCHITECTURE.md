# Apex Nexus — Architecture

## Overview

Apex Nexus is a multi-service Retrieval-Augmented Generation (RAG) platform composed of five independently deployable services. Services communicate over HTTP; no shared memory or shared database.

## Service Responsibilities

### apex-rag (port 8000)
Pure retrieval pipeline. No LLM calls.
- Accepts file uploads → chunks → embeds → stores in ChromaDB
- Accepts search queries → embeds → semantic search → returns `{context, sources}`
- Supports multiple collections (virtual KB folders)
- Embedding backends: local (sentence-transformers) or Ollama
- Optional: hybrid search (BM25 + semantic RRF), cross-encoder reranking, embedding cache, deduplication

### apex-identity (port 8001)
Auth and persistence layer.
- JWT-based authentication with bcrypt password hashing
- User registration and login
- Chat session CRUD
- Message persistence (stores `role`, `content`, `sources` JSON, `files` JSON)
- Async FastAPI + SQLAlchemy on SQLite

### apex-gateway (port 8002)
Thin LLM wrapper.
- Receives `{question, context}` → assembles RAG prompt → calls Ollama → returns `{answer}`
- Keyword extraction endpoint for query refinement
- Stateless; all config via environment

### apex-agents (port 8003)
Agent execution engine.
- Stores agent configs in SQLite (id, name, system_prompt, tools, handoffs)
- 7 built-in agents seeded at startup
- Runs agents via LangGraph + ChatOllama (streaming)
- Detects `<tool_call>` tags in LLM output → dispatches tool → resumes
- Emits SSE events: `token`, `tool_use`, `handoff`, `done`, `error`
- Available tools: `llm_generate`, `rag_query`, `memory_read`, `memory_write`, `handoff`, `file_read`

### apex-portal (port 5173)
React 18 + Vite single-page application.
- Auth flow: login / signup → stores JWT in memory (AuthContext)
- Chat: create/switch sessions, send messages, receive streamed answers
- Knowledge Base tab: create collections, upload files with SSE progress
- Agents tab: browse/edit agents, configure tools + handoffs
- @mention in ChatBar → routes message through apex-agents SSE stream

## Request Flow

### Standard RAG chat message

```
User types message → ChatBar
  1. POST /sessions/{id}/messages  [apex-identity]  — save user message
  2. POST /query                    [apex-rag]        — retrieve context + sources
  3. POST /generate                 [apex-gateway]    — LLM answer from context
  4. POST /sessions/{id}/messages  [apex-identity]  — save assistant message
```

### @mention agent message

```
User types @AgentName + message → ChatBar
  1. POST /sessions/{id}/messages  [apex-identity]  — save user message
  2. POST /agents/{id}/run         [apex-agents]     — SSE stream
       ↳ apex-agents → apex-gateway (llm_generate tool)
       ↳ apex-agents → apex-rag     (rag_query tool)
       ↳ apex-agents → apex-agents  (handoff tool)
  3. POST /sessions/{id}/messages  [apex-identity]  — save agent response
```

### File upload (KB tab)

```
User selects file + collection → KnowledgeBasePage
  1. POST /collections/{name}/ingest  [apex-rag]  — SSE progress stream
       ↳ loading → chunking → embedding → storing → done
```

## Storage

| Service | Database | Location |
|---------|----------|----------|
| apex-rag | ChromaDB (vector store) | `services/apex-rag/chroma_db/` |
| apex-identity | SQLite | `services/apex-identity/apex_identity.db` |
| apex-agents | SQLite | `services/apex-agents/apex_agents.db` |
| apex-gateway | — | Stateless |
| apex-portal | — | Stateless (JWT in memory) |

In Docker, databases are stored in named volumes.

## Service Dependencies

```
apex-portal
  ├── apex-identity   (no upstream deps)
  ├── apex-rag        → ollama (optional, for embedding)
  ├── apex-gateway    → ollama
  └── apex-agents
        ├── apex-gateway
        ├── apex-rag
        └── ollama (direct, for LangGraph ChatOllama)
```

## Inter-Service URLs

In development (localhost), each service binds to its port directly.
In Docker Compose, services reference each other by service name:
- `http://apex-gateway:8002`
- `http://apex-rag:8000`
- `http://ollama:11434`

## Security Notes

- CORS configured per-service (`CORS_ORIGINS` env var)
- JWT tokens signed with `SECRET_KEY` — set to a strong random value in production
- apex-rag accepts all origins (`*`) — put behind a reverse proxy in production
- No HTTPS configured out of box — add nginx/Caddy in front for production
- `code_exec` tool in apex-agents is **disabled** by default (sandbox risk)

## Scaling Considerations

- apex-rag: stateless per-request after collection load; can scale horizontally if ChromaDB is on shared storage
- apex-identity: SQLite limits concurrent writers — migrate to PostgreSQL for multi-instance
- apex-gateway: fully stateless — scales horizontally freely
- apex-agents: SQLite for agent configs — low write frequency, scales fine for most use cases
- apex-portal: static SPA — serve from CDN
