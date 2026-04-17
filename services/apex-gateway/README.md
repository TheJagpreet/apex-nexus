# apex-gateway

LLM generation service for the Apex platform. Receives retrieved context from apex-rag and returns an LLM-generated answer via Ollama.

## Responsibility

**apex-gateway only does LLM generation.** It:
- Accepts a `{question, context}` payload
- Assembles a RAG prompt from the context
- Calls an Ollama model and returns the answer

Vector search and document ingestion are handled by **apex-rag** (port 8000).
Agent orchestration and multi-step workflows are handled by **apex-agents** (port 8003), which calls this service internally for LLM generation.

## Setup

```bash
cd apex-gateway
uv venv .venv --python 3.11
source .venv/bin/activate   # Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"
```

Requires [Ollama](https://ollama.com/) running locally with a model pulled:

```bash
ollama pull gemma4:e2b
ollama serve   # starts on http://localhost:11434
```

## Configuration

Create `.env` in `apex-gateway/`:

```
APEX_GW_OLLAMA_HOST=http://localhost:11434
APEX_GW_OLLAMA_MODEL=gemma4:e2b
APEX_GW_HOST=0.0.0.0
APEX_GW_PORT=8002
APEX_GW_CORS_ORIGINS=http://localhost:5173,http://localhost:3000
APEX_GW_AGENTS_URL=http://localhost:8003
```

## Run

```bash
python server.py
# or:
python -m uvicorn server:app --reload --port 8002
```

## API

### `GET /health`
```json
{"status": "ok", "model": "gemma4:e2b"}
```

### `POST /generate`
```json
{
  "question": "What is ChromaDB?",
  "context": "ChromaDB is an open-source embedding database...",
  "model": null
}
```
Response:
```json
{
  "question": "What is ChromaDB?",
  "answer": "ChromaDB is an open-source vector database...",
  "model": "gemma4:e2b"
}
```

`model` is optional — overrides the default for a single request.

## Tests

```bash
pytest tests/
```

Tests mock Ollama so no running LLM is required.
