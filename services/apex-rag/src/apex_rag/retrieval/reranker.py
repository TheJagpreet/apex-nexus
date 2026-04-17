"""
Cross-encoder reranker — Phase 2 feature, gracefully skipped if not installed.

The reranker scores each (query, chunk) pair and re-orders results by that
fine-grained relevance score, which typically outperforms cosine similarity
for final ranking.
"""
from __future__ import annotations

import logging

from ..vectorstore.chroma_store import SearchResult

logger = logging.getLogger(__name__)

_DEFAULT_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"


class CrossEncoderReranker:
    """
    Reranks a list of SearchResults using a cross-encoder model.

    Falls back gracefully if sentence-transformers is not available.

    Args:
        model_name: HuggingFace cross-encoder model ID.
        max_length: Maximum token length for the cross-encoder.
    """

    def __init__(self, model_name: str = _DEFAULT_MODEL, max_length: int = 512) -> None:
        self.model_name = model_name
        self.max_length = max_length
        self._model = None

    def _load(self) -> bool:
        if self._model is not None:
            return True
        try:
            from sentence_transformers import CrossEncoder

            self._model = CrossEncoder(self.model_name, max_length=self.max_length)
            logger.info("Cross-encoder loaded: %s", self.model_name)
            return True
        except Exception as exc:
            logger.warning("CrossEncoder unavailable (%s) — skipping rerank.", exc)
            return False

    def rerank(self, query: str, results: list[SearchResult]) -> list[SearchResult]:
        """Return results sorted by cross-encoder score (highest first)."""
        if not results:
            return results

        if not self._load():
            return results  # graceful no-op

        import numpy as np

        pairs = [(query, r.content) for r in results]
        scores = self._model.predict(pairs)
        ranked = sorted(zip(scores, results), key=lambda x: x[0], reverse=True)
        reranked = []
        for score, result in ranked:
            result.score = float(score)
            reranked.append(result)
        return reranked
