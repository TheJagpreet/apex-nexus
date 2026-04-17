"""Unit tests for LocalEncoder (uses real model — requires sentence-transformers)."""
import pytest
from apex_rag.embeddings.encoder import LocalEncoder


@pytest.fixture(scope="module")
def encoder():
    return LocalEncoder(model_name="sentence-transformers/all-MiniLM-L6-v2", device="cpu")


def test_encode_single(encoder):
    vec = encoder.encode_one("Hello world")
    assert isinstance(vec, list)
    assert len(vec) == 384
    assert all(isinstance(v, float) for v in vec)


def test_encode_batch(encoder):
    texts = ["sentence one", "sentence two", "sentence three"]
    vecs = encoder.encode(texts)
    assert len(vecs) == 3
    assert all(len(v) == 384 for v in vecs)


def test_encode_empty(encoder):
    assert encoder.encode([]) == []


def test_dim_property(encoder):
    assert encoder.dim == 384
