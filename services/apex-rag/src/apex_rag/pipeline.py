"""
RAGPipeline — the single entry point for the entire system.

Phase 1 features: ingestion, chunking, local embeddings, ChromaDB, semantic retrieval.
Phase 2 features: hybrid search (BM25+RRF), cross-encoder reranking, embedding cache,
                  document deduplication, multi-collection, Ollama LLM.

Usage:
    from apex_rag import RAGPipeline

    rag = RAGPipeline()
    rag.ingest_file("docs/paper.pdf")
    rag.ingest_text("ChromaDB uses cosine similarity.", source="notes")

    result = rag.query("How does ChromaDB measure similarity?")
    print(result.answer)
    for s in result.sources:
        print(s)
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any  # used in ingest_many and query signatures

from .config import Settings, settings as _default_settings
from .embeddings.encoder import LocalEncoder
from .generation.generator import ContextAssembler, RAGResponse
from .ingestion.chunkers import RecursiveChunker
from .ingestion.loaders import Document, load_csv, load_file, load_from_string
from .retrieval.retriever import SemanticRetriever
from .vectorstore.chroma_store import ChromaStore
from .vectorstore.collection_manager import CollectionManager

logger = logging.getLogger(__name__)


class RAGPipeline:
    """
    Wires all components together into a simple ingest → query interface.

    LLM generation is NOT performed here — apex-gateway handles that.
    query() returns retrieved context + ranked sources only.

    Args:
        settings: Override defaults from config / .env.
    """

    def __init__(
        self,
        settings: Settings | None = None,
    ) -> None:
        cfg = settings or _default_settings
        self._cfg = cfg

        # --- Encoder ---
        if cfg.embed_backend == "ollama":
            from .embeddings.ollama_encoder import OllamaEncoder
            base_encoder = OllamaEncoder(
                model=cfg.ollama_embed_model,
                host=cfg.ollama_host,
                batch_size=cfg.embed_batch_size,
            )
            logger.info("Embedding backend: Ollama (%s @ %s)", cfg.ollama_embed_model, cfg.ollama_host)
        else:
            base_encoder = LocalEncoder(
                model_name=cfg.embed_model,
                device=cfg.embed_device,
                batch_size=cfg.embed_batch_size,
                cache_dir=cfg.embed_model_dir,
            )
            logger.info("Embedding backend: local sentence-transformers (%s)", cfg.embed_model)

        if cfg.embed_cache:
            from .embeddings.cache import CachedEncoder
            self.encoder = CachedEncoder(base_encoder, cache_dir=cfg.embed_cache_dir)
            logger.info("Embedding cache enabled: %s", cfg.embed_cache_dir)
        else:
            self.encoder = base_encoder

        # --- Vector store ---
        self.store = ChromaStore(
            persist_dir=cfg.persist_dir,
            collection_name=cfg.collection,
        )

        # --- Chunker ---
        self.chunker = RecursiveChunker(
            chunk_size=cfg.chunk_size,
            chunk_overlap=cfg.chunk_overlap,
        )

        # --- Deduplication ---
        self._dedup = None
        if cfg.dedup:
            from .ingestion.dedup import DedupStore
            self._dedup = DedupStore(store_dir=cfg.dedup_store_dir)
            logger.info("Deduplication enabled: %s", cfg.dedup_store_dir)

        # --- Retriever (semantic or hybrid) ---
        semantic = SemanticRetriever(
            encoder=self.encoder,
            store=self.store,
            top_k=cfg.top_k,
        )
        if cfg.hybrid_search:
            from .retrieval.bm25_retriever import BM25Retriever
            from .retrieval.hybrid_retriever import HybridRetriever
            bm25 = BM25Retriever(store=self.store)
            self.retriever = HybridRetriever(
                semantic=semantic,
                bm25=bm25,
                top_k=cfg.top_k,
                semantic_weight=cfg.hybrid_semantic_weight,
                bm25_weight=cfg.hybrid_bm25_weight,
            )
            logger.info("Hybrid search enabled (RRF).")
        else:
            self.retriever = semantic

        # --- Reranker ---
        self._reranker = None
        if cfg.rerank:
            from .retrieval.reranker import CrossEncoderReranker
            self._reranker = CrossEncoderReranker(model_name=cfg.rerank_model)
            logger.info("Cross-encoder reranking enabled: %s", cfg.rerank_model)

        # LLM generation is handled by apex-gateway — RAG pipeline only retrieves context.
        self.assembler = ContextAssembler(llm_fn=None)

        # --- Collection manager (exposed for multi-collection workflows) ---
        self.collections = CollectionManager(persist_dir=cfg.persist_dir)

    # ------------------------------------------------------------------
    # Ingestion
    # ------------------------------------------------------------------

    def ingest_document(self, document: Document) -> int:
        """Chunk, embed, and store a Document. Returns chunks added (0 if deduped)."""
        # Deduplication check
        if self._dedup is not None:
            if self._dedup.is_seen(document.content):
                logger.info("Skipping duplicate document: %s", document.metadata.get("source", "?"))
                return 0
            self._dedup.mark_seen(document.content)

        chunks = self.chunker.split(document)
        if not chunks:
            logger.warning("No chunks produced for document: %s", document.metadata.get("source"))
            return 0

        texts = [c.content for c in chunks]
        embeddings = self.encoder.encode(texts)

        ids = [f"{document.id}_{c.chunk_index}" for c in chunks]
        metadatas = [
            {k: str(v) if not isinstance(v, (str, int, float, bool)) else v for k, v in c.metadata.items()}
            for c in chunks
        ]

        self.store.add(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas,
        )
        logger.info("Ingested %d chunks from '%s'", len(chunks), document.metadata.get("source", "?"))
        return len(chunks)

    def ingest_file(self, path: str | Path, **csv_kwargs) -> int:
        """
        Load a file from disk, chunk it, and store it. Returns chunk count.

        Supports ``.txt``, ``.md``, ``.pdf``, ``.html``, and ``.csv``.
        For CSV files each row is ingested as a separate Document.
        Extra keyword arguments (e.g. ``text_col``, ``topic_col``) are
        forwarded to :func:`~apex_rag.ingestion.loaders.load_csv`.
        """
        path = Path(path)
        if path.suffix.lower() == ".csv":
            docs = load_csv(path, **csv_kwargs)
            total = 0
            for doc in docs:
                total += self.ingest_document(doc)
            return total
        doc = load_file(path)
        return self.ingest_document(doc)

    def ingest_text(self, text: str, source: str = "inline", **extra_meta: Any) -> int:
        """Ingest a raw string. Returns chunk count."""
        doc = load_from_string(text, source=source, **extra_meta)
        return self.ingest_document(doc)

    def ingest_many(self, paths: list[str | Path]) -> dict[str, int]:
        """Batch-ingest a list of file paths. Returns {path: chunk_count}."""
        from tqdm import tqdm
        results = {}
        for p in tqdm(paths, desc="Ingesting files"):
            try:
                results[str(p)] = self.ingest_file(p)
            except Exception as exc:
                logger.error("Failed to ingest %s: %s", p, exc)
                results[str(p)] = 0
        return results

    # ------------------------------------------------------------------
    # Query
    # ------------------------------------------------------------------

    def query(
        self,
        question: str,
        top_k: int | None = None,
        where: dict[str, Any] | None = None,
    ) -> RAGResponse:
        """
        Retrieve relevant chunks and assemble an answer.

        Args:
            question: Natural-language question.
            top_k:    Override retrieval count.
            where:    ChromaDB metadata filter dict, e.g. {"source": "paper.pdf"}.
        """
        results = self.retriever.retrieve(question, top_k=top_k, where=where)

        if self._reranker is not None and results:
            results = self._reranker.rerank(question, results)

        return self.assembler.generate(question, results)

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------

    def count(self) -> int:
        return self.store.count()

    def list_sources(self) -> list[str]:
        return self.store.list_sources()

    def delete_source(self, source: str) -> None:
        self.store.delete_by_source(source)
        if self._dedup:
            logger.info("Note: dedup hashes for '%s' remain — call dedup.forget() to re-ingest.", source)

    def reset(self) -> None:
        """Wipe all stored vectors. Irreversible."""
        self.store.reset()
        if self._dedup:
            self._dedup.clear()
