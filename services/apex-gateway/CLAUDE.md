# CLAUDE.md — apex-gateway

Thin FastAPI wrapper around Ollama. Receives `{context, question}`, assembles the RAG prompt, returns `{answer}`.

## Commands

```bash
# From this directory (services/apex-gateway/)
uv venv .venv --python 3.11
source .venv/bin/activate
uv pip install -e ".[dev]"

python server.py               # port 8002
pytest tests/
ruff check src/
mypy src/
```

Or from repo root: `make dev-gateway` / `make test-gateway` / `make lint-gateway`

## Architecture

Minimal — two source files:
- `src/apex_gateway/config.py` — `settings` (Ollama host, model, bind address)
- `src/apex_gateway/main.py` — FastAPI app with `/generate`, `/keywords`, `/health`

**Prompt assembly** happens here, not in apex-rag. apex-rag sends raw context chunks; apex-gateway wraps them in the instruction prompt.

## Endpoints

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/health` | — | `{status}` |
| POST | `/generate` | `{question, context}` | `{question, answer, model}` |
| POST | `/keywords` | `{question}` | `{keywords}` |

## Code Quality

`ruff` (line-length 100) + `mypy --strict`. Run both before committing.

## Environment

Copy `.env.example` → `.env`. Key vars:
- `APEX_GW_OLLAMA_HOST` — Ollama server URL (default: `http://localhost:11434`)
- `APEX_GW_OLLAMA_MODEL` — model to use (default: `gemma4:e2b`)
