"""Semantic retriever — embeds a query and searches the vector store."""
from __future__ import annotations

from typing import Any

from ..embeddings.encoder import LocalEncoder
from ..vectorstore.chroma_store import ChromaStore, SearchResult


class SemanticRetriever:
    """
    Embeds a query with LocalEncoder and fetches top-k chunks from ChromaStore.

    Args:
        encoder:  LocalEncoder instance.
        store:    ChromaStore instance.
        top_k:    Default number of results to return.
    """

    def __init__(self, encoder: LocalEncoder, store: ChromaStore, top_k: int = 5) -> None:
        self.encoder = encoder
        self.store = store
        self.top_k = top_k

    def retrieve(
        self,
        query: str,
        top_k: int | None = None,
        where: dict[str, Any] | None = None,
    ) -> list[SearchResult]:
        """
        Embed *query* and return ranked chunks.

        Args:
            query:  Natural-language question.
            top_k:  Override the instance default.
            where:  Optional ChromaDB metadata filter dict, e.g. {"source": "paper.pdf"}.
        """
        k = top_k if top_k is not None else self.top_k
        query_vec = self.encoder.encode_one(query)
        return self.store.query(query_vec, top_k=k, where=where)
