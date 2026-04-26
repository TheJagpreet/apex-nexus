from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="APEX_RAG_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Storage
    persist_dir: str = Field(default="./chroma_db", description="ChromaDB persistence directory")
    collection: str = Field(default="apex_default", description="Default collection name")

    # Embedding backend
    embed_backend: str = Field(
        default="ollama",
        description="'ollama' (recommended, no HuggingFace) or 'local' (sentence-transformers)",
    )

    # Ollama embeddings (used when embed_backend='ollama')
    ollama_embed_model: str = Field(
        default="nomic-embed-text",
        description="Ollama model for embeddings. Pull first: ollama pull nomic-embed-text",
    )

    # Local / HuggingFace embeddings (used when embed_backend='local')
    embed_model: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2",
        description="HuggingFace model ID — only used when embed_backend='local'",
    )
    embed_model_dir: str = Field(
        default="./models",
        description="Local directory where HuggingFace models are cached (local backend only). "
                    "Add to .gitignore. Once downloaded, network calls are skipped automatically.",
    )
    embed_device: str = Field(default="cpu", description="Torch device: cpu or cuda (local backend only)")
    embed_batch_size: int = Field(default=64, description="Embedding batch size")

    # Chunking
    chunk_size: int = Field(default=512, description="Max characters per chunk")
    chunk_overlap: int = Field(default=64, description="Overlap characters between chunks")

    # Retrieval
    top_k: int = Field(default=5, description="Number of chunks to retrieve")

    # Phase 2 — Hybrid search
    hybrid_search: bool = Field(default=False, description="Enable BM25 + semantic hybrid search")
    hybrid_semantic_weight: float = Field(default=1.0, description="RRF weight for semantic results")
    hybrid_bm25_weight: float = Field(default=1.0, description="RRF weight for BM25 results")

    # Phase 2 — Reranking
    rerank: bool = Field(default=False, description="Enable cross-encoder reranking")
    rerank_model: str = Field(
        default="cross-encoder/ms-marco-MiniLM-L-6-v2",
        description="Cross-encoder model for reranking",
    )

    # Phase 2 — Caching
    embed_cache: bool = Field(default=False, description="Enable disk-backed embedding cache")
    embed_cache_dir: str = Field(default="./embedding_cache", description="Embedding cache directory")

    # Phase 2 — Deduplication
    dedup: bool = Field(default=False, description="Skip re-ingesting already-seen documents")
    dedup_store_dir: str = Field(default="./dedup_store", description="Dedup hash store directory")

    # Ollama LLM
    ollama_model: str = Field(default="", description="Ollama model name, e.g. gemma3:4b. Empty = no LLM.")
    ollama_host: str = Field(default="http://localhost:11434", description="Ollama API host")

    # High-effort ingestion — LLM semantic tagging
    tag_model: str = Field(
        default="gemma4:e2b",
        description="Ollama model used to generate semantic tags per chunk (high-effort ingestion).",
    )
    tag_timeout: int = Field(
        default=60,
        description="Per-chunk HTTP timeout in seconds for tag generation.",
    )


settings = Settings()
