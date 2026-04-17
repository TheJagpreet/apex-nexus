"""
Ollama LLM integration — wraps the ollama Python client into a simple callable.

Usage:
    llm = OllamaLLM(model="gemma4:e4b")
    answer = llm("Your prompt here")
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


class OllamaLLM:
    """
    Callable wrapper around the Ollama Python SDK.

    Args:
        model:   Model name as listed in `ollama list`, e.g. "gemma4:e4b".
        host:    Ollama server URL (default: http://localhost:11434).
        options: Extra Ollama generate options (temperature, top_p, etc.).
    """

    def __init__(
        self,
        model: str,
        host: str = "http://localhost:11434",
        options: dict | None = None,
    ) -> None:
        self.model = model
        self.host = host
        self.options = options or {}
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                import ollama
            except ImportError as e:
                raise ImportError("Install ollama: pip install ollama") from e
            self._client = ollama.Client(host=self.host)
        return self._client

    def __call__(self, prompt: str) -> str:
        client = self._get_client()
        logger.debug("Calling Ollama model=%s, prompt_len=%d", self.model, len(prompt))
        response = client.generate(model=self.model, prompt=prompt, options=self.options)
        return response.response.strip()

    def is_available(self) -> bool:
        """Check if the Ollama server is reachable and the model is listed."""
        try:
            client = self._get_client()
            models = client.list()
            names = [m.model for m in models.models]
            return any(self.model in n for n in names)
        except Exception:
            return False
