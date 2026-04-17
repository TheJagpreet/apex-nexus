"""
Apex RAG — FastAPI REST server.

Endpoints:
  GET  /health                          — liveness check
  POST /ingest                          — ingest into default collection (backward compat)
  POST /query                           — query default collection, returns context + sources

  GET  /collections                     — list all collections (virtual KB folders)
  POST /collections                     — create a collection
  DELETE /collections/{name}            — delete a collection and all its data
  GET  /collections/{name}/files        — list unique source files in a collection
  DELETE /collections/{name}/files      — delete all chunks for a source file
  POST /collections/{name}/ingest       — ingest file with SSE progress stream
  POST /collections/{name}/query        — query a specific collection

Run (from inside apex-rag/ with venv active):
  python server.py
  # or:
  python -m uvicorn server:app --reload --port 8000
"""
from __future__ import annotations

import json
import logging
import os
import shutil
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from apex_rag import RAGPipeline
from apex_rag.config import Settings
from apex_rag.ingestion.loaders import load_csv, load_file
from apex_rag.vectorstore.collection_manager import CollectionManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Apex RAG API",
    description="REST interface for the Apex RAG pipeline (retrieval only).",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ACCEPTED_SUFFIXES = {".txt", ".md", ".pdf", ".html", ".htm", ".csv"}

# ---------------------------------------------------------------------------
# Pipeline registry — one RAGPipeline per collection
# ---------------------------------------------------------------------------

_settings = Settings()
_pipelines: dict[str, RAGPipeline] = {}
_collection_manager: CollectionManager | None = None


def get_collection_manager() -> CollectionManager:
    global _collection_manager
    if _collection_manager is None:
        _collection_manager = CollectionManager(persist_dir=_settings.persist_dir)
    return _collection_manager


def get_pipeline(collection: str | None = None) -> RAGPipeline:
    """Return (or lazily create) a RAGPipeline for the given collection name."""
    name = collection or _settings.collection
    if name not in _pipelines:
        logger.info("Initialising RAGPipeline for collection '%s' …", name)
        cfg = Settings()
        cfg.collection = name
        _pipelines[name] = RAGPipeline(settings=cfg)
        logger.info("RAGPipeline ready (collection=%s)", name)
    return _pipelines[name]


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1)
    top_k: int = Field(default=5, ge=1, le=50)
    collection: str | None = Field(default=None, description="Collection to search. Defaults to server default.")


class QueryResponse(BaseModel):
    question: str
    context: str
    sources: list[dict]


class IngestResponse(BaseModel):
    filename: str
    collection: str
    chunks: int
    message: str


class CollectionCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, pattern=r"^[a-zA-Z0-9_\-]+$")


class CollectionInfo(BaseModel):
    name: str
    file_count: int
    chunk_count: int


class FileInfo(BaseModel):
    source: str
    chunk_count: int


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _ingest_file_to_collection(tmp_path: str, suffix: str, filename: str, collection: str) -> int:
    """Run ingestion synchronously; return chunk count.

    Updates each document's ``source`` metadata to the original filename
    rather than the temp-file path.
    """
    rag = get_pipeline(collection)
    if suffix == ".csv":
        docs = load_csv(tmp_path)
        total = 0
        for doc in docs:
            doc.metadata["source"] = filename
            total += rag.ingest_document(doc)
        return total
    doc = load_file(tmp_path)
    doc.metadata["source"] = filename
    return rag.ingest_document(doc)


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


# ---------------------------------------------------------------------------
# Routes — meta
# ---------------------------------------------------------------------------


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok", "version": "2.0.0"}


# ---------------------------------------------------------------------------
# Routes — backward-compat default collection
# ---------------------------------------------------------------------------


@app.post("/ingest", response_model=IngestResponse, tags=["rag"])
async def ingest(file: UploadFile = File(...)) -> IngestResponse:
    """Ingest a file into the default collection."""
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ACCEPTED_SUFFIXES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{suffix}'. Accepted: {sorted(ACCEPTED_SUFFIXES)}",
        )

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        chunks = _ingest_file_to_collection(tmp_path, suffix, filename, _settings.collection)
    except Exception as exc:
        os.unlink(tmp_path)
        logger.exception("Ingestion failed for '%s'", file.filename)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    else:
        os.unlink(tmp_path)

    return IngestResponse(
        filename=file.filename or "unknown",
        collection=_settings.collection,
        chunks=chunks,
        message=f"Ingested {chunks} chunk(s) from '{file.filename}'.",
    )


@app.post("/query", response_model=QueryResponse, tags=["rag"])
def query(req: QueryRequest) -> QueryResponse:
    """Query the RAG pipeline. Returns context + sources — no LLM answer."""
    rag = get_pipeline(req.collection)

    try:
        result = rag.query(req.question, top_k=req.top_k)
    except Exception as exc:
        logger.exception("Query failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return QueryResponse(
        question=result.question,
        context=result.context,
        sources=result.sources,
    )


# ---------------------------------------------------------------------------
# Routes — collection management
# ---------------------------------------------------------------------------


@app.get("/collections", response_model=list[CollectionInfo], tags=["collections"])
def list_collections() -> list[CollectionInfo]:
    """List all collections (KB folders) with chunk counts."""
    mgr = get_collection_manager()
    cols = mgr.list_collections()
    result = []
    for c in cols:
        # Count unique sources within this collection
        rag = get_pipeline(c.name)
        sources = rag.list_sources()
        result.append(CollectionInfo(name=c.name, file_count=len(sources), chunk_count=c.doc_count))
    return result


