"""Tests for CollectionManager."""
import pytest
from apex_rag.vectorstore.collection_manager import CollectionManager


@pytest.fixture
def manager(tmp_path):
    return CollectionManager(persist_dir=str(tmp_path / "chroma"))


def test_create_and_list(manager):
    manager.create_collection("col_a")
    manager.create_collection("col_b")
    cols = manager.list_collections()
    names = [c.name for c in cols]
    assert "col_a" in names
    assert "col_b" in names


def test_create_idempotent(manager):
    manager.create_collection("same_col")
    manager.create_collection("same_col")  # should not raise
    cols = manager.list_collections()
    assert sum(1 for c in cols if c.name == "same_col") == 1


def test_delete_collection(manager):
    manager.create_collection("to_delete")
    manager.delete_collection("to_delete")
    assert not manager.collection_exists("to_delete")


def test_collection_exists(manager):
    assert not manager.collection_exists("ghost")
    manager.create_collection("real")
    assert manager.collection_exists("real")


def test_rename_collection(manager):
    manager.create_collection("old_name")
    manager.rename_collection("old_name", "new_name")
    assert manager.collection_exists("new_name")
    assert not manager.collection_exists("old_name")
