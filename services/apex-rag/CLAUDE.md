# CLAUDE.md — apex-rag

Retrieval-only RAG service. Supports two ingestion effort levels: **low** (fast, no LLM) and **high** (LLM-generated semantic tags per chunk for richer retrieval).

## Commands

```bash
# From this directory (services/apex-rag/)
uv venv .venv --python 3.11
source .venv/bin/activate      # Windows: .venv\Scripts\activate
uv pip install -e ".[dev,server]"

python server.py               # port 8000
pytest tests/
pytest tests/test_tagger.py   # single file
pytest tests/test_tagger.py::TestOllamaTagger::test_tag_chunk_returns_list  # single test
```

Or from repo root: `make dev-rag` / `make test-rag`

## Architecture

- `RAGPipeline` — orchestrates ingestion and retrieval
- **Low-effort ingestion**: loaders → `RecursiveChunker` → `Deduplicator` → embedder → `ChromaStore`
- **High-effort ingestion**: loaders → `RecursiveChunker` → `OllamaTagger` (LLM tags per chunk) → embed enriched text → `ChromaStore`
- **Embedders**: `LocalEncoder` (sentence-transformers) or `OllamaEncoder`
- **Retrieval**: `SemanticRetriever`, optionally `HybridRetriever` (BM25+RRF), optionally `CrossEncoderReranker`
- `CollectionManager` — each collection is a virtual KB folder

### High-effort ingestion flow

1. Each chunk is sent to the Ollama LLM with a structured tagging prompt
2. LLM returns 6–10 semantic tags (key concepts, entities, domain, actions)
3. Tags are appended to the chunk text: `"original text\n\nTopics: tag1, tag2, …"`
4. The enriched text is embedded — vectors now capture both content and semantic concept space
5. Tags are stored in chunk metadata (`tags` field) for debugging/inspection
6. At query time: no special handling needed — enriched embeddings yield better cosine matches

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness |
| POST | `/ingest` | Ingest into default collection (low effort) |
| POST | `/query` | Query default collection |
| GET | `/collections` | List collections |
| POST | `/collections` | Create collection |
| DELETE | `/collections/{name}` | Delete collection |
| GET | `/collections/{name}/files` | List files in collection |
| DELETE | `/collections/{name}/files` | Delete file from collection |
| POST | `/collections/{name}/ingest` | SSE ingest — accepts `effort` form field (`low`\|`high`) |
| POST | `/collections/{name}/query` | Query specific collection |

### SSE ingest events (high effort)

```
{"stage": "loading",   "progress": 5}
{"stage": "chunking",  "progress": 20}
{"stage": "tagging",   "progress": 40}   ← high effort only
{"stage": "embedding", "progress": 70}
{"stage": "storing",   "progress": 88}
{"stage": "done",      "progress": 100, "chunks": N, "effort": "high"}
```

## Key Files

- `server.py` — FastAPI app entry point
- `src/apex_rag/pipeline.py` — `RAGPipeline` class; `ingest_document(doc, effort='low')`
- `src/apex_rag/ingestion/tagger.py` — `OllamaTagger` + `enrich_text_with_tags`
- `src/apex_rag/config.py` — `Settings` (pydantic-settings, reads `.env`)
- `src/apex_rag/ingestion/` — loaders, chunkers, deduplication, tagger
- `src/apex_rag/embeddings/` — encoder implementations
- `src/apex_rag/vectorstore/` — ChromaDB store + collection manager

## Environment

Copy `.env.example` → `.env`. Key vars:
- `APEX_RAG_EMBED_BACKEND` — `ollama` (recommended) or `local`
- `APEX_RAG_OLLAMA_HOST` — Ollama server URL
- `APEX_RAG_TAG_MODEL` — Ollama model for high-effort tagging (default: `gemma4:e2b`)
- `APEX_RAG_TAG_TIMEOUT` — per-chunk timeout in seconds for tag generation (default: `60`)

## Code Quality

No linter configured. Use descriptive names and keep functions focused.
