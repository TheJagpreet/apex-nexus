"""Integration tests for Phase 2 pipeline features."""
import pytest
from unittest.mock import patch, MagicMock
from apex_rag import RAGPipeline
from apex_rag.config import Settings


def _make_settings(tmp_path, collection="test", **overrides):
    return Settings(
        persist_dir=str(tmp_path / "chroma"),
        collection=collection,
        embed_model="sentence-transformers/all-MiniLM-L6-v2",
        chunk_size=200,
        chunk_overlap=20,
        top_k=3,
        **overrides,
    )


@pytest.fixture(autouse=True)
def mock_encoder_encode():
    """Patch LocalEncoder so no real model is loaded in unit tests."""
    with patch("apex_rag.embeddings.encoder.LocalEncoder._load"):
        with patch("apex_rag.embeddings.encoder.LocalEncoder.encode") as me:
            me.side_effect = lambda texts: [[0.1] * 384 for _ in texts]
            with patch("apex_rag.embeddings.encoder.LocalEncoder.encode_one") as mo:
                mo.return_value = [0.1] * 384
                yield


# --- Deduplication ---

def test_dedup_skips_duplicate(tmp_path):
    cfg = _make_settings(tmp_path, dedup=True, dedup_store_dir=str(tmp_path / "dedup"))
    rag = RAGPipeline(settings=cfg)
    n1 = rag.ingest_text("Unique content for dedup test.", source="s1")
    n2 = rag.ingest_text("Unique content for dedup test.", source="s1")
    assert n1 > 0
    assert n2 == 0  # skipped


def test_dedup_allows_different_content(tmp_path):
    cfg = _make_settings(tmp_path, dedup=True, dedup_store_dir=str(tmp_path / "dedup"))
    rag = RAGPipeline(settings=cfg)
    n1 = rag.ingest_text("Content alpha.", source="s1")
    n2 = rag.ingest_text("Content beta.", source="s2")
    assert n1 > 0
    assert n2 > 0


# --- Embedding Cache ---

def test_embed_cache_enabled(tmp_path):
    cfg = _make_settings(
        tmp_path,
        embed_cache=True,
        embed_cache_dir=str(tmp_path / "emb_cache"),
    )
    rag = RAGPipeline(settings=cfg)
    from apex_rag.embeddings.cache import CachedEncoder
    assert isinstance(rag.encoder, CachedEncoder)


# --- Hybrid Search ---

def test_hybrid_search_enabled(tmp_path):
    cfg = _make_settings(tmp_path, hybrid_search=True)
    rag = RAGPipeline(settings=cfg)
    from apex_rag.retrieval.hybrid_retriever import HybridRetriever
    assert isinstance(rag.retriever, HybridRetriever)


def test_hybrid_query_returns_results(tmp_path):
    cfg = _make_settings(tmp_path, hybrid_search=True)
    rag = RAGPipeline(settings=cfg)
    rag.ingest_text("BM25 is a sparse retrieval algorithm used in search engines.", source="bm25")
    rag.ingest_text("Dense retrieval uses neural embeddings for semantic matching.", source="dense")
    result = rag.query("What is BM25?")
    assert result.answer
    assert len(result.sources) >= 1


# --- Metadata Filtering ---

def test_metadata_filter_restricts_results(tmp_path):
    cfg = _make_settings(tmp_path)
    rag = RAGPipeline(settings=cfg)
    rag.ingest_text("Python is a dynamic programming language.", source="python_docs")
    rag.ingest_text("Rust is a systems programming language.", source="rust_docs")

    result = rag.query("programming language", where={"source": "python_docs"})
    for s in result.sources:
        assert s["source"] == "python_docs"


# --- Ollama LLM (mocked) ---

def test_ollama_llm_integration(tmp_path):
    """Pipeline uses OllamaLLM when ollama_model is set (mocked)."""
    cfg = _make_settings(tmp_path, ollama_model="gemma3:4b")
    with patch("apex_rag.generation.ollama_llm.OllamaLLM.__call__") as mock_call:
        mock_call.return_value = "Mocked LLM answer"
        rag = RAGPipeline(settings=cfg)
        rag.ingest_text("Some context for LLM test.", source="ctx")
        result = rag.query("What is the context?")
        assert result.answer == "Mocked LLM answer"
        mock_call.assert_called_once()


# --- Multi-collection ---

def test_collection_manager_accessible(tmp_path):
    cfg = _make_settings(tmp_path)
    rag = RAGPipeline(settings=cfg)
    from apex_rag.vectorstore.collection_manager import CollectionManager
    assert isinstance(rag.collections, CollectionManager)


def test_ingest_into_named_collection(tmp_path):
    cfg_a = _make_settings(tmp_path, collection="col_a")
    cfg_b = _make_settings(tmp_path, collection="col_b")  # noqa: E501
    rag_a = RAGPipeline(settings=cfg_a)
    rag_b = RAGPipeline(settings=cfg_b)
    rag_a.ingest_text("Collection A content.", source="a")
    rag_b.ingest_text("Collection B content.", source="b")
    assert rag_a.count() >= 1
    assert rag_b.count() >= 1
    # Each collection is isolated
    assert rag_a.list_sources() == ["a"]
    assert rag_b.list_sources() == ["b"]
