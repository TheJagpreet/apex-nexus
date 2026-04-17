# API Reference — apex-rag (port 8000)

## GET /health

Liveness check.

**Response** `200`
```json
{ "status": "ok", "version": "2.0.0" }
```

---

## POST /query

Query the default collection. Returns context chunks + source metadata — no LLM answer.

**Body**
```json
{
  "question": "What is RAG?",
  "top_k": 5,
  "collection": null
}
```

**Response** `200`
```json
{
  "question": "What is RAG?",
  "context": "chunk1\n\nchunk2\n\nchunk3",
  "sources": [
    { "source": "document.pdf", "score": 0.92, "chunk": "..." }
  ]
}
```

---

## POST /ingest

Ingest a file into the default collection.

**Body** `multipart/form-data`
- `file`: the file to ingest (`.txt`, `.md`, `.pdf`, `.html`, `.csv`)

**Response** `200`
```json
{
  "filename": "document.pdf",
  "collection": "apex_default",
  "chunks": 42,
  "message": "Ingested 42 chunk(s) from 'document.pdf'."
}
```

---

## GET /collections

List all collections (KB folders).

**Response** `200`
```json
[
  { "name": "research", "file_count": 3, "chunk_count": 120 }
]
```

---

## POST /collections

Create a new collection.

**Body**
```json
{ "name": "research" }
```
Name must match `^[a-zA-Z0-9_\-]+$`.

**Response** `201`
```json
{ "name": "research", "file_count": 0, "chunk_count": 0 }
```

**Errors**: `409` if collection already exists.

---

## DELETE /collections/{name}

Delete a collection and all its vectors. Irreversible.

**Response** `204`

**Errors**: `404` if not found.

---

## GET /collections/{name}/files

List unique source files in a collection.

**Response** `200`
```json
[
  { "source": "paper.pdf", "chunk_count": 35 }
]
```

---

## DELETE /collections/{name}/files

Delete all chunks for a specific source file.

**Body**
```json
{ "source": "paper.pdf" }
```

**Response** `204`

---

## POST /collections/{name}/ingest

Ingest a file into a named collection with SSE progress stream.

**Body** `multipart/form-data`
- `file`: the file to ingest

**Response** `200` — `text/event-stream`

SSE events (newline-delimited JSON):
```
data: {"stage": "loading",   "progress": 10, "filename": "doc.pdf"}
data: {"stage": "chunking",  "progress": 35, "filename": "doc.pdf"}
data: {"stage": "embedding", "progress": 60, "filename": "doc.pdf"}
data: {"stage": "storing",   "progress": 80, "filename": "doc.pdf"}
data: {"stage": "done",      "progress": 100, "chunks": 42, "filename": "doc.pdf"}
data: {"stage": "error",     "message": "...", "filename": "doc.pdf"}
```

---

## POST /collections/{name}/query

Query a specific collection.

**Body** — same as `POST /query`

**Response** `200` — same as `POST /query`

**Errors**: `404` if collection not found.
