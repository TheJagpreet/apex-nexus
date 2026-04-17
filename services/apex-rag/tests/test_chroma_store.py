"""Integration tests for ChromaStore using an in-memory ChromaDB client."""
import pytest
import chromadb
from unittest.mock import patch, MagicMock
from apex_rag.vectorstore.chroma_store import ChromaStore, SearchResult


@pytest.fixture
def store(tmp_path):
    """ChromaStore backed by a real ephemeral ChromaDB instance."""
    s = ChromaStore(persist_dir=str(tmp_path / "chroma"), collection_name="test_col")
    return s


def _fake_embeddings(n: int, dim: int = 4) -> list[list[float]]:
    import random
    return [[random.random() for _ in range(dim)] for _ in range(n)]


def test_add_and_count(store):
    ids = ["a", "b", "c"]
    embs = _fake_embeddings(3)
    metas = [{"source": "f"}] * 3
    store.add(ids=ids, embeddings=embs, documents=["doc a", "doc b", "doc c"], metadatas=metas)
    assert store.count() == 3


def test_upsert_does_not_duplicate(store):
    ids = ["x"]
    embs = _fake_embeddings(1)
    store.add(ids=ids, embeddings=embs, documents=["original"], metadatas=[{"source": "f"}])
    store.add(ids=ids, embeddings=embs, documents=["updated"], metadatas=[{"source": "f"}])
    assert store.count() == 1


def test_delete(store):
    ids = ["d1", "d2"]
    embs = _fake_embeddings(2)
    store.add(ids=ids, embeddings=embs, documents=["d1 text", "d2 text"], metadatas=[{"source": "f"}] * 2)
    store.delete(["d1"])
    assert store.count() == 1


def test_query_returns_results(store):
    ids = ["q1", "q2"]
    embs = _fake_embeddings(2)
    store.add(ids=ids, embeddings=embs, documents=["text one", "text two"], metadatas=[{"source": "f"}] * 2)
    results = store.query(query_embedding=_fake_embeddings(1)[0], top_k=2)
    assert len(results) == 2
    assert all(isinstance(r, SearchResult) for r in results)


def test_list_sources(store):
    ids = ["s1", "s2"]
    embs = _fake_embeddings(2)
    store.add(
        ids=ids,
        embeddings=embs,
        documents=["text", "text"],
        metadatas=[{"source": "fileA.txt"}, {"source": "fileB.txt"}],
    )
    sources = store.list_sources()
    assert "fileA.txt" in sources
    assert "fileB.txt" in sources


def test_reset_clears_collection(store):
    ids = ["r1"]
    embs = _fake_embeddings(1)
    store.add(ids=ids, embeddings=embs, documents=["some text"], metadatas=[{"source": "f"}])
    store.reset()
    assert store.count() == 0
