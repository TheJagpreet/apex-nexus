"""
BM25 sparse retriever — keyword-based complement to semantic search.

Maintains a BM25 index that mirrors the ChromaDB collection. The index is
rebuilt lazily whenever the document count changes (cheap enough for <100k docs).
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any

from ..vectorstore.chroma_store import ChromaStore, SearchResult

logger = logging.getLogger(__name__)


def _tokenize(text: str) -> list[str]:
    """Lowercase word tokenizer — fast and dependency-free."""
    return re.findall(r"[a-z0-9]+", text.lower())


class BM25Retriever:
    """
    Sparse retriever using BM25 over the documents stored in ChromaStore.

    The index is rebuilt lazily when the document count in ChromaDB changes,
    so it always stays in sync without requiring explicit refresh calls.

    Args:
        store:         ChromaStore to read documents from.
        tokenizer_fn:  Optional custom tokenizer (text -> list[str]).
    """

    def __init__(self, store: ChromaStore, tokenizer_fn=None) -> None:
        self.store = store
        self._tokenizer = tokenizer_fn or _tokenize
        self._bm25 = None
        self._corpus_ids: list[str] = []
        self._corpus_docs: list[str] = []
        self._corpus_meta: list[dict[str, Any]] = []
        self._indexed_count: int = -1

    def _ensure_index(self) -> None:
        current_count = self.store.count()
        if current_count == self._indexed_count:
            return  # already up to date

        if current_count == 0:
            self._bm25 = None
            self._indexed_count = 0
            return

        try:
            from rank_bm25 import BM25Okapi
        except ImportError as e:
            raise ImportError("Install rank-bm25: pip install rank-bm25") from e

        logger.debug("(Re)building BM25 index over %d documents...", current_count)
        result = self.store.collection.get(include=["documents", "metadatas"])
        self._corpus_ids = result["ids"]
        self._corpus_docs = result["documents"]
        self._corpus_meta = result["metadatas"] or [{} for _ in self._corpus_ids]

        tokenized = [self._tokenizer(doc) for doc in self._corpus_docs]
        self._bm25 = BM25Okapi(tokenized)
        self._indexed_count = current_count
        logger.debug("BM25 index ready (%d docs).", current_count)

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        where: dict[str, Any] | None = None,
    ) -> list[SearchResult]:
        """Return top-k documents ranked by BM25 score."""
        self._ensure_index()
        if self._bm25 is None or not self._corpus_ids:
            return []

        tokens = self._tokenizer(query)
        scores = self._bm25.get_scores(tokens)

        # Pair up and sort descending
        ranked = sorted(
            enumerate(scores), key=lambda x: x[1], reverse=True
        )

        results: list[SearchResult] = []
        for idx, score in ranked[:top_k]:
            if score <= 0:
                break
            meta = self._corpus_meta[idx] or {}
            # Apply simple metadata filter if provided
            if where and not _matches_where(meta, where):
                continue
            results.append(
                SearchResult(
                    id=self._corpus_ids[idx],
                    content=self._corpus_docs[idx],
                    score=float(score),
                    metadata=meta,
                )
            )
        return results[:top_k]


def _matches_where(meta: dict[str, Any], where: dict[str, Any]) -> bool:
    """Minimal equality filter matching ChromaDB's flat where syntax."""
    for key, value in where.items():
        if meta.get(key) != value:
            return False
    return True
