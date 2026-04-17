"""Recursive character text splitter — mirrors LangChain's approach but dependency-free."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .loaders import Document


@dataclass
class Chunk:
    """A portion of a Document produced by a chunker."""

    content: str
    metadata: dict[str, Any] = field(default_factory=dict)
    chunk_index: int = 0


# Default separator hierarchy: paragraphs → sentences → words → chars
_DEFAULT_SEPARATORS = ["\n\n", "\n", ". ", " ", ""]


def _split_text(text: str, separators: list[str], chunk_size: int, chunk_overlap: int) -> list[str]:
    """Recursively split text using the separator hierarchy."""
    if not text:
        return []

    # Find the first separator that appears in the text
    sep = ""
    remaining_seps: list[str] = []
    for i, s in enumerate(separators):
        if s == "" or s in text:
            sep = s
            remaining_seps = separators[i + 1 :]
            break

    splits = text.split(sep) if sep else list(text)

    chunks: list[str] = []
    current_parts: list[str] = []
    current_len = 0

    for part in splits:
        part_len = len(part)

        # Recursively split any part that is too large on its own
        if part_len > chunk_size and remaining_seps:
            sub_chunks = _split_text(part, remaining_seps, chunk_size, chunk_overlap)
            for sc in sub_chunks:
                sc_len = len(sc)
                if current_len + sc_len + (len(sep) if current_parts else 0) > chunk_size:
                    if current_parts:
                        chunks.append(sep.join(current_parts))
                    # Slide the window: keep last overlap worth of parts
                    current_parts, current_len = _trim_overlap(current_parts, sep, chunk_overlap)
                current_parts.append(sc)
                current_len += sc_len + (len(sep) if len(current_parts) > 1 else 0)
            continue

        added_len = part_len + (len(sep) if current_parts else 0)
        if current_len + added_len > chunk_size and current_parts:
            chunks.append(sep.join(current_parts))
            current_parts, current_len = _trim_overlap(current_parts, sep, chunk_overlap)

        current_parts.append(part)
        current_len += part_len + (len(sep) if len(current_parts) > 1 else 0)

    if current_parts:
        chunks.append(sep.join(current_parts))

    return [c for c in chunks if c.strip()]


def _trim_overlap(parts: list[str], sep: str, overlap: int) -> tuple[list[str], int]:
    """Drop leading parts until the joined tail fits within `overlap` characters."""
    while parts:
        joined = sep.join(parts)
        if len(joined) <= overlap:
            break
        parts = parts[1:]
    length = len(sep.join(parts))
    return parts, length


class RecursiveChunker:
    """
    Splits a Document into overlapping chunks using a separator hierarchy.

    Args:
        chunk_size:    Maximum characters per chunk.
        chunk_overlap: Characters of overlap between consecutive chunks.
        separators:    Ordered list of separators to try (default: paragraph → newline → sentence → word → char).
    """

    def __init__(
        self,
        chunk_size: int = 512,
        chunk_overlap: int = 64,
        separators: list[str] | None = None,
    ) -> None:
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or _DEFAULT_SEPARATORS

    def split(self, document: Document) -> list[Chunk]:
        raw_chunks = _split_text(
            document.content,
            self.separators,
            self.chunk_size,
            self.chunk_overlap,
        )
        return [
            Chunk(
                content=text,
                metadata={**document.metadata, "doc_id": document.id},
                chunk_index=i,
            )
            for i, text in enumerate(raw_chunks)
        ]

    def split_many(self, documents: list[Document]) -> list[Chunk]:
        result: list[Chunk] = []
        for doc in documents:
            result.extend(self.split(doc))
        return result
