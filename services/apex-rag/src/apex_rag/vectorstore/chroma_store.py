"""ChromaDB persistent vector store wrapper."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """A single retrieved chunk with its similarity score."""

    id: str
    content: str
    score: float
    metadata: dict[str, Any] = field(default_factory=dict)


class ChromaStore:
    """
    Thin wrapper around ChromaDB for persistent, file-backed vector storage.

    All embeddings are supplied externally (by LocalEncoder) so this class
    never loads an embedding model itself.

    Args:
        persist_dir:     Directory where ChromaDB writes its SQLite + HNSW files.
        collection_name: Logical namespace for documents.
    """

    def __init__(self, persist_dir: str = "./chroma_db", collection_name: str = "apex_default") -> None:
        self.persist_dir = persist_dir
        self.collection_name = collection_name
        self._client = None
        self._collection = None

    def _ensure_connected(self) -> None:
        if self._client is not None:
            return
        try:
            import chromadb
        except ImportError as e:
            raise ImportError("Install chromadb: pip install chromadb") from e

        self._client = chromadb.PersistentClient(path=self.persist_dir)
        self._collection = self._client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(
            "ChromaDB ready: dir=%s, collection=%s, docs=%d",
            self.persist_dir,
            self.collection_name,
            self._collection.count(),
        )

    @property
    def collection(self):
        self._ensure_connected()
        return self._collection

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    def add(
        self,
        ids: list[str],
        embeddings: list[list[float]],
        documents: list[str],
        metadatas: list[dict[str, Any]] | None = None,
    ) -> None:
        """Upsert chunks into the collection (skips duplicates by id)."""
        if not ids:
            return
        # ChromaDB rejects empty {} metadata dicts — ensure every entry has at least one field
        if metadatas:
            metadatas = [m if m else {"_source": "unknown"} for m in metadatas]
        # ChromaDB upsert overwrites if id already exists
        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas if metadatas else None,
        )
        logger.debug("Upserted %d chunks into '%s'", len(ids), self.collection_name)

    def delete(self, ids: list[str]) -> None:
        self.collection.delete(ids=ids)

    def delete_by_source(self, source: str) -> None:
        """Remove all chunks whose metadata.source matches."""
        results = self.collection.get(where={"source": source})
        if results["ids"]:
            self.collection.delete(ids=results["ids"])
            logger.info("Deleted %d chunks for source '%s'", len(results["ids"]), source)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def query(
        self,
        query_embedding: list[float],
        top_k: int = 5,
        where: dict[str, Any] | None = None,
    ) -> list[SearchResult]:
        """Return top-k chunks ranked by cosine similarity."""
        kwargs: dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": min(top_k, self.count()),
            "include": ["documents", "metadatas", "distances"],
        }
        if where:
            kwargs["where"] = where

        if kwargs["n_results"] == 0:
            return []

        raw = self.collection.query(**kwargs)

        results: list[SearchResult] = []
        for doc_id, doc, meta, dist in zip(
            raw["ids"][0],
            raw["documents"][0],
            raw["metadatas"][0],
            raw["distances"][0],
        ):
            # ChromaDB cosine distance → similarity: score = 1 - distance
            results.append(
                SearchResult(
                    id=doc_id,
                    content=doc,
                    score=round(1.0 - dist, 4),
                    metadata=meta or {},
                )
            )
        return results

    def count(self) -> int:
        return self.collection.count()

    def list_sources(self) -> list[str]:
        """Return unique source values from stored metadata."""
        result = self.collection.get(include=["metadatas"])
        sources = {m.get("source", "") for m in (result["metadatas"] or []) if m}
        return sorted(sources)

    # ------------------------------------------------------------------
    # Management
    # ------------------------------------------------------------------

    def reset(self) -> None:
        """Delete and recreate the collection (destructive)."""
        self._ensure_connected()
        self._client.delete_collection(self.collection_name)
        self._collection = self._client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        logger.warning("Collection '%s' reset.", self.collection_name)
