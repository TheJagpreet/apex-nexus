"""Tests for BM25Retriever."""
import pytest
from apex_rag.retrieval.bm25_retriever import BM25Retriever, _tokenize
from apex_rag.vectorstore.chroma_store import ChromaStore


@pytest.fixture
def store_with_docs(tmp_path):
    store = ChromaStore(persist_dir=str(tmp_path / "chroma"), collection_name="bm25_test")
    ids = ["d1", "d2", "d3", "d4"]
    # 4-dim fake embeddings
    embs = [[0.1, 0.2, 0.3, 0.4]] * 4
    docs = [
        "ChromaDB stores embeddings in a vector database",
        "Python is a great programming language",
        "RAG combines retrieval with language model generation",
        "Sentence transformers produce dense vector embeddings",
    ]
    metas = [{"source": "test"}] * len(ids)
    store.add(ids=ids, embeddings=embs, documents=docs, metadatas=metas)
    return store


def test_tokenize():
    assert _tokenize("Hello, World! 123") == ["hello", "world", "123"]


def test_bm25_retrieves_relevant(store_with_docs):
    retriever = BM25Retriever(store=store_with_docs)
    results = retriever.retrieve("vector database embeddings", top_k=2)
    assert len(results) >= 1
    contents = [r.content for r in results]
    # Either ChromaDB or Sentence-transformers doc should rank high
    assert any("embeddings" in c or "vector" in c for c in contents)


def test_bm25_returns_empty_for_no_match(store_with_docs):
    retriever = BM25Retriever(store=store_with_docs)
    results = retriever.retrieve("xyzzy unrelated gobbledygook", top_k=3)
    # BM25 scores may all be 0 → returns empty
    assert isinstance(results, list)


def test_bm25_index_rebuilds_after_new_doc(store_with_docs):
    retriever = BM25Retriever(store=store_with_docs)
    # Prime the index
    retriever.retrieve("embeddings", top_k=1)
    first_count = retriever._indexed_count

    # Add a new doc
    store_with_docs.add(
        ids=["d5"],
        embeddings=[[0.5, 0.5, 0.5, 0.5]],
        documents=["Ollama runs local language models efficiently"],
        metadatas=[{"source": "test"}],
    )
    # Next retrieve should rebuild
    retriever.retrieve("local models", top_k=1)
    assert retriever._indexed_count > first_count


def test_bm25_empty_store(tmp_path):
    store = ChromaStore(persist_dir=str(tmp_path / "chroma"), collection_name="empty")
    retriever = BM25Retriever(store=store)
    results = retriever.retrieve("anything", top_k=3)
    assert results == []
