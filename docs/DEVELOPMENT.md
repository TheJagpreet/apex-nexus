# Development Guide — Apex Nexus

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| [uv](https://docs.astral.sh/uv/) | latest | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Node.js | 20+ | https://nodejs.org |
| Ollama | latest | https://ollama.ai |
| Python | 3.10+ (rag), 3.11+ (others) | via uv |

```bash
# Pull required Ollama models before first run
ollama pull llama3
ollama pull nomic-embed-text
```

## First-Time Setup

```bash
# Install all dependencies
make setup

# Copy env files for each service
cp services/apex-rag/.env.example       services/apex-rag/.env
cp services/apex-identity/.env.example  services/apex-identity/.env
cp services/apex-gateway/.env.example   services/apex-gateway/.env
cp services/apex-agents/.env.example    services/apex-agents/.env
cp apps/apex-portal/.env.example        apps/apex-portal/.env

# IMPORTANT: generate a real secret key for apex-identity
python -c "import secrets; print(secrets.token_urlsafe(64))"
# → paste into services/apex-identity/.env as SECRET_KEY
```

## Start All Services

```bash
make dev
```

This starts all 5 services in parallel. Or start individually:

```bash
make dev-rag        # :8000
make dev-identity   # :8001
make dev-gateway    # :8002
make dev-agents     # :8003
make dev-portal     # :5173
```

## Per-Service Development

### apex-rag

```bash
cd services/apex-rag
uv venv .venv --python 3.10
source .venv/bin/activate          # Windows: .venv\Scripts\activate
uv pip install -e ".[dev,server]"
python server.py
```

Test:
```bash
pytest tests/
pytest tests/test_pipeline.py -v  # single file
pytest -k "test_ingest" -v        # single test
```

### apex-identity

```bash
cd services/apex-identity
uv venv .venv --python 3.11
source .venv/bin/activate
uv pip install -e ".[dev]"
python -m apex_identity.main
```

Test:
```bash
pytest tests/ -v --tb=short
ruff check src/
mypy src/
```

### apex-gateway

```bash
cd services/apex-gateway
uv venv .venv --python 3.11
source .venv/bin/activate
uv pip install -e ".[dev]"
python server.py
```

Test:
```bash
pytest tests/ -v
ruff check src/
mypy src/
```

### apex-agents

```bash
cd services/apex-agents
uv venv .venv --python 3.11
source .venv/bin/activate
uv pip install -e ".[dev]"
python server.py
```

Test:
```bash
pytest tests/ -v
ruff check src/
mypy src/
```

### apex-portal

```bash
cd apps/apex-portal
npm install
npm run dev
```

Build for production:
```bash
npm run build       # outputs to dist/
npm run preview     # serve the dist/ build locally
```

## Running All Tests

```bash
make test
```

Or per-service:

```bash
make test-rag
make test-identity
make test-gateway
make test-agents
```

## Linting

```bash
make lint   # ruff + mypy on apex-identity, apex-gateway, apex-agents
```

## Docker Development

```bash
# Build and start all containers
docker compose up --build

# Start without rebuilding
docker compose up

# View logs for a specific service
docker compose logs -f apex-agents

# Restart a single service
docker compose restart apex-gateway

# Stop everything
docker compose down
```

## Common Issues

### Ollama connection refused
Ensure Ollama is running: `ollama serve` (or it starts automatically on macOS/Windows).

### ChromaDB import error
Run `uv pip install -e ".[server]"` (not just `.[dev]`) for apex-rag.

### JWT decode error after SECRET_KEY change
Old tokens become invalid. Re-login after changing the secret key.

### Port already in use
Check what's using the port: `lsof -i :8001` (macOS/Linux) or `netstat -ano | findstr :8001` (Windows).

### apex-agents can't reach apex-gateway
Ensure apex-gateway is running before starting apex-agents in development.

## Adding a New Feature

1. **Backend (Python)**: add route → schema → CRUD → test
2. **Frontend (React)**: add API call in `src/api/*.js` → component → page
3. **Cross-service**: update `ARCHITECTURE.md` and `DATA_FLOW.md`
4. **New env var**: add to service `.env.example` + root `.env.example` + `docker-compose.yml`
