"""
Quickstart — end-to-end demo with no external dependencies beyond pip install.

Run:
    pip install -e .
    python examples/quickstart.py
"""
from apex_rag import RAGPipeline

# 1. Create the pipeline (ChromaDB stored in ./chroma_db, embeddings on CPU)
rag = RAGPipeline()

# 2. Ingest some text snippets
rag.ingest_text(
    "ChromaDB is an open-source vector database that stores embeddings persistently "
    "using a combination of SQLite for metadata and an HNSW index for fast nearest-neighbour search. "
    "It supports cosine, L2, and inner-product distance metrics.",
    source="chromadb_overview",
)

rag.ingest_text(
    "Retrieval-Augmented Generation (RAG) improves LLM accuracy by fetching relevant "
    "context from a knowledge base before generation. The key stages are: "
    "document ingestion, chunking, embedding, vector retrieval, and LLM generation.",
    source="rag_overview",
)

rag.ingest_text(
    "Sentence Transformers provides pre-trained models for generating dense sentence embeddings. "
    "The all-MiniLM-L6-v2 model produces 384-dimensional vectors and runs efficiently on CPU, "
    "making it ideal for local RAG deployments.",
    source="sentence_transformers_overview",
)

print(f"\nStore contains {rag.count()} chunks from sources: {rag.list_sources()}\n")

# 3. Query
questions = [
    "How does ChromaDB store data?",
    "What is RAG and how does it work?",
    "Which embedding model is good for local use?",
]

for q in questions:
    result = rag.query(q)
    print(f"Q: {q}")
    print(f"A: {result.answer[:200]}...")
    print(f"   Sources: {[s['source'] for s in result.sources]}")
    print()