@app.post("/collections", response_model=CollectionInfo, status_code=201, tags=["collections"])
def create_collection(body: CollectionCreateRequest) -> CollectionInfo:
    """Create a new collection (KB folder)."""
    mgr = get_collection_manager()
    if mgr.collection_exists(body.name):
        raise HTTPException(status_code=409, detail=f"Collection '{body.name}' already exists.")
    mgr.create_collection(body.name)
    return CollectionInfo(name=body.name, file_count=0, chunk_count=0)


@app.delete("/collections/{name}", status_code=204, tags=["collections"])
def delete_collection(name: str) -> None:
    """Delete a collection and all its vectors. Irreversible."""
    mgr = get_collection_manager()
    if not mgr.collection_exists(name):
        raise HTTPException(status_code=404, detail=f"Collection '{name}' not found.")
    mgr.delete_collection(name)
    # Remove cached pipeline
    _pipelines.pop(name, None)


@app.get("/collections/{name}/files", response_model=list[FileInfo], tags=["collections"])
def list_files(name: str) -> list[FileInfo]:
    """List unique source files stored in a collection."""
    mgr = get_collection_manager()
    if not mgr.collection_exists(name):
        raise HTTPException(status_code=404, detail=f"Collection '{name}' not found.")
    rag = get_pipeline(name)
    sources = rag.list_sources()
    result = []
    for src in sources:
        # Get chunk count for this source
        chunks = rag.store.collection.get(where={"source": src})
        result.append(FileInfo(source=src, chunk_count=len(chunks["ids"])))
    return result


class DeleteFileRequest(BaseModel):
    source: str


@app.delete("/collections/{name}/files", status_code=204, tags=["collections"])
def delete_file(name: str, body: DeleteFileRequest) -> None:
    """Delete all chunks for a source file from a collection."""
    mgr = get_collection_manager()
    if not mgr.collection_exists(name):
        raise HTTPException(status_code=404, detail=f"Collection '{name}' not found.")
    rag = get_pipeline(name)
    rag.delete_source(body.source)


# ---------------------------------------------------------------------------
# Routes — per-collection ingest with SSE progress
# ---------------------------------------------------------------------------


@app.post("/collections/{name}/ingest", tags=["collections"])
async def ingest_to_collection(
    name: str,
    file: UploadFile = File(...),
) -> StreamingResponse:
    """
    Ingest a file into a named collection with Server-Sent Events progress.

    The client receives newline-delimited JSON events:
      {"stage": "loading",   "progress": 10}
      {"stage": "chunking",  "progress": 30}
      {"stage": "embedding", "progress": 60}
      {"stage": "storing",   "progress": 85}
      {"stage": "done",      "progress": 100, "chunks": N, "filename": "..."}
      {"stage": "error",     "message": "..."}
    """
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ACCEPTED_SUFFIXES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{suffix}'. Accepted: {sorted(ACCEPTED_SUFFIXES)}",
        )

    mgr = get_collection_manager()
    if not mgr.collection_exists(name):
        # Auto-create the collection on first ingest
        mgr.create_collection(name)

    # Buffer the upload before streaming response
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    filename = file.filename or "unknown"
    rag = get_pipeline(name)

    async def _stream():
        try:
            yield _sse({"stage": "loading", "progress": 10, "filename": filename})

            from apex_rag.ingestion.loaders import load_csv, load_file
            if suffix == ".csv":
                docs = load_csv(tmp_path)
            else:
                docs = [load_file(tmp_path)]

            yield _sse({"stage": "chunking", "progress": 35, "filename": filename})

            # Count expected chunks without ingesting yet
            total_chunks = 0
            for doc in docs:
                total_chunks += len(rag.chunker.split(doc))

            yield _sse({"stage": "embedding", "progress": 60, "filename": filename})
            yield _sse({"stage": "storing", "progress": 80, "filename": filename})

            # Fix source metadata to use original filename, not temp path
            for doc in docs:
                doc.metadata["source"] = filename

            # Actual ingest (chunking + embedding + storing)
            ingested = 0
            for doc in docs:
                ingested += rag.ingest_document(doc)

            os.unlink(tmp_path)
            yield _sse({"stage": "done", "progress": 100, "chunks": ingested, "filename": filename})

        except Exception as exc:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
            logger.exception("SSE ingest failed for '%s'", filename)
            yield _sse({"stage": "error", "message": str(exc), "filename": filename})

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------------------------------------------------------------------------
# Routes — per-collection query
# ---------------------------------------------------------------------------


@app.post("/collections/{name}/query", response_model=QueryResponse, tags=["collections"])
def query_collection(name: str, req: QueryRequest) -> QueryResponse:
    """Query a specific collection. Returns context + sources."""
    mgr = get_collection_manager()
    if not mgr.collection_exists(name):
        raise HTTPException(status_code=404, detail=f"Collection '{name}' not found.")

    rag = get_pipeline(name)
    try:
        result = rag.query(req.question, top_k=req.top_k)
    except Exception as exc:
        logger.exception("Query failed for collection '%s'", name)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return QueryResponse(
        question=result.question,
        context=result.context,
        sources=result.sources,
    )


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
