# API Reference — apex-gateway (port 8002)

Thin stateless wrapper around Ollama. Assembles RAG prompts and returns LLM answers.

## GET /health

**Response** `200`
```json
{ "status": "ok" }
```

---

## POST /generate

Generate an LLM answer from retrieved context.

The gateway assembles the RAG instruction prompt internally:
- Instructs the model to answer based only on provided context
- Falls back gracefully when context is insufficient

**Body**
```json
{
  "question": "What is RAG?",
  "context": "RAG stands for Retrieval-Augmented Generation...\n\nIt was introduced by..."
}
```

**Response** `200`
```json
{
  "question": "What is RAG?",
  "answer": "RAG (Retrieval-Augmented Generation) is a technique that...",
  "model": "gemma4:e4b"
}
```

**Errors**: `503` if Ollama is unavailable.

---

## POST /keywords

Extract search keywords from a user question for RAG pre-processing.

Useful for refining vague questions before sending to apex-rag.

**Body**
```json
{ "question": "Can you explain what the paper says about attention mechanisms?" }
```

**Response** `200`
```json
{ "keywords": "attention mechanisms transformer self-attention" }
```

---

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `APEX_GW_OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |
| `APEX_GW_OLLAMA_MODEL` | `gemma4:e4b` | Model for generation |
| `APEX_GW_HOST` | `0.0.0.0` | Bind address |
| `APEX_GW_PORT` | `8002` | Listen port |
