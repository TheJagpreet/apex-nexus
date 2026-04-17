"""Local embedding encoder backed by sentence-transformers."""
from __future__ import annotations

import logging
import os
from typing import TYPE_CHECKING

from tqdm import tqdm

if TYPE_CHECKING:
    import numpy as np

logger = logging.getLogger(__name__)


class LocalEncoder:
    """
    Wraps a SentenceTransformer model for batched, local embedding.

    The model is loaded lazily on first use — no GPU/memory is allocated
    until `encode()` is actually called.

    Args:
        model_name:  HuggingFace model ID, e.g. "sentence-transformers/all-MiniLM-L6-v2"
        device:      "cpu" (default) or "cuda"
        batch_size:  Number of texts encoded per forward pass.
        show_progress: Show tqdm bar during large batches.
    """

    def __init__(
        self,
        model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
        device: str = "cpu",
        batch_size: int = 64,
        show_progress: bool = False,
        cache_dir: str = "./models",
    ) -> None:
        self.model_name = model_name
        self.device = device
        self.batch_size = batch_size
        self.show_progress = show_progress
        self.cache_dir = cache_dir
        self._model = None

    def _load(self) -> None:
        if self._model is not None:
            return
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as e:
            raise ImportError("Install sentence-transformers: pip install sentence-transformers") from e

        # Detect if the model is already downloaded locally so we can skip
        # all HuggingFace network checks (HEAD requests) on subsequent runs.
        model_slug = "models--" + self.model_name.replace("/", "--")
        is_cached = os.path.isdir(os.path.join(self.cache_dir, model_slug))

        logger.info(
            "Loading embedding model: %s on %s (cache=%s, offline=%s)",
            self.model_name, self.device, self.cache_dir, is_cached,
        )
        self._model = SentenceTransformer(
            self.model_name,
            device=self.device,
            cache_folder=self.cache_dir,
            local_files_only=is_cached,
        )
        logger.info("Model loaded. Embedding dim: %d", self._model.get_embedding_dimension())

    @property
    def dim(self) -> int:
        self._load()
        return self._model.get_embedding_dimension()

    def encode(self, texts: list[str]) -> list[list[float]]:
        """Encode a list of texts into float vectors."""
        if not texts:
            return []
        self._load()

        results: list[list[float]] = []
        batches = range(0, len(texts), self.batch_size)
        if self.show_progress:
            batches = tqdm(batches, desc="Embedding", unit="batch")

        for start in batches:
            batch = texts[start : start + self.batch_size]
            vecs = self._model.encode(batch, convert_to_numpy=True, show_progress_bar=False)
            results.extend(vecs.tolist())

        return results

    def encode_one(self, text: str) -> list[float]:
        return self.encode([text])[0]
