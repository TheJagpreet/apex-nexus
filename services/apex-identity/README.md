# apex-identity

Authentication and session management service for the Apex platform.

## Responsibility

- User registration and login (JWT tokens, bcrypt password hashing)
- Chat session CRUD (create, list, rename, delete)
- Message persistence per session (role, content, sources JSON, file attachments)
- User preferences (key-value store per user)

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Python 3.11+ |
| Framework | FastAPI |
| ORM | SQLAlchemy 2 (async) |
| Database | SQLite (via aiosqlite) |
| Auth | JWT (python-jose) + bcrypt |
| Package Manager | uv |
| Linter | Ruff + mypy (strict) |
| Tests | pytest + pytest-asyncio + httpx |

## Setup

```bash
cd apex-identity
uv venv .venv --python 3.11
source .venv/bin/activate   # Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"
```

## Configuration

Create `.env` in `apex-identity/`:

```
SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_hex(32))">
DATABASE_URL=sqlite:///./apex_identity.db
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
HOST=0.0.0.0
PORT=8001
```

## Run

```bash
python -m apex_identity.main
```

Database tables are created automatically on startup. Interactive docs: `http://localhost:8001/docs`

## API

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | `{username, email, password, display_name?}` |
| POST | `/auth/login` | No | `{username, password}` → `{access_token, token_type}` |
| GET | `/auth/me` | Bearer | Current user profile |

### Sessions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/sessions` | Bearer | List sessions (newest first, with message counts) |
| POST | `/sessions` | Bearer | Create `{title}` |
| GET | `/sessions/{id}` | Bearer | Session detail with all messages |
| PATCH | `/sessions/{id}` | Bearer | Update `{title}` |
| DELETE | `/sessions/{id}` | Bearer | Delete + cascade messages |
| GET | `/sessions/{id}/messages` | Bearer | List messages chronologically |
| POST | `/sessions/{id}/messages` | Bearer | Add `{role, content, sources?, files?}` |

### User Preferences

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me/preferences` | Bearer | List all preferences |
| PUT | `/users/me/preferences` | Bearer | Set `{key, value}` |
| DELETE | `/users/me/preferences/{key}` | Bearer | Delete preference |

## Tests

```bash
pytest tests/
ruff check src/
mypy src/
```

Tests use an in-memory SQLite database — no external services required.

## Project Layout

```
src/apex_identity/
  main.py          — FastAPI app, lifespan, CORS, routers
  config.py        — Settings from environment / .env
  database.py      — Async SQLAlchemy engine & session
  models.py        — ORM: User, ChatSession, Message, UserPreference
  schemas.py       — Pydantic request/response schemas
  security.py      — Password hashing & JWT utilities
  dependencies.py  — get_current_user dependency
  routers/
    auth.py        — /auth endpoints
    sessions.py    — /sessions + /sessions/{id}/messages
    users.py       — /users/me/preferences
```
