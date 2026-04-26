"""LLM-powered semantic tag generator for high-effort RAG ingestion.

Uses Ollama to generate structured tags per chunk, which are then appended
to the chunk text before embedding. This enriches the embedding vector to
capture the full semantic concept space of each chunk.
"""
from __future__ import annotations

import json
import logging

import httpx

logger = logging.getLogger(__name__)

_PROMPT = """\
You are a semantic indexing assistant. Analyse the text chunk below and generate 6–10 concise tags.

Tags must capture:
- Key concepts and topics discussed
- Named entities (people, organisations, technologies, places)
- Domain or subject area
- Processes, actions, or events described

Rules:
- Return ONLY a valid JSON array of lowercase tag strings
- No explanations, no prose, just the JSON array
- Each tag: 1–4 words, no punctuation except hyphens
- Example: ["machine-learning", "gradient-descent", "neural-network", "optimisation"]

Text chunk:
\"\"\"
{chunk}
\"\"\"

JSON array of tags:"""


class OllamaTagger:
    """Generates semantic tags for text chunks via the Ollama /api/generate endpoint.

    Args:
        model:   Ollama model name (e.g. "gemma4:e2b").
        host:    Ollama base URL (e.g. "http://localhost:11434").
        timeout: Per-chunk HTTP timeout in seconds.
    """

    def __init__(self, model: str, host: str, timeout: int = 60) -> None:
        self.model = model
        self.host = host.rstrip("/")
        self.timeout = timeout

    def tag_chunk(self, text: str) -> list[str]:
        """Return a list of semantic tags for *text*. Returns [] on any failure."""
        prompt = _PROMPT.format(chunk=text[:3000])
        try:
            resp = httpx.post(
                f"{self.host}/api/generate",
                json={"model": self.model, "prompt": prompt, "stream": False},
                timeout=self.timeout,
            )
            resp.raise_for_status()
            raw: str = resp.json().get("response", "").strip()
            # Extract first JSON array found in the response
            start = raw.find("[")
            end = raw.rfind("]") + 1
            if start >= 0 and end > start:
                tags = json.loads(raw[start:end])
                return [str(t).lower().strip() for t in tags if t and isinstance(t, str)]
        except Exception as exc:  # noqa: BLE001
            logger.warning("Tag generation failed for chunk (%.60s…): %s", text, exc)
        return []

    def tag_chunks(self, texts: list[str]) -> list[list[str]]:
        """Tag a list of chunks sequentially. Failures return [] for that chunk."""
        return [self.tag_chunk(t) for t in texts]


def enrich_text_with_tags(text: str, tags: list[str]) -> str:
    """Append tags to chunk text so the embedding captures both content and concepts."""
    if not tags:
        return text
    tag_line = ", ".join(tags)
    return f"{text}\n\nTopics: {tag_line}"
