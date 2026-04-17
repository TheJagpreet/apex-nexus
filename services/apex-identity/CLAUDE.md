# CLAUDE.md — apex-identity

Auth, user management, session persistence, and message history. JWT + SQLite.

## Commands

```bash
# From this directory (services/apex-identity/)
uv venv .venv --python 3.11
source .venv/bin/activate
uv pip install -e ".[dev]"

python -m apex_identity.main   # port 8001
pytest tests/
ruff check src/
mypy src/
```

Or from repo root: `make dev-identity` / `make test-identity` / `make lint-identity`

## Architecture

Async FastAPI + SQLAlchemy (async) on SQLite. Three router groups:

- `routers/auth.py` — register, login (JWT), `/auth/me`
- `routers/sessions.py` — CRUD for chat sessions + messages with `sources` JSON
- `routers/users.py` — user profile management

## Key Files

- `src/apex_identity/main.py` — FastAPI app, lifespan (DB init), CORS
- `src/apex_identity/config.py` — `Settings` (pydantic-settings)
- `src/apex_identity/database.py` — async SQLAlchemy engine + session
- `src/apex_identity/models.py` — ORM models (User, Session, Message)
- `src/apex_identity/schemas.py` — Pydantic request/response schemas
- `src/apex_identity/security.py` — bcrypt + JWT helpers
- `src/apex_identity/dependencies.py` — `get_current_user` FastAPI dependency

## Testing

`tests/conftest.py` provides:
- In-memory SQLite database (reset per test)
- Async test client via `httpx.AsyncClient`

Tests: `test_auth.py`, `test_sessions.py`, `test_users.py`

## Code Quality

`ruff` (line-length 100) + `mypy --strict`. Run both before committing.

## Environment

Copy `.env.example` → `.env`. Must set `SECRET_KEY` to a random value:
```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```
