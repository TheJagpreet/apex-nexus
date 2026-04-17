# Apex Nexus

[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![Node 20+](https://img.shields.io/badge/node-20%2B-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

A production-grade, multi-service **Retrieval-Augmented Generation (RAG)** platform.  
Five independently deployable microservices, unified in one monorepo, runnable locally via `uv` + `npm` or containerised with Docker Compose.

---

## Demo

<video src="https://github.com/user-attachments/assets/aa695321-606d-4f51-9a2f-5fc8b6714a47" controls width="100%"></video>

---

## Table of Contents

- [Demo](#demo)
- [Architecture](#architecture)
- [Services](#services)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
  - [Unix / macOS / Git Bash](#unix--macos--git-bash)
  - [Windows (PowerShell)](#windows-powershell)
- [Docker](#docker)
- [Development](#development)
- [Testing](#testing)
- [Configuration](#configuration)
- [Project Layout](#project-layout)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Architecture

```
User
 └── apps/apex-portal  (React 18 + Vite  :5173)
        │
        ├── services/apex-identity   Auth · JWT · sessions · message store  (:8001)
        ├── services/apex-rag        Ingest · chunk · embed · hybrid search  (:8000)
        ├── services/apex-gateway    LLM generation via Ollama               (:8002)
        └── services/apex-agents     LangGraph agent runs · SSE streaming    (:8003)
                 └── services/apex-gateway  (internal LLM calls)
```

- **apex-rag** is retrieval-only — it never calls an LLM directly.
- **apex-gateway** assembles the RAG prompt from `{context, question}` and streams tokens.
- **apex-agents** detects `@mention` triggers, runs LangGraph graphs, and emits SSE events.
- All Python services use **FastAPI + uvicorn**; state is persisted in SQLite (identity, agents) and ChromaDB (vectors).

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full deep-dive, and [docs/DATA_FLOW.md](docs/DATA_FLOW.md) for the end-to-end request lifecycle.

---

## Services

| Service | Language | Port | Responsibility |
|---------|----------|------|----------------|
| [`services/apex-rag`](services/apex-rag/) | Python 3.11+ | 8000 | Ingestion, chunking, embedding, BM25 + semantic hybrid search, reranking |
| [`services/apex-identity`](services/apex-identity/) | Python 3.11+ | 8001 | JWT auth, user management, sessions, message persistence (SQLite + Alembic) |
| [`services/apex-gateway`](services/apex-gateway/) | Python 3.11+ | 8002 | Thin Ollama LLM wrapper — streaming + non-streaming generation |
| [`services/apex-agents`](services/apex-agents/) | Python 3.11+ | 8003 | Agent registry, LangGraph execution engine, SSE token streaming |
| [`apps/apex-portal`](apps/apex-portal/) | React 18 + Vite | 5173 | Full-stack chat UI — auth, sessions, knowledge base, @mention agents |

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| [uv](https://docs.astral.sh/uv/) | ≥ 0.4 | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| [Node.js](https://nodejs.org/) | 20+ | [nodejs.org](https://nodejs.org/) |
| [Ollama](https://ollama.ai/) | latest | [ollama.ai](https://ollama.ai/) |
| Python | 3.11+ (all services) | managed by `uv` |
| make | any | Git Bash / WSL / `winget install GnuWin32.Make` |

```bash
# Pull the required Ollama models before starting services
ollama pull gemma4:e2b
ollama pull nomic-embed-text
```

> **Windows users:** `make` targets work in Git Bash or WSL.  
> For native PowerShell, use the `scripts/*.ps1` equivalents listed below.

---

## Quick Start

### Unix / macOS / Git Bash

```bash
# 1. Clone
git clone https://github.com/TheJagpreet/apex-nexus.git
cd apex-nexus

# 2. Install all dependencies
make setup

# 3. Configure environment
cp services/apex-rag/.env.example       services/apex-rag/.env
cp services/apex-identity/.env.example  services/apex-identity/.env
cp services/apex-gateway/.env.example   services/apex-gateway/.env
cp services/apex-agents/.env.example    services/apex-agents/.env
cp apps/apex-portal/.env.example        apps/apex-portal/.env
# Edit services/apex-identity/.env and set a strong SECRET_KEY

# 4. Start all services
make dev

# 5. Open
open http://localhost:5173
```

### Windows (PowerShell)

```powershell
# 1. Clone
git clone https://github.com/TheJagpreet/apex-nexus.git
cd apex-nexus

# 2. Install all dependencies
.\scripts\setup.ps1

# 3. Configure environment (repeat for each service)
Copy-Item services\apex-rag\.env.example      services\apex-rag\.env
Copy-Item services\apex-identity\.env.example services\apex-identity\.env
Copy-Item services\apex-gateway\.env.example  services\apex-gateway\.env
Copy-Item services\apex-agents\.env.example   services\apex-agents\.env
Copy-Item apps\apex-portal\.env.example       apps\apex-portal\.env
# Edit services\apex-identity\.env and set a strong SECRET_KEY

# 4. Start all services
.\scripts\dev.ps1

# 5. Open http://localhost:5173 in your browser
```

---

## Docker

The full stack can be started with a single command — no local Python or Node install required.

```bash
# Start (pulls images on first run)
docker compose up

# Rebuild images after code changes
docker compose up --build

# Stop and remove containers
docker compose down
```

> Set `SECRET_KEY` in your environment or a root `.env` file before running Docker.  
> All other variables have sensible defaults — see [`.env.example`](.env.example).

---

## Development

**Unix / Git Bash**

```bash
make setup       # Install all deps (runs once per clone)
make dev         # Start all 5 services in parallel
make build       # Production build of apex-portal
make clean       # Remove venvs, node_modules, build artefacts, caches
make lint        # ruff + mypy on apex-identity, apex-gateway, apex-agents
```

Start a single service:

```bash
make dev-rag        # apex-rag       :8000
make dev-identity   # apex-identity  :8001
make dev-gateway    # apex-gateway   :8002
make dev-agents     # apex-agents    :8003
make dev-portal     # apex-portal    :5173
```

**Windows (PowerShell)**

```powershell
.\scripts\setup.ps1          # Install all deps
.\scripts\dev.ps1            # Start all 5 services in parallel
.\scripts\build.ps1          # Production build of apex-portal
.\scripts\clean.ps1          # Remove venvs, node_modules, build artefacts, caches
.\scripts\lint.ps1           # ruff + mypy on apex-identity, apex-gateway, apex-agents
```

Start a single service:

```powershell
.\scripts\dev.ps1 -Service rag        # apex-rag       :8000
.\scripts\dev.ps1 -Service identity   # apex-identity  :8001
.\scripts\dev.ps1 -Service gateway    # apex-gateway   :8002
.\scripts\dev.ps1 -Service agents     # apex-agents    :8003
.\scripts\dev.ps1 -Service portal     # apex-portal    :5173
```

Lint a single service:

```powershell
.\scripts\lint.ps1 -Service identity
.\scripts\lint.ps1 -Service gateway
.\scripts\lint.ps1 -Service agents
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for per-service workflows, migration commands, and IDE setup.

---

## Testing

**Unix / Git Bash**

```bash
make test              # All suites
make test-rag          # apex-rag only
make test-identity     # apex-identity only
make test-gateway      # apex-gateway only
make test-agents       # apex-agents only
```

**Windows (PowerShell)**

```powershell
.\scripts\test-all.ps1                      # All suites
.\scripts\test-all.ps1 -Service rag         # apex-rag only
.\scripts\test-all.ps1 -Service identity    # apex-identity only
.\scripts\test-all.ps1 -Service gateway     # apex-gateway only
.\scripts\test-all.ps1 -Service agents      # apex-agents only
```

All Python tests use `pytest` with `asyncio_mode = "auto"`.  
`conftest.py` in apex-identity and apex-agents provides an in-memory SQLite database and async HTTPX test client — no external services required.

---

## Configuration

Each service reads its own `.env` file.  
The root [`.env.example`](.env.example) documents **every** variable across all services with descriptions and defaults.

Key variables to set before first run:

| Variable | Service | Description |
|----------|---------|-------------|
| `SECRET_KEY` | apex-identity | JWT signing key — generate with `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `APEX_RAG_EMBED_BACKEND` | apex-rag | `ollama` (default) or `local` (sentence-transformers) |
| `APEX_GW_OLLAMA_MODEL` | apex-gateway | Ollama model name, e.g. `gemma4:e2b` |
| `APEX_AGENTS_OLLAMA_MODEL` | apex-agents | Ollama model for agent runs |

---

## Project Layout

```
apex-nexus/
├── apps/
│   └── apex-portal/            React 18 + Vite chat UI
├── services/
│   ├── apex-rag/               RAG pipeline — ChromaDB, BM25, reranking
│   ├── apex-identity/          FastAPI auth — SQLite, Alembic, JWT
│   ├── apex-gateway/           Thin Ollama wrapper — streaming LLM
│   └── apex-agents/            LangGraph agent runner — SSE streaming
├── docs/                       Architecture, design system, API references
│   └── api/                    Per-service OpenAPI summaries
├── scripts/
│   ├── setup.sh    / setup.ps1      Install all deps
│   ├── dev.sh      / dev.ps1        Start all (or one) service(s)
│   ├── test-all.sh / test-all.ps1   Run all (or one) test suite(s)
│   ├── lint.ps1                     ruff + mypy (PowerShell)
│   ├── build.ps1                    Production portal build (PowerShell)
│   └── clean.ps1                    Remove artefacts (PowerShell)
├── .gitattributes              Cross-platform line-ending config
├── docker-compose.yml          Full-stack container orchestration
├── Makefile                    Developer convenience targets
├── .env.example                All environment variables documented
└── CLAUDE.md                   Claude Code instructions for this repo
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Service responsibilities, storage, data flow |
| [docs/DATA_FLOW.md](docs/DATA_FLOW.md) | End-to-end request lifecycle |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Per-service setup, migrations, IDE config |
| [docs/DESIGN.md](docs/DESIGN.md) | UI design system — colours, typography, spacing |
| [docs/api/rag.md](docs/api/rag.md) | apex-rag API reference |
| [docs/api/identity.md](docs/api/identity.md) | apex-identity API reference |
| [docs/api/gateway.md](docs/api/gateway.md) | apex-gateway API reference |
| [docs/api/agents.md](docs/api/agents.md) | apex-agents API reference |

---

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository and create a feature branch from `main`.
2. Run `make setup` to install all dependencies.
3. Make your changes; add or update tests as appropriate.
4. Run `make lint` and `make test` — both must pass before opening a PR.
5. Open a pull request with a clear description of the change and its motivation.

For significant changes, open an issue first to discuss the approach.

### Code style

- **Python**: `ruff` (line-length 100) + `mypy --strict` on apex-identity, apex-gateway, apex-agents. Run `make lint`.
- **JavaScript/React**: no linter configured yet — PRs adding ESLint + Prettier are welcome.
- Commit messages: imperative mood, present tense (`Add`, `Fix`, `Refactor`).

---

## License

[MIT](LICENSE) © TheJagpreet
