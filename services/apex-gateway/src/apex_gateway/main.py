"""
Apex Gateway — FastAPI app.

Endpoints:
  GET  /health    — liveness check
  POST /generate  — assemble RAG prompt and call Ollama LLM
"""
from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import settings
from .llm.ollama_llm import OllamaLLM

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Apex Gateway API",
    description="LLM generation service for the Apex platform.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_llm: OllamaLLM | None = None

_RAG_PROMPT_TEMPLATE = """\
You are a helpful assistant. Use the context below if it is relevant to the question.
Apply your own knowledge and judgment — the context is supplementary, not mandatory.

Context:
{context}

Question: {question}

Answer:"""

_CHAT_PROMPT_TEMPLATE = """\
You are a helpful, knowledgeable assistant. Answer the following question directly and concisely.

Question: {question}

Answer:"""

_RAG_WITH_HISTORY_TEMPLATE = """\
You are a helpful assistant. Use the context below if it is relevant to the question.
Apply your own knowledge and judgment — the context is supplementary, not mandatory.

Context:
{context}

Conversation so far:
{history}

User: {question}

Answer:"""

_CHAT_WITH_HISTORY_TEMPLATE = """\
You are a helpful, knowledgeable assistant.

Conversation so far:
{history}

User: {question}

Answer:"""

_KEYWORDS_TEMPLATE = """\
Extract 3-6 concise search keywords or short phrases from the following question. \
These keywords will be used to retrieve relevant documents from a vector database. \
Return ONLY the keywords separated by spaces, no punctuation, no explanation.

Question: {question}

Keywords:"""


def _format_history(history: list[dict]) -> str:
    lines = []
    for turn in history:
        role = "User" if turn.get("role") == "user" else "Assistant"
        lines.append(f"{role}: {turn.get('content', '').strip()}")
    return "\n".join(lines)


def get_llm() -> OllamaLLM:
    global _llm
    if _llm is None:
        _llm = OllamaLLM(model=settings.ollama_model, host=settings.ollama_host)
        logger.info("OllamaLLM ready: model=%s host=%s", settings.ollama_model, settings.ollama_host)
    return _llm


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class GenerateRequest(BaseModel):
    question: str = Field(..., min_length=1, description="User question.")
    context: str = Field(default="", description="Retrieved context chunks joined by newlines.")
    model: str | None = Field(default=None, description="Override the default Ollama model.")
    history: list[dict] = Field(default_factory=list, description="Prior turns [{role, content}].")


class GenerateResponse(BaseModel):
    question: str
    answer: str
    model: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok", "model": settings.ollama_model}


@app.post("/generate", response_model=GenerateResponse, tags=["llm"])
def generate(req: GenerateRequest) -> GenerateResponse:
    """
    Assemble a RAG prompt from the provided context and question, then call Ollama.

    The caller (apex-portal or apex-rag server) is responsible for retrieving
    relevant chunks and passing them as `context`.
    """
    llm = get_llm()

    # Allow per-request model override
    if req.model and req.model != settings.ollama_model:
        effective_llm = OllamaLLM(model=req.model, host=settings.ollama_host)
    else:
        effective_llm = llm
        req.model = settings.ollama_model

    context = req.context.strip()
    history_str = _format_history(req.history[-20:]) if req.history else ""

    if context and history_str:
        prompt = _RAG_WITH_HISTORY_TEMPLATE.format(context=context, history=history_str, question=req.question)
    elif context:
        prompt = _RAG_PROMPT_TEMPLATE.format(context=context, question=req.question)
    elif history_str:
        prompt = _CHAT_WITH_HISTORY_TEMPLATE.format(history=history_str, question=req.question)
    else:
        prompt = _CHAT_PROMPT_TEMPLATE.format(question=req.question)

    try:
        answer = effective_llm(prompt)
    except Exception as exc:
        logger.exception("LLM generation failed")
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}") from exc

    return GenerateResponse(
        question=req.question,
        answer=answer,
        model=req.model or settings.ollama_model,
    )


# ---------------------------------------------------------------------------
# Keyword extraction — used by portal to expand RAG queries
# ---------------------------------------------------------------------------


class KeywordsRequest(BaseModel):
    question: str = Field(..., min_length=1, description="User question to extract keywords from.")
    model: str | None = Field(default=None, description="Override the default Ollama model.")


class KeywordsResponse(BaseModel):
    keywords: str


@app.post("/keywords", response_model=KeywordsResponse, tags=["llm"])
def extract_keywords(req: KeywordsRequest) -> KeywordsResponse:
    """
    Extract search keywords from a user question for use as a RAG retrieval query.
    Returns a space-separated string of keywords.
    """
    llm = get_llm()
    effective_llm = (
        OllamaLLM(model=req.model, host=settings.ollama_host)
        if req.model and req.model != settings.ollama_model
        else llm
    )

    prompt = _KEYWORDS_TEMPLATE.format(question=req.question)
    try:
        keywords = effective_llm(prompt).strip()
    except Exception as exc:
        logger.exception("Keyword extraction failed")
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}") from exc

    return KeywordsResponse(keywords=keywords)
