"""Tests for DedupStore."""
import pytest
from apex_rag.ingestion.dedup import DedupStore


@pytest.fixture
def dedup(tmp_path):
    return DedupStore(store_dir=str(tmp_path / "dedup"))


def test_new_content_is_not_seen(dedup):
    assert not dedup.is_seen("brand new content")


def test_mark_then_seen(dedup):
    dedup.mark_seen("some text")
    assert dedup.is_seen("some text")


def test_different_content_not_seen(dedup):
    dedup.mark_seen("content A")
    assert not dedup.is_seen("content B")


def test_forget(dedup):
    dedup.mark_seen("forget me")
    dedup.forget("forget me")
    assert not dedup.is_seen("forget me")


def test_count(dedup):
    dedup.mark_seen("one")
    dedup.mark_seen("two")
    assert dedup.count() == 2


def test_clear(dedup):
    dedup.mark_seen("a")
    dedup.mark_seen("b")
    dedup.clear()
    assert dedup.count() == 0
    assert not dedup.is_seen("a")
