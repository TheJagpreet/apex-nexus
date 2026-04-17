# apex-rag

RAG (Retrieval-Augmented Generation) pipeline and REST API for the Apex platform.

**Responsibility:** Document ingestion, chunking, embedding, and vector search **only**.
LLM generation is handled by **apex-gateway** (port 8002).

---

## Architecture

```
Documents → Loaders → Chunker → Encoder → ChromaDB
                                              |
                      BM25 Index (sparse) ----+----> RRF Fusion → Reranker → Context + Sources
                                              |
                      Semantic Search (dense)-+
```

The query endpoint returns `{question, context, sources}` — the assembled context is forwarded to apex-gateway for LLM generation.

---

## Tech Stack

| Component | Library | Notes |
|---|---|---|
| Vector DB | `chromadb>=0.5` | Persistent SQLite + HNSW |
| Embeddings | `sentence-transformers` (default) or Ollama | fully local |
| Sparse Retrieval | `rank-bm25` | BM25Okapi, auto-rebuilds on ingest |
| Reranking | `sentence-transformers` (cross-encoder) | Optional |
| PDF Loader | `pypdf` | Pure-Python |
| Config | `pydantic-settings` | `.env` + typed settings |
| REST Server | `fastapi` + `uvicorn` | `server.py` |

---

## Setup

```bash
cd apex-rag
uv venv .venv --python 3.10
source .venv/bin/activate   # Windows: .venv\Scripts\activate
uv pip install -e ".[dev,server]"
```

---

## Configuration

Copy `.env.example` to `.env`:

```env
APEX_RAG_EMBED_MODEL=all-MiniLM-L6-v2
APEX_RAG_EMBED_BACKEND=local             # "local" | "ollama"
APEX_RAG_EMBED_DEVICE=cpu
APEX_RAG_EMBED_CACHE=true
APEX_RAG_CHROMA_DB_DIR=./chroma_db
APEX_RAG_COLLECTION_NAME=default
APEX_RAG_CHUNK_SIZE=512
APEX_RAG_CHUNK_OVERLAP=50
APEX_RAG_OLLAMA_HOST=http://localhost:11434
APEX_RAG_OLLAMA_EMBED_MODEL=nomic-embed-text
```

---

## Run

```bash
python server.py
# or:
python -m uvicorn server:app --reload --port 8000
```

Interactive docs: `http://localhost:8000/docs`

---

## API

### Default collection

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |
| POST | `/ingest` | Ingest file into default collection (multipart) |
| POST | `/query` | Query default collection → `{question, context, sources}` |

### Collection management (KB folders)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/collections` | List all collections with file + chunk counts |
| POST | `/collections` | Create collection `{name}` |
| DELETE | `/collections/{name}` | Delete collection and all its vectors |
| GET | `/collections/{name}/files` | List unique source files + chunk counts |
| DELETE | `/collections/{name}/files` | Remove source `{source}` |
| POST | `/collections/{name}/ingest` | **SSE** — ingest file with progress events |
| POST | `/collections/{name}/query` | Query a specific collection |

### SSE ingest events (`POST /collections/{name}/ingest`)

```
data: {"stage": "loading",   "progress": 10,  "filename": "doc.pdf"}
data: {"stage": "chunking",  "progress": 35,  "filename": "doc.pdf"}
data: {"stage": "embedding", "progress": 60,  "filename": "doc.pdf"}
data: {"stage": "storing",   "progress": 80,  "filename": "doc.pdf"}
data: {"stage": "done",      "progress": 100, "chunks": 42, "filename": "doc.pdf"}
data: {"stage": "error",     "message": "...", "filename": "doc.pdf"}
```

### Query response

```json
{
  "question": "What is ChromaDB?",
  "context": "...assembled context string for LLM...",
  "sources": [{"id": "doc_0", "score": 0.921, "source": "doc.pdf"}]
}
```

---

## Tests

```bash
pytest tests/
pytest tests/test_pipeline.py   # single file
```

---

## Feature Status

### Phase 1 — Core ✓
- Document Loaders — `.txt`, `.md`, `.pdf`, `.html`, `.csv`, raw strings
- Recursive Text Chunker — configurable size and overlap
- Local Embeddings — `all-MiniLM-L6-v2` (CPU/GPU)
- ChromaDB Vector Store — persistent SQLite + HNSW
- Semantic Retrieval — cosine similarity, configurable `top_k`
- REST API — FastAPI server

### Phase 2 — Production Hardening ✓
- Hybrid Search — BM25 + semantic fused with RRF
- Cross-Encoder Reranking
- Disk-backed Embedding Cache
- Document Deduplication — content-hash fingerprinting
- Multi-Collection Management — `CollectionManager`
- Collection-scoped ingest + query endpoints with SSE progress

### Phase 3 — Roadmap
- RAG Evaluation (RAGAS metrics)
- Streaming generation (handled by apex-gateway)
- Conversation memory
- Async pipeline
- Docker / Compose
