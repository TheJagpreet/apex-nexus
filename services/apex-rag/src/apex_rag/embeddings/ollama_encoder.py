"""
Ollama-backed embedding encoder.

Uses Ollama's /api/embed endpoint — fully local, zero HuggingFace traffic.
Drop-in replacement for LocalEncoder: same interface (encode, encode_one, dim, model_name).

Recommended models (pull before use):
  ollama pull nomic-embed-text   # 274 MB, 768-dim, best quality
  ollama pull all-minilm         # 23 MB,  384-dim, fastest / smallest
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


class OllamaEncoder:
    """
    Embeds text via a locally running Ollama server.

    Args:
        model:      Ollama model name, e.g. "nomic-embed-text" or "all-minilm".
        host:       Ollama server URL (default: http://localhost:11434).
        batch_size: Max texts per embed request.
    """

    def __init__(
        self,
        model: str = "nomic-embed-text",
        host: str = "http://localhost:11434",
        batch_size: int = 64,
    ) -> None:
        self.model_name = model   # matches LocalEncoder attribute name (used by CachedEncoder)
        self._host = host
        self.batch_size = batch_size
        self._client = None
        self._dim: int | None = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_client(self):
        if self._client is None:
            try:
                import ollama
            except ImportError as exc:
                raise ImportError(
                    "ollama package not found. Install it: pip install ollama"
                ) from exc
            self._client = ollama.Client(host=self._host)
        return self._client

    # ------------------------------------------------------------------
    # Public interface (mirrors LocalEncoder)
    # ------------------------------------------------------------------

    @property
    def dim(self) -> int:
        if self._dim is None:
            resp = self._get_client().embed(model=self.model_name, input=["probe"])
            self._dim = len(resp.embeddings[0])
            logger.debug("OllamaEncoder dim=%d (model=%s)", self._dim, self.model_name)
        return self._dim

    def encode(self, texts: list[str]) -> list[list[float]]:
        """Embed a list of texts. Returns a list of float vectors."""
        if not texts:
            return []

        client = self._get_client()
        results: list[list[float]] = []

        for start in range(0, len(texts), self.batch_size):
            batch = texts[start : start + self.batch_size]
            try:
                resp = client.embed(model=self.model_name, input=batch)
            except Exception as exc:
                raise RuntimeError(
                    f"Ollama embed call failed (model={self.model_name}, host={self._host}). "
                    f"Is Ollama running and the model pulled?  Original error: {exc}"
                ) from exc
            results.extend(resp.embeddings)

        return results

    def encode_one(self, text: str) -> list[float]:
        return self.encode([text])[0]
