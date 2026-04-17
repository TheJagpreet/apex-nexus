"""
Document deduplication and incremental ingestion tracker.

Persists a set of content-hash fingerprints to disk (via diskcache) so that
re-ingesting the same file or text across sessions is a no-op.
"""
from __future__ import annotations

import hashlib
import logging

logger = logging.getLogger(__name__)

_SENTINEL = True  # value stored per hash key


def _doc_hash(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()


class DedupStore:
    """
    Tracks which document hashes have already been ingested.

    Args:
        store_dir: Directory for the diskcache (separate from embedding cache).
    """

    def __init__(self, store_dir: str = "./dedup_store") -> None:
        self.store_dir = store_dir
        self._cache = None

    def _get(self):
        if self._cache is None:
            try:
                import diskcache
            except ImportError as e:
                raise ImportError("Install diskcache: pip install diskcache") from e
            self._cache = diskcache.Cache(self.store_dir)
        return self._cache

    def is_seen(self, content: str) -> bool:
        """Return True if this exact content was previously ingested."""
        h = _doc_hash(content)
        return self._get().get(h) is not None

    def mark_seen(self, content: str) -> None:
        h = _doc_hash(content)
        self._get().set(h, _SENTINEL)

    def forget(self, content: str) -> None:
        """Remove a hash so the document will be re-ingested next time."""
        h = _doc_hash(content)
        self._get().delete(h)

    def count(self) -> int:
        return len(self._get())

    def clear(self) -> None:
        self._get().clear()
        logger.info("Dedup store cleared.")
