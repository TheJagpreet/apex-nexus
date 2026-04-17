"""Tests for ingestion loaders — txt and csv."""
import csv
import textwrap
from pathlib import Path

import pytest

from apex_rag.ingestion.loaders import (
    Document,
    load_csv,
    load_file,
    load_text,
    load_from_string,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

DATA_DIR = Path(__file__).parent.parent / "data"
SAMPLE_TXT = DATA_DIR / "sample.txt"
SAMPLE_CSV = DATA_DIR / "synthetic_knowledge_items.csv"


# ---------------------------------------------------------------------------
# TXT loader
# ---------------------------------------------------------------------------


def test_load_text_returns_document():
    doc = load_text(SAMPLE_TXT)
    assert isinstance(doc, Document)
    assert len(doc.content) > 0
    assert doc.metadata["type"] == "text"
    assert "source" in doc.metadata


def test_load_file_txt():
    doc = load_file(SAMPLE_TXT)
    assert isinstance(doc, Document)
    assert "ChromaDB" in doc.content


def test_load_file_unsupported_raises():
    with pytest.raises(ValueError, match="Unsupported file type"):
        load_file(Path("some/file.xyz"))


# ---------------------------------------------------------------------------
# CSV loader — fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def simple_csv(tmp_path: Path) -> Path:
    """A small CSV with ki_topic and ki_text columns."""
    p = tmp_path / "test.csv"
    rows = [
        {"ki_topic": "Alpha", "ki_text": "Alpha content about retrieval."},
        {"ki_topic": "Beta", "ki_text": "Beta content about embeddings."},
        {"ki_topic": "Gamma", "ki_text": "Gamma content about chunking."},
    ]
    with p.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=["ki_topic", "ki_text"])
        writer.writeheader()
        writer.writerows(rows)
    return p


@pytest.fixture()
def csv_with_blank_rows(tmp_path: Path) -> Path:
    """CSV where one ki_text cell is empty — should be skipped."""
    p = tmp_path / "blanks.csv"
    with p.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=["ki_topic", "ki_text"])
        writer.writeheader()
        writer.writerow({"ki_topic": "A", "ki_text": "Has content."})
        writer.writerow({"ki_topic": "B", "ki_text": ""})   # blank — skip
        writer.writerow({"ki_topic": "C", "ki_text": "Also has content."})
    return p


@pytest.fixture()
def custom_col_csv(tmp_path: Path) -> Path:
    """CSV with a non-default text column name."""
    p = tmp_path / "custom.csv"
    with p.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=["title", "body"])
        writer.writeheader()
        writer.writerow({"title": "T1", "body": "Body one."})
        writer.writerow({"title": "T2", "body": "Body two."})
    return p


# ---------------------------------------------------------------------------
# CSV loader — tests
# ---------------------------------------------------------------------------


def test_load_csv_returns_list_of_documents(simple_csv):
    docs = load_csv(simple_csv)
    assert isinstance(docs, list)
    assert all(isinstance(d, Document) for d in docs)


def test_load_csv_row_count(simple_csv):
    docs = load_csv(simple_csv)
    assert len(docs) == 3


def test_load_csv_content_is_ki_text(simple_csv):
    docs = load_csv(simple_csv)
    assert docs[0].content == "Alpha content about retrieval."
    assert docs[1].content == "Beta content about embeddings."


def test_load_csv_topic_in_metadata(simple_csv):
    docs = load_csv(simple_csv)
    assert docs[0].metadata["topic"] == "Alpha"
    assert docs[2].metadata["topic"] == "Gamma"


def test_load_csv_source_in_metadata(simple_csv):
    docs = load_csv(simple_csv)
    for doc in docs:
        assert "source" in doc.metadata
        assert "test.csv" in doc.metadata["source"]


def test_load_csv_row_index_in_metadata(simple_csv):
    docs = load_csv(simple_csv)
    assert docs[0].metadata["row"] == 0
    assert docs[2].metadata["row"] == 2


def test_load_csv_skips_blank_rows(csv_with_blank_rows):
    docs = load_csv(csv_with_blank_rows)
    assert len(docs) == 2
    assert all(d.content for d in docs)


def test_load_csv_custom_text_col(custom_col_csv):
    docs = load_csv(custom_col_csv, text_col="body", topic_col="title")
    assert len(docs) == 2
    assert docs[0].content == "Body one."
    assert docs[0].metadata["topic"] == "T1"


def test_load_csv_missing_text_col_raises(simple_csv):
    with pytest.raises(ValueError, match="not found"):
        load_csv(simple_csv, text_col="nonexistent_col")


def test_load_csv_no_topic_col(simple_csv):
    docs = load_csv(simple_csv, topic_col=None)
    for doc in docs:
        assert "topic" not in doc.metadata


def test_load_csv_documents_have_unique_ids(simple_csv):
    docs = load_csv(simple_csv)
    ids = [d.id for d in docs]
    assert len(ids) == len(set(ids)), "Duplicate IDs detected"


# ---------------------------------------------------------------------------
# Sample data files — smoke tests
# ---------------------------------------------------------------------------


def test_sample_txt_loadable():
    """Ensures data/sample.txt is present and non-empty."""
    assert SAMPLE_TXT.exists(), f"Missing: {SAMPLE_TXT}"
    doc = load_text(SAMPLE_TXT)
    assert len(doc.content) > 50


def test_sample_csv_loadable():
    """Ensures data/synthetic_knowledge_items.csv is present and loads rows."""
    assert SAMPLE_CSV.exists(), f"Missing: {SAMPLE_CSV}"
    docs = load_csv(SAMPLE_CSV)
    assert len(docs) > 0
    for doc in docs:
        assert doc.content
        assert "source" in doc.metadata
