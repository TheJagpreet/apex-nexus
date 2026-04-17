"""
Multi-collection manager — create, list, delete, and switch ChromaDB collections.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class CollectionInfo:
    name: str
    doc_count: int


class CollectionManager:
    """
    Manages multiple named ChromaDB collections within a single persist directory.

    Args:
        persist_dir: Shared ChromaDB directory.
    """

    def __init__(self, persist_dir: str = "./chroma_db") -> None:
        self.persist_dir = persist_dir
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                import chromadb
            except ImportError as e:
                raise ImportError("Install chromadb: pip install chromadb") from e
            self._client = chromadb.PersistentClient(path=self.persist_dir)
        return self._client

    def list_collections(self) -> list[CollectionInfo]:
        """Return all collections with their document counts."""
        client = self._get_client()
        collections = client.list_collections()
        result = []
        for col in collections:
            c = client.get_collection(col.name)
            result.append(CollectionInfo(name=col.name, doc_count=c.count()))
        return sorted(result, key=lambda x: x.name)

    def create_collection(self, name: str) -> None:
        """Create a collection (no-op if it already exists)."""
        client = self._get_client()
        client.get_or_create_collection(name=name, metadata={"hnsw:space": "cosine"})
        logger.info("Collection '%s' created/confirmed.", name)

    def delete_collection(self, name: str) -> None:
        """Delete a collection and all its data. Irreversible."""
        client = self._get_client()
        client.delete_collection(name=name)
        logger.warning("Collection '%s' deleted.", name)

    def rename_collection(self, old_name: str, new_name: str) -> None:
        """ChromaDB doesn't support native rename — copy + delete."""
        client = self._get_client()
        old_col = client.get_collection(old_name)
        new_col = client.get_or_create_collection(new_name, metadata={"hnsw:space": "cosine"})

        data = old_col.get(include=["documents", "metadatas", "embeddings"])
        if data["ids"]:
            new_col.upsert(
                ids=data["ids"],
                documents=data["documents"],
                metadatas=data["metadatas"],
                embeddings=data["embeddings"],
            )
        client.delete_collection(old_name)
        logger.info("Collection renamed: '%s' → '%s' (%d docs)", old_name, new_name, len(data["ids"]))

    def collection_exists(self, name: str) -> bool:
        cols = self._get_client().list_collections()
        return any(c.name == name for c in cols)
