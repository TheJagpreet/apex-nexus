"""
Disk-backed embedding cache using diskcache.

Wraps any encoder (LocalEncoder or OllamaEncoder) and caches results by
SHA-256 of the input text so identical strings are never re-embedded across sessions.
"""
from __future__ import annotations

import hashlib
import logging
from typing import Any

logger = logging.getLogger(__name__)


def _key(text: str, model: str) -> str:
    h = hashlib.sha256(f"{model}::{text}".encode()).hexdigest()
    return h


class CachedEncoder:
    """
    Drop-in wrapper that adds transparent disk caching to any encoder.

    Args:
        encoder:    Any encoder with encode() / encode_one() / dim / model_name.
        cache_dir:  Directory for the diskcache store (created if needed).
        max_size:   Cache size cap in bytes (default 2 GB).
    """

    def __init__(
        self,
        encoder: Any,
        cache_dir: str = "./embedding_cache",
        max_size: int = 2 * 1024 ** 3,
    ) -> None:
        self.encoder = encoder
        self.cache_dir = cache_dir
        self._cache = None
        self._max_size = max_size

    def _get_cache(self):
        if self._cache is None:
            try:
                import diskcache
            except ImportError as e:
                raise ImportError("Install diskcache: pip install diskcache") from e
            self._cache = diskcache.Cache(self.cache_dir, size_limit=self._max_size)
        return self._cache

    @property
    def dim(self) -> int:
        return self.encoder.dim

    @property
    def model_name(self) -> str:
        return self.encoder.model_name

    def encode(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        cache = self._get_cache()
        model = self.encoder.model_name
        results: list[list[float] | None] = [None] * len(texts)
        miss_indices: list[int] = []
        miss_texts: list[str] = []

        # Cache lookup
        for i, text in enumerate(texts):
            key = _key(text, model)
            hit = cache.get(key)
            if hit is not None:
                results[i] = hit
            else:
                miss_indices.append(i)
                miss_texts.append(text)

        hit_count = len(texts) - len(miss_indices)
        if hit_count:
            logger.debug("Embedding cache: %d hits, %d misses", hit_count, len(miss_indices))

        # Encode only misses
        if miss_texts:
            fresh = self.encoder.encode(miss_texts)
            for i, idx in enumerate(miss_indices):
                vec = fresh[i]
                results[idx] = vec
                cache.set(_key(miss_texts[i], model), vec)

        return results  # type: ignore[return-value]

    def encode_one(self, text: str) -> list[float]:
        return self.encode([text])[0]

    def cache_stats(self) -> dict:
        cache = self._get_cache()
        return {"size_bytes": cache.volume(), "item_count": len(cache)}

    def clear_cache(self) -> None:
        self._get_cache().clear()
        logger.info("Embedding cache cleared.")
