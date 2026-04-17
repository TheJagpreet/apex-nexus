"""
Hybrid retriever — fuses dense (semantic) + sparse (BM25) results with
Reciprocal Rank Fusion (RRF).

RRF is scale-invariant: it merges ranked lists without caring about the
magnitude of scores from different systems, making it ideal for blending
cosine-similarity (0–1) with BM25 raw counts.

Reference: Cormack et al., "Reciprocal Rank Fusion outperforms Condorcet
and individual Rank Learning Methods" (SIGIR 2009).
"""
from __future__ import annotations

import logging
from typing import Any

from ..vectorstore.chroma_store import SearchResult
from .retriever import SemanticRetriever
from .bm25_retriever import BM25Retriever

logger = logging.getLogger(__name__)

_RRF_K = 60  # standard constant from the original paper


def _rrf_score(rank: int, k: int = _RRF_K) -> float:
    return 1.0 / (k + rank + 1)


class HybridRetriever:
    """
    Combines SemanticRetriever and BM25Retriever via Reciprocal Rank Fusion.

    Each retriever is called independently for `top_k * fetch_factor` results,
    then scores are fused and the top `top_k` are returned.

    Args:
        semantic:     SemanticRetriever instance.
        bm25:         BM25Retriever instance.
        top_k:        Final number of results to return.
        fetch_factor: Multiplier on top_k for each sub-retriever's fetch.
        semantic_weight: RRF weight for semantic results (default 1.0).
        bm25_weight:     RRF weight for BM25 results (default 1.0).
    """

    def __init__(
        self,
        semantic: SemanticRetriever,
        bm25: BM25Retriever,
        top_k: int = 5,
        fetch_factor: int = 3,
        semantic_weight: float = 1.0,
        bm25_weight: float = 1.0,
    ) -> None:
        self.semantic = semantic
        self.bm25 = bm25
        self.top_k = top_k
        self.fetch_factor = fetch_factor
        self.semantic_weight = semantic_weight
        self.bm25_weight = bm25_weight

    def retrieve(
        self,
        query: str,
        top_k: int | None = None,
        where: dict[str, Any] | None = None,
    ) -> list[SearchResult]:
        k = top_k if top_k is not None else self.top_k
        fetch = k * self.fetch_factor

        dense_results = self.semantic.retrieve(query, top_k=fetch, where=where)
        sparse_results = self.bm25.retrieve(query, top_k=fetch, where=where)

        return _fuse(
            dense_results,
            sparse_results,
            top_k=k,
            semantic_weight=self.semantic_weight,
            bm25_weight=self.bm25_weight,
        )


def _fuse(
    dense: list[SearchResult],
    sparse: list[SearchResult],
    top_k: int,
    semantic_weight: float,
    bm25_weight: float,
) -> list[SearchResult]:
    """Merge two ranked lists with RRF, preserving the winning SearchResult."""
    scores: dict[str, float] = {}
    best: dict[str, SearchResult] = {}

    for rank, result in enumerate(dense):
        scores[result.id] = scores.get(result.id, 0.0) + semantic_weight * _rrf_score(rank)
        best[result.id] = result

    for rank, result in enumerate(sparse):
        scores[result.id] = scores.get(result.id, 0.0) + bm25_weight * _rrf_score(rank)
        if result.id not in best:
            best[result.id] = result

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]

    fused: list[SearchResult] = []
    for doc_id, fused_score in ranked:
        r = best[doc_id]
        r.score = round(fused_score, 6)
        fused.append(r)

    logger.debug(
        "RRF fusion: %d dense + %d sparse → %d results",
        len(dense), len(sparse), len(fused),
    )
    return fused
