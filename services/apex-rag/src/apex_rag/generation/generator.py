"""
Context assembler and generation stub.

Phase 1: assembles a prompt from retrieved chunks and returns it along with a
placeholder answer — so the full pipeline works end-to-end without requiring
a local LLM.

Phase 2+: swap in an Ollama/OpenAI-compatible call inside `_generate()`.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from ..vectorstore.chroma_store import SearchResult

logger = logging.getLogger(__name__)

_PROMPT_TEMPLATE = """\
You are a helpful assistant. Answer the question using ONLY the context below.
If the context does not contain enough information, say "I don't know."

Context:
{context}

Question: {question}

Answer:"""


@dataclass
class RAGResponse:
    """The full output of a RAG query."""

    question: str
    answer: str
    sources: list[dict[str, Any]] = field(default_factory=list)
    prompt: str = ""
    context: str = ""  # raw chunks joined — send this to apex-gateway, not the full prompt


class ContextAssembler:
    """
    Builds a prompt from retrieved chunks and calls an (optional) LLM.

    Args:
        llm_fn: Callable(prompt: str) -> str.  If None, returns the prompt
                itself as the answer (useful for testing without a local LLM).
        max_context_chars: Hard cap on context inserted into the prompt.
    """

    def __init__(
        self,
        llm_fn: Any | None = None,
        max_context_chars: int = 4096,
    ) -> None:
        self.llm_fn = llm_fn
        self.max_context_chars = max_context_chars

    def generate(self, question: str, results: list[SearchResult]) -> RAGResponse:
        # Build context string — most-relevant chunks first (already ranked)
        context_parts: list[str] = []
        total = 0
        for r in results:
            if total + len(r.content) > self.max_context_chars:
                break
            context_parts.append(r.content)
            total += len(r.content)

        context = "\n\n---\n\n".join(context_parts) if context_parts else "No context available."
        prompt = _PROMPT_TEMPLATE.format(context=context, question=question)

        if self.llm_fn is not None:
            answer = self.llm_fn(prompt)
        else:
            # Stub: surface the most relevant chunk as the answer
            answer = context_parts[0] if context_parts else "No relevant context found."
            logger.debug("No LLM configured — returning top chunk as answer.")

        sources = [
            {"id": r.id, "score": r.score, **r.metadata}
            for r in results
        ]

        return RAGResponse(question=question, answer=answer, sources=sources, prompt=prompt, context=context)
