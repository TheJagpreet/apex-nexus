"""Document loaders — convert files and raw text into Document objects."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class Document:
    """A piece of source content with metadata."""

    content: str
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def id(self) -> str:
        """Stable content-hash ID — used for deduplication."""
        return hashlib.sha256(self.content.encode()).hexdigest()[:16]


def load_text(path: str | Path) -> Document:
    path = Path(path)
    return Document(
        content=path.read_text(encoding="utf-8"),
        metadata={"source": str(path), "type": "text"},
    )


def load_markdown(path: str | Path) -> Document:
    path = Path(path)
    return Document(
        content=path.read_text(encoding="utf-8"),
        metadata={"source": str(path), "type": "markdown"},
    )


def load_pdf(path: str | Path) -> Document:
    try:
        from pypdf import PdfReader
    except ImportError as e:
        raise ImportError("Install pypdf: pip install pypdf") from e

    path = Path(path)
    reader = PdfReader(str(path))
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages.append(text)

    return Document(
        content="\n\n".join(pages),
        metadata={"source": str(path), "type": "pdf", "pages": len(reader.pages)},
    )


def load_html(path: str | Path) -> Document:
    """Basic HTML loader — strips tags, extracts visible text."""
    import re

    path = Path(path)
    raw = path.read_text(encoding="utf-8")
    # Strip script/style blocks
    raw = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", raw, flags=re.DOTALL | re.IGNORECASE)
    # Strip remaining tags
    text = re.sub(r"<[^>]+>", " ", raw)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return Document(
        content=text,
        metadata={"source": str(path), "type": "html"},
    )


def load_from_string(text: str, source: str = "inline", **extra_meta: Any) -> Document:
    return Document(
        content=text,
        metadata={"source": source, "type": "string", **extra_meta},
    )


def load_csv(
    path: str | Path,
    text_col: str = "ki_text",
    topic_col: str | None = "ki_topic",
) -> list[Document]:
    """
    Load a CSV file as a list of Documents — one per row.

    Each row's ``text_col`` value becomes the document content.  If
    ``topic_col`` is set it is stored in ``metadata["topic"]``.  The
    file path is always stored in ``metadata["source"]``.

    Args:
        path:      Path to the ``.csv`` file.
        text_col:  Column whose value is used as document content.
                   Defaults to ``"ki_text"`` (apex-rag sample format).
        topic_col: Optional column used as a topic / category label.
                   Set to ``None`` to ignore.  Defaults to ``"ki_topic"``.

    Raises:
        ValueError: If ``text_col`` is not found in the CSV header.
    """
    import csv

    path = Path(path)
    documents: list[Document] = []

    with path.open(encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        if reader.fieldnames is None or text_col not in reader.fieldnames:
            raise ValueError(
                f"Column '{text_col}' not found in {path.name}. "
                f"Available columns: {list(reader.fieldnames or [])}"
            )
        for i, row in enumerate(reader):
            content = row[text_col].strip()
            if not content:
                continue
            meta: dict = {"source": str(path), "type": "csv", "row": i}
            if topic_col and topic_col in row and row[topic_col].strip():
                meta["topic"] = row[topic_col].strip()
            documents.append(Document(content=content, metadata=meta))

    return documents


def load_file(path: str | Path) -> Document:
    """
    Auto-detect file type and return a single Document.

    For multi-document formats (CSV) use :func:`load_csv` directly or
    call :py:meth:`~apex_rag.pipeline.RAGPipeline.ingest_file`, which
    handles both single- and multi-document paths transparently.
    """
    path = Path(path)
    suffix = path.suffix.lower()
    loaders = {
        ".txt": load_text,
        ".md": load_markdown,
        ".markdown": load_markdown,
        ".pdf": load_pdf,
        ".html": load_html,
        ".htm": load_html,
    }
    loader = loaders.get(suffix)
    if loader is None:
        raise ValueError(f"Unsupported file type '{suffix}'. Supported: {list(loaders)} (CSV: use load_csv)")
    return loader(path)
