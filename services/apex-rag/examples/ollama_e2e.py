"""
Live end-to-end test — all Phase 2 features + Ollama gemma4:e2b.

Run:
    python examples/ollama_e2e.py
"""
import logging
import tempfile
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")

from apex_rag import RAGPipeline, OllamaLLM
from apex_rag.config import Settings

# -- Setup --------------------------------------------------------------------

tmpdir = tempfile.mkdtemp(prefix="apex_rag_e2e_")

cfg = Settings(
    persist_dir=f"{tmpdir}/chroma",
    collection="e2e_test",
    embed_model="sentence-transformers/all-MiniLM-L6-v2",
    chunk_size=400,
    chunk_overlap=50,
    top_k=4,
    # Phase 2 features
    hybrid_search=True,
    rerank=True,
    rerank_model="cross-encoder/ms-marco-MiniLM-L-6-v2",
    embed_cache=True,
    embed_cache_dir=f"{tmpdir}/emb_cache",
    dedup=True,
    dedup_store_dir=f"{tmpdir}/dedup",
    ollama_model="gemma4:e2b",
    ollama_host="http://localhost:11434",
)

rag = RAGPipeline(settings=cfg)

# -- Ingest ------------------------------------------------------------------─

print("\n-- Ingesting documents ----------------------------------------------")

CHROMADB_TEXT = """
    ChromaDB is an open-source embedding database designed for AI applications.
    It stores vector embeddings alongside metadata and supports cosine, L2, and
    inner-product similarity metrics. ChromaDB uses an HNSW index for fast
    approximate nearest-neighbour search and SQLite for metadata persistence.
    It can run fully in-memory or persist to disk, making it suitable for both
    prototyping and production deployments.
    """

rag.ingest_text(CHROMADB_TEXT, source="chromadb_overview")

rag.ingest_text(
    """
    Retrieval-Augmented Generation (RAG) is a technique that improves LLM outputs
    by injecting retrieved context into the prompt before generation. The pipeline
    has three phases: (1) document ingestion — loading, chunking, and embedding
    source material; (2) retrieval — finding the most relevant chunks for a given
    query using vector similarity or hybrid search; (3) generation — passing the
    retrieved context to an LLM to produce a grounded answer.
    """,
    source="rag_overview",
)

rag.ingest_text(
    """
    Hybrid search combines dense (semantic) retrieval with sparse (keyword-based)
    retrieval. Dense retrieval uses neural embeddings to find conceptually similar
    content. Sparse retrieval, such as BM25, matches exact or near-exact terms.
    Reciprocal Rank Fusion (RRF) merges the two ranked lists by position rather
    than raw score, making it robust across different scoring scales.
    """,
    source="hybrid_search",
)

rag.ingest_text(
    """
    Cross-encoder reranking improves retrieval precision by scoring each
    (query, document) pair jointly rather than comparing embeddings independently.
    The cross-encoder reads the full concatenation of query and candidate and
    outputs a fine-grained relevance score. This is slower than bi-encoder
    retrieval but produces higher-quality final rankings.
    """,
    source="reranking",
)

# Dedup test — second ingest of exact same text should be skipped
n_dup = rag.ingest_text(CHROMADB_TEXT, source="chromadb_overview")
print(f"Duplicate ingest returned: {n_dup} chunks (expected 0)")

print(f"\nStore: {rag.count()} chunks across sources: {rag.list_sources()}")

# -- Query with all Phase 2 features active ----------------------------------─

questions = [
    "How does ChromaDB persist data?",
    "What is the difference between dense and sparse retrieval?",
    "Why use a cross-encoder for reranking?",
    "Explain how RAG works step by step.",
]

print("\n-- Querying (hybrid search + reranking + Ollama gemma4:e2b) ----------\n")

for q in questions:
    result = rag.query(q)
    print(f"Q: {q}")
    print(f"A: {result.answer}")
    top_src = result.sources[0]["source"] if result.sources else "n/a"
    print(f"   Top source: {top_src}  |  {len(result.sources)} chunks retrieved\n")

# -- Metadata filter test ------------------------------------------------------

print("-- Metadata filter test -----------------------------------------------")
result = rag.query("What is RRF?", where={"source": "hybrid_search"})
print(f"Q: What is RRF? (filtered to hybrid_search source)")
print(f"A: {result.answer}")
assert all(s["source"] == "hybrid_search" for s in result.sources), "Filter violated!"
print("   Filter respected: all sources == 'hybrid_search' [PASS]\n")

# -- Collection manager --------------------------------------------------------

print("-- Collection manager -------------------------------------------------")
cols = rag.collections.list_collections()
for c in cols:
    print(f"   {c.name}: {c.doc_count} docs")

print("\n-- All tests passed ---------------------------------------------------")
