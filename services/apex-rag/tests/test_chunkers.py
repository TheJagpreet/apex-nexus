"""Unit tests for the recursive chunker."""
import pytest
from apex_rag.ingestion.loaders import Document
from apex_rag.ingestion.chunkers import RecursiveChunker


def make_doc(text: str) -> Document:
    return Document(content=text, metadata={"source": "test"})


def test_short_text_is_single_chunk():
    chunker = RecursiveChunker(chunk_size=512, chunk_overlap=64)
    doc = make_doc("Hello world.")
    chunks = chunker.split(doc)
    assert len(chunks) == 1
    assert chunks[0].content == "Hello world."


def test_long_text_is_split():
    chunker = RecursiveChunker(chunk_size=50, chunk_overlap=10)
    text = "word " * 100  # 500 chars
    chunks = chunker.split(make_doc(text))
    assert len(chunks) > 1
    for c in chunks:
        assert len(c.content) <= 55  # allow small tolerance for separator


def test_chunk_indices_are_sequential():
    chunker = RecursiveChunker(chunk_size=50, chunk_overlap=5)
    doc = make_doc("paragraph one.\n\nparagraph two.\n\nparagraph three.\n\nparagraph four.")
    chunks = chunker.split(doc)
    for i, c in enumerate(chunks):
        assert c.chunk_index == i


def test_metadata_propagated():
    chunker = RecursiveChunker(chunk_size=50, chunk_overlap=5)
    doc = Document(content="Some text to split for testing purposes here.", metadata={"source": "file.txt", "author": "tester"})
    chunks = chunker.split(doc)
    for c in chunks:
        assert c.metadata["source"] == "file.txt"
        assert c.metadata["author"] == "tester"
        assert "doc_id" in c.metadata


def test_empty_document_returns_no_chunks():
    chunker = RecursiveChunker()
    chunks = chunker.split(make_doc(""))
    assert chunks == []


def test_split_many():
    chunker = RecursiveChunker(chunk_size=50, chunk_overlap=5)
    docs = [make_doc("Doc one content here."), make_doc("Doc two content here.")]
    chunks = chunker.split_many(docs)
    assert len(chunks) >= 2
