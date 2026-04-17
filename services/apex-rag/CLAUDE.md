# CLAUDE.md — apex-rag

Retrieval-only RAG service. **Never calls an LLM.** Ingestion + vector search only.

## Commands

```bash
# From this directory (services/apex-rag/)
uv venv .venv --python 3.10
source .venv/bin/activate      # Windows: .venv\Scripts\activate
uv pip install -e ".[dev,server]"

python server.py               # port 8000
pytest tests/
pytest tests/test_pipeline.py  # single file
```

Or from repo root: `make dev-rag` / `make test-rag`

## Architecture

- `RAGPipeline` — orchestrates ingestion and retrieval
- **Ingestion**: loaders → `RecursiveChunker` → `Deduplicator` → embedder → `ChromaStore`
- **Embedders**: `LocalEncoder` (sentence-transformers) or `OllamaEncoder`
- **Retrieval**: `SemanticRetriever`, optionally `HybridRetriever` (BM25+RRF), optionally `CrossEncoderReranker`
- `CollectionManager` — each collection is a virtual KB folder

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness |
| POST | `/ingest` | Ingest into default collection |
| POST | `/query` | Query default collection |
| GET | `/collections` | List collections |
| POST | `/collections` | Create collection |
| DELETE | `/collections/{name}` | Delete collection |
| GET | `/collections/{name}/files` | List files in collection |
| DELETE | `/collections/{name}/files` | Delete file from collection |
| POST | `/collections/{name}/ingest` | SSE ingest into collection |
| POST | `/collections/{name}/query` | Query specific collection |

## Key Files

- `server.py` — FastAPI app entry point
- `src/apex_rag/pipeline.py` — `RAGPipeline` class
- `src/apex_rag/config.py` — `Settings` (pydantic-settings, reads `.env`)
- `src/apex_rag/ingestion/` — loaders, chunkers, deduplication
- `src/apex_rag/embeddings/` — encoder implementations
- `src/apex_rag/vectorstore/` — ChromaDB store + collection manager

## Environment

Copy `.env.example` → `.env`. Key vars:
- `APEX_RAG_EMBED_BACKEND` — `ollama` (recommended) or `local`
- `APEX_RAG_OLLAMA_HOST` — Ollama server URL

## Code Quality

No linter configured. Use descriptive names and keep functions focused.
