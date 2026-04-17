"""Integration tests for the full RAGPipeline (mocks the embedding model)."""
import pytest
from unittest.mock import patch, MagicMock
from apex_rag import RAGPipeline
from apex_rag.config import Settings


@pytest.fixture
def mock_encoder():
    """Replace LocalEncoder.encode with a fixed-dimension stub."""
    with patch("apex_rag.embeddings.encoder.LocalEncoder._load"):
        with patch("apex_rag.embeddings.encoder.LocalEncoder.encode") as mock_enc:
            mock_enc.side_effect = lambda texts: [[0.1] * 384 for _ in texts]
            with patch("apex_rag.embeddings.encoder.LocalEncoder.encode_one") as mock_one:
                mock_one.return_value = [0.1] * 384
                yield


@pytest.fixture
def rag(tmp_path, mock_encoder):
    cfg = Settings(
        persist_dir=str(tmp_path / "chroma"),
        collection="test",
        embed_model="sentence-transformers/all-MiniLM-L6-v2",
        chunk_size=200,
        chunk_overlap=20,
        top_k=3,
    )
    return RAGPipeline(settings=cfg)


def test_ingest_text_returns_chunk_count(rag):
    n = rag.ingest_text("This is some content for testing the RAG pipeline ingestion.", source="test_src")
    assert n >= 1


def test_count_after_ingest(rag):
    rag.ingest_text("Content block one for testing.", source="s1")
    rag.ingest_text("Content block two for testing.", source="s2")
    assert rag.count() >= 2


def test_query_returns_response(rag):
    rag.ingest_text("ChromaDB uses HNSW for fast vector search.", source="chroma_notes")
    result = rag.query("How does ChromaDB search?")
    assert result.question == "How does ChromaDB search?"
    assert isinstance(result.answer, str)
    assert len(result.answer) > 0
    assert isinstance(result.sources, list)


def test_list_sources(rag):
    rag.ingest_text("Some text.", source="alpha.txt")
    rag.ingest_text("More text.", source="beta.txt")
    sources = rag.list_sources()
    assert "alpha.txt" in sources
    assert "beta.txt" in sources


def test_delete_source(rag):
    rag.ingest_text("To be deleted.", source="deleteme.txt")
    before = rag.count()
    rag.delete_source("deleteme.txt")
    assert rag.count() < before


def test_reset(rag):
    rag.ingest_text("Will be wiped.", source="temp.txt")
    rag.reset()
    assert rag.count() == 0


# ---------------------------------------------------------------------------
# File ingestion — txt and csv
# ---------------------------------------------------------------------------

DATA_DIR = __import__("pathlib").Path(__file__).parent.parent / "data"


def test_ingest_txt_file(rag):
    n = rag.ingest_file(DATA_DIR / "sample.txt")
    assert n >= 1


def test_ingest_csv_file(rag):
    n = rag.ingest_file(DATA_DIR / "synthetic_knowledge_items.csv")
    assert n >= 1


def test_ingest_csv_custom_text_col(rag, tmp_path):
    import csv
    p = tmp_path / "custom.csv"
    with p.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=["title", "body"])
        writer.writeheader()
        writer.writerow({"title": "T1", "body": "Dense retrieval uses neural embeddings."})
        writer.writerow({"title": "T2", "body": "BM25 is a classic sparse retrieval algorithm."})
    n = rag.ingest_file(p, text_col="body", topic_col="title")
    assert n >= 2


def test_ingest_csv_sources_tracked(rag):
    rag.ingest_file(DATA_DIR / "synthetic_knowledge_items.csv")
    sources = rag.list_sources()
    assert any("synthetic_knowledge_items" in s for s in sources)
