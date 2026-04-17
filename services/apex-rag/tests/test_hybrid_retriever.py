"""Tests for HybridRetriever (RRF fusion)."""
import pytest
from unittest.mock import MagicMock
from apex_rag.retrieval.hybrid_retriever import HybridRetriever, _fuse, _rrf_score
from apex_rag.vectorstore.chroma_store import SearchResult


def _make_result(id: str, content: str, score: float = 0.9) -> SearchResult:
    return SearchResult(id=id, content=content, score=score)


def test_rrf_score_decreases_with_rank():
    assert _rrf_score(0) > _rrf_score(1) > _rrf_score(10)


def test_fuse_deduplicates():
    dense = [_make_result("a", "doc a"), _make_result("b", "doc b")]
    sparse = [_make_result("b", "doc b"), _make_result("c", "doc c")]
    fused = _fuse(dense, sparse, top_k=5, semantic_weight=1.0, bm25_weight=1.0)
    ids = [r.id for r in fused]
    assert len(ids) == len(set(ids))  # no duplicates


def test_fuse_promotes_overlap():
    """A doc appearing in both lists should score higher than one in only one."""
    dense = [_make_result("shared", "shared doc"), _make_result("dense_only", "dense only")]
    sparse = [_make_result("shared", "shared doc"), _make_result("sparse_only", "sparse only")]
    fused = _fuse(dense, sparse, top_k=3, semantic_weight=1.0, bm25_weight=1.0)
    assert fused[0].id == "shared"


def test_fuse_respects_top_k():
    dense = [_make_result(f"d{i}", f"doc {i}") for i in range(10)]
    sparse = [_make_result(f"s{i}", f"sdoc {i}") for i in range(10)]
    fused = _fuse(dense, sparse, top_k=3, semantic_weight=1.0, bm25_weight=1.0)
    assert len(fused) == 3


def test_hybrid_retriever_calls_both():
    sem = MagicMock()
    bm25 = MagicMock()
    sem.retrieve.return_value = [_make_result("a", "doc a")]
    bm25.retrieve.return_value = [_make_result("b", "doc b")]

    hybrid = HybridRetriever(semantic=sem, bm25=bm25, top_k=2)
    results = hybrid.retrieve("test query")

    sem.retrieve.assert_called_once()
    bm25.retrieve.assert_called_once()
    assert len(results) <= 2
