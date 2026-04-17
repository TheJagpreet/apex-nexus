"""Tests for CachedEncoder."""
import pytest
from unittest.mock import MagicMock, patch
from apex_rag.embeddings.cache import CachedEncoder
from apex_rag.embeddings.encoder import LocalEncoder


@pytest.fixture
def mock_encoder():
    enc = MagicMock(spec=LocalEncoder)
    enc.model_name = "test-model"
    enc.dim = 4
    enc.encode.side_effect = lambda texts: [[0.1, 0.2, 0.3, 0.4] for _ in texts]
    return enc


@pytest.fixture
def cached_encoder(tmp_path, mock_encoder):
    return CachedEncoder(encoder=mock_encoder, cache_dir=str(tmp_path / "emb_cache"))


def test_first_encode_calls_underlying(cached_encoder, mock_encoder):
    cached_encoder.encode(["hello", "world"])
    mock_encoder.encode.assert_called_once_with(["hello", "world"])


def test_second_encode_uses_cache(cached_encoder, mock_encoder):
    cached_encoder.encode(["cached text"])
    cached_encoder.encode(["cached text"])
    # Underlying encoder called only once across both invocations
    assert mock_encoder.encode.call_count == 1


def test_partial_cache_hit(cached_encoder, mock_encoder):
    cached_encoder.encode(["first"])
    mock_encoder.encode.reset_mock()
    mock_encoder.encode.side_effect = lambda texts: [[0.5, 0.5, 0.5, 0.5] for _ in texts]

    result = cached_encoder.encode(["first", "second"])
    # Only "second" should be a miss
    mock_encoder.encode.assert_called_once_with(["second"])
    assert len(result) == 2


def test_encode_one(cached_encoder):
    vec = cached_encoder.encode_one("single text")
    assert len(vec) == 4


def test_cache_stats(cached_encoder):
    cached_encoder.encode(["a", "b", "c"])
    stats = cached_encoder.cache_stats()
    assert stats["item_count"] == 3


def test_clear_cache(cached_encoder, mock_encoder):
    cached_encoder.encode(["to be cleared"])
    cached_encoder.clear_cache()
    mock_encoder.encode.reset_mock()
    mock_encoder.encode.side_effect = lambda texts: [[0.1] * 4 for _ in texts]
    cached_encoder.encode(["to be cleared"])
    mock_encoder.encode.assert_called_once()
