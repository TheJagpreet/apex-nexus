# CLAUDE.md — Apex Nexus

This file provides guidance to Claude Code when working in this monorepo.

## Project Overview

Multi-service RAG platform — five independently deployable services in one repo.

| Path | Language | Port | Responsibility |
|------|----------|------|----------------|
| `services/apex-rag` | Python 3.11+ | 8000 | Ingestion, chunking, embedding, vector search |
| `services/apex-identity` | Python 3.11+ | 8001 | JWT auth, users, sessions, messages (SQLite) |
| `services/apex-gateway` | Python 3.11+ | 8002 | Thin Ollama LLM wrapper |
| `services/apex-agents` | Python 3.11+ | 8003 | Agent registry + LangGraph execution + SSE |
| `apps/apex-portal` | React 18 + Vite | 5173 | Full-stack chat UI |
| `packages/apex-logging` | Python 3.11+ | — | Shared structured logging + OpenTelemetry (installed as path dep) |

## Commands

### Install all deps
```bash
make setup
```

### Start all services
```bash
make dev
```

### Run all tests
```bash
make test
```

### Per-service (from repo root)
```bash
make dev-rag / dev-identity / dev-gateway / dev-agents / dev-portal
make test-rag / test-identity / test-gateway / test-agents
make lint          # ruff + mypy on apex-identity, apex-gateway, apex-agents
```

### Manual per-service (from service directory)
```bash
# apex-rag
cd services/apex-rag && .venv/bin/python server.py

# apex-identity
cd services/apex-identity && .venv/bin/python -m apex_identity.main

# apex-gateway
cd services/apex-gateway && .venv/bin/python server.py

# apex-agents
cd services/apex-agents && .venv/bin/python server.py

# apex-portal
cd apps/apex-portal && npm run dev
```

## Architecture

```
apps/apex-portal
  → services/apex-identity   auth + session + message persistence
  → services/apex-rag        ingest + semantic search
  → services/apex-gateway    LLM generation
  → services/apex-agents     @mention agent runs (SSE)
       → services/apex-gateway  (internal LLM)
```

- **apex-rag** never calls an LLM — it is retrieval-only.
- **apex-gateway** assembles the RAG prompt from `{context, question}`.
- **apex-agents** uses LangGraph + ChatOllama; detects `<tool_call>` in streamed output.
- All Python services use FastAPI + uvicorn + SQLAlchemy (where applicable).
- Portal uses Vite env vars (`VITE_*`) — all API calls go through `apps/apex-portal/src/api/`.

## Code Quality

- **apex-identity, apex-gateway, apex-agents**: `ruff` (line-length 100) + `mypy --strict` — run before commits.
- **apex-rag**: no linter configured.
- **apex-portal**: no linter or test suite.

## Design System

UI decisions (colors, typography, spacing) → [docs/DESIGN.md](docs/DESIGN.md).
Every UI change must reference this file.

## Logging

All Python services use `packages/apex-logging` for structured logging. See [docs/LOGGING.md](docs/LOGGING.md) for field reference, JSON format, and OTel/Jaeger setup.

Key env vars (all services): `APEX_LOG_FORMAT` (console|json), `APEX_LOG_LEVEL`, `APEX_LOG_OTLP_ENDPOINT`.

## Per-Service Instructions

Each service has its own `CLAUDE.md` with service-specific guidance:
- `services/apex-rag/CLAUDE.md`
- `services/apex-identity/CLAUDE.md`
- `services/apex-gateway/CLAUDE.md`
- `services/apex-agents/CLAUDE.md`
- `apps/apex-portal/CLAUDE.md`
- `packages/apex-logging/CLAUDE.md`

## Environment

Each service reads its own `.env` file. All variables documented in root [`.env.example`](.env.example).

## Testing Conventions

- All Python tests: `pytest` with `asyncio_mode=auto`.
- `conftest.py` in apex-identity and apex-agents provides in-memory SQLite DB + async test client.
- No portal test suite currently.

## Docker

```bash
docker compose up          # start full stack
docker compose up --build  # rebuild images
```
Services connect via Docker network names (e.g., `http://apex-gateway:8002`).

## Adding a New Service

1. Create `services/<name>/` with `src/`, `tests/`, `pyproject.toml`, `server.py`, `.env.example`, `CLAUDE.md`
2. Add `setup-<name>`, `dev-<name>`, `test-<name>`, `lint-<name>` targets to `Makefile`
3. Add service to `docker-compose.yml`
4. Add service docs to `docs/api/<name>.md`
5. Add entry to this file and to `README.md`
