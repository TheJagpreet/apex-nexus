"""
Agent execution engine with SSE streaming.

Flow per run:
  1. Build message list from agent system prompt + conversation history
  2. Stream tokens from Ollama via ChatOllama.astream()
  3. After each LLM turn, scan for <tool_call> blocks and execute them
  4. Feed tool results back and repeat (max 5 hops)
  5. Yield SSE event dicts throughout; end with {"type": "done"}

Tool calls use an XML-like marker that works across all Ollama models:
  <tool_call>{"tool": "tool_name", "input": {...}}</tool_call>
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from collections.abc import AsyncGenerator
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import httpx
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_ollama import ChatOllama
from sqlalchemy.orm import Session

from .config import Settings
from .crud import get_memory, list_custom_tools, set_memory
from .models import Agent
from .schemas import RunRequest

logger = logging.getLogger(__name__)

_TOOL_CALL_RE = re.compile(r"<tool_call>(.*?)</tool_call>", re.DOTALL)

# ---------------------------------------------------------------------------
# Built-in tool registry
# ---------------------------------------------------------------------------

BUILTIN_TOOLS: dict[str, dict[str, Any]] = {
    "rag_query": {
        "name": "Knowledge Base Search",
        "description": "Search the knowledge base for relevant documents and context.",
        "enabled_by_default": True,
    },
    "memory_read": {
        "name": "Memory Read",
        "description": "Read a value from this agent's persistent memory store.",
        "enabled_by_default": True,
    },
    "memory_write": {
        "name": "Memory Write",
        "description": "Write a value to this agent's persistent memory store.",
        "enabled_by_default": True,
    },
    "handoff": {
        "name": "Handoff",
        "description": "Delegate execution to another configured agent.",
        "enabled_by_default": True,
    },
    "code_exec": {
        "name": "Code Exec",
        "description": "Execute a Python snippet and return its output. Disabled by default — enable per-agent.",
        "enabled_by_default": False,
    },
    "web_fetch": {
        "name": "Web Fetch",
        "description": "Fetch the text content of a public URL.",
        "enabled_by_default": False,
    },
}

# Convenience: the merged registry shown to the API includes custom tools from DB.
# Use build_tool_registry() to get the full list at request time.


def _tool_instructions(tool_ids: list[str]) -> str:
    """Return the tool-use instructions block injected into the system prompt."""
    if not tool_ids:
        return ""

    lines = ["", "## Available Tools", ""]
    for tid in tool_ids:
        info = BUILTIN_TOOLS.get(tid)
        if info:
            lines.append(f"- **{tid}**: {info['description']}")
        else:
            # Custom tool — description injected by runner after DB lookup
            lines.append(f"- **{tid}**: user-defined tool")

    lines += [
        "",
        "## How to Use a Tool",
        "",
        "When you need to call a tool, output EXACTLY this pattern (nothing else on the same line):",
        "",
        '    <tool_call>{"tool": "tool_name", "input": {"key": "value"}}</tool_call>',
        "",
        "You may use multiple tool calls in one response.",
        "Wait for tool results before continuing your answer.",
        "",
    ]
    return "\n".join(lines)


def _build_messages(agent: Agent, request: RunRequest) -> list[BaseMessage]:
    """Construct the full message list for the first LLM call."""
    # Only expose rag_query when a collection is actually attached to this request
    effective_tools = [
        t for t in agent.tools
        if t != "rag_query" or bool(request.collection)
    ]
    tool_block = _tool_instructions(effective_tools)
    system_content = agent.system_prompt + tool_block

    msgs: list[BaseMessage] = [SystemMessage(content=system_content)]

    for h in request.history:
        if h.role == "user":
            msgs.append(HumanMessage(content=h.content))
        else:
            msgs.append(AIMessage(content=h.content))

    user_content = request.message
    if request.context:
        user_content = f"Context:\n{request.context}\n\nQuestion: {request.message}"

    msgs.append(HumanMessage(content=user_content))
    return msgs


def _extract_tool_calls(text: str) -> list[dict[str, Any]]:
    """Parse all <tool_call>...</tool_call> blocks from LLM output."""
    calls = []
    for match in _TOOL_CALL_RE.finditer(text):
        raw = match.group(1).strip()
        try:
            calls.append(json.loads(raw))
        except json.JSONDecodeError:
            logger.warning("Malformed tool_call JSON: %s", raw[:200])
    return calls


# ---------------------------------------------------------------------------
# Built-in tool executors
# ---------------------------------------------------------------------------


async def _exec_rag_query(inp: dict, settings: Settings) -> str:
    query = inp.get("query", inp.get("question", ""))
    collection = inp.get("collection", "default")
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            r = await client.post(
                f"{settings.rag_url}/query",
                json={"query": query, "collection_name": collection, "n_results": 5},
            )
            r.raise_for_status()
            data = r.json()
            chunks = data.get("results", [])
            if not chunks:
                return "[no results found in knowledge base]"
            parts = []
            for i, c in enumerate(chunks, 1):
                src = c.get("metadata", {}).get("source", "")
                text = c.get("content", "")
                parts.append(f"[{i}] {text}" + (f"\nSource: {src}" if src else ""))
            return "\n\n".join(parts)
        except Exception as exc:
            return f"[rag_query error: {exc}]"


async def _exec_memory_read(inp: dict, agent_id: str, db: Session) -> str:
    key = inp.get("key", "")
    value = get_memory(db, agent_id, key)
    return value if value is not None else f"[no memory for key '{key}']"


async def _exec_memory_write(inp: dict, agent_id: str, db: Session) -> str:
    key = inp.get("key", "")
    value = inp.get("value", "")
    set_memory(db, agent_id, key, value)
    return f"[saved key '{key}']"


async def _exec_code_exec(inp: dict) -> str:
    code = inp.get("code", "")
    if not code.strip():
        return "[error: no code provided]"

    def run_sync() -> str:
        import io
        import contextlib
        output_buf = io.StringIO()
        local_ns: dict = {}
        try:
            with contextlib.redirect_stdout(output_buf):
                exec(compile(code, "<agent_code_exec>", "exec"), {}, local_ns)  # noqa: S102
            result = output_buf.getvalue()
            if not result:
                # Fall back to the last expression value if nothing was printed
                result = repr(local_ns.get("result", ""))
            return result.strip() or "[no output]"
        except Exception as exc:
            return f"[error: {exc}]"

    loop = asyncio.get_event_loop()
    try:
        return await asyncio.wait_for(loop.run_in_executor(None, run_sync), timeout=15.0)
    except asyncio.TimeoutError:
        return "[error: execution timed out (15s limit)]"


def _html_to_text(html: str) -> str:
    """Best-effort HTML → plain text without external deps."""
    # Remove script, style, noscript blocks entirely
    cleaned = re.sub(r"<(script|style|noscript)[^>]*>[\s\S]*?</\1>", " ", html, flags=re.IGNORECASE)
    # Extract <title>
    title_m = re.search(r"<title[^>]*>(.*?)</title>", cleaned, re.IGNORECASE | re.DOTALL)
    title = re.sub(r"<[^>]+>", "", title_m.group(1)).strip() if title_m else ""
    # Extract <meta name="description"> / og:description
    desc = ""
    for pat in (
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']description["\']',
        r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:description["\']',
    ):
        m = re.search(pat, cleaned, re.IGNORECASE)
        if m:
            desc = m.group(1).strip()
            break
    # Strip remaining tags and collapse whitespace
    body = re.sub(r"<[^>]+>", " ", cleaned)
    body = re.sub(r"[ \t]{2,}", " ", body)
    body = re.sub(r"\n{3,}", "\n\n", body).strip()
    # Prepend title/description so the most useful signal is at the front
    parts = [p for p in [title, desc, body] if p]
    return "\n\n".join(parts)


async def _exec_web_fetch(inp: dict | str) -> str:
    if isinstance(inp, str):
        url = inp
    else:
        url = inp.get("url", "")
    if not url:
        return "[error: no url provided]"
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        try:
            r = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (compatible; apex-agents/1.0)",
                "Accept": "text/html,application/xhtml+xml,*/*",
            })
            r.raise_for_status()
            text = _html_to_text(r.text)
            return text[:5000] + ("…[truncated]" if len(text) > 5000 else "")
        except Exception as exc:
            return f"[web_fetch error: {exc}]"


# ---------------------------------------------------------------------------
# Custom tool executor
# ---------------------------------------------------------------------------


def _run_custom_tool_sync(code: str, tool_input: dict) -> str:
    """Execute user-defined tool code in a restricted namespace. Runs in a thread."""
    import builtins
    import inspect

    # Allow most builtins but block file system and process access
    _blocked = {"open", "exec", "eval", "compile", "__import__", "breakpoint"}
    safe_builtins = {k: v for k, v in vars(builtins).items() if k not in _blocked}
    # Re-allow __import__ so users can import stdlib modules like json, re, math
    safe_builtins["__import__"] = __import__

    namespace: dict[str, Any] = {"__builtins__": safe_builtins}

    try:
        exec(compile(code, "<custom_tool>", "exec"), namespace)  # noqa: S102
    except Exception as exc:
        return f"[compilation error: {exc}]"

    run_fn = namespace.get("run")
    if run_fn is None:
        return "[error: tool code must define a function named 'run(input: dict) -> str']"

    if inspect.iscoroutinefunction(run_fn):
        return "[error: use a regular 'def run(input)' not 'async def run(input)']"

    try:
        return str(run_fn(tool_input))
    except Exception as exc:
        return f"[runtime error: {exc}]"


async def exec_custom_tool(code: str, tool_input: dict) -> str:
    """Run user-defined tool code in a thread pool with a 10-second timeout."""
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=1) as pool:
        try:
            return await asyncio.wait_for(
                loop.run_in_executor(pool, _run_custom_tool_sync, code, tool_input),
                timeout=10.0,
            )
        except asyncio.TimeoutError:
            return "[error: tool execution timed out (10s limit)]"


# ---------------------------------------------------------------------------
# Main streaming generator
# ---------------------------------------------------------------------------


async def run_agent_stream(
    agent: Agent,
    request: RunRequest,
    db: Session,
    settings: Settings,
) -> AsyncGenerator[dict[str, Any], None]:
    """
    Core generator. Yields SSE event dicts:
      {"type": "token",    "content": "..."}
      {"type": "tool_use", "tool": "...", "input": {...}}
      {"type": "handoff",  "to": "...", "prompt": "..."}
      {"type": "done",     "answer": "..."}
      {"type": "error",    "detail": "..."}
    """
    llm = ChatOllama(model=settings.ollama_model, base_url=settings.ollama_host)
    messages = _build_messages(agent, request)

    # Load custom tools from DB once so we can execute them
    custom_tools = {t.id: t.code for t in list_custom_tools(db)}

    full_answer = ""
    last_clean_prose = ""
    all_tool_results: list[str] = []  # accumulate every tool result as ultimate fallback
    MAX_HOPS = 5

    for hop in range(MAX_HOPS):
        current_response = ""

        # ── Stream tokens from Ollama ─────────────────────────────────────
        try:
            async for chunk in llm.astream(messages):
                token = chunk.content if hasattr(chunk, "content") else str(chunk)
                if token:
                    current_response += token
                    yield {"type": "token", "content": token}
        except Exception as exc:
            logger.exception("LLM streaming failed on hop %d", hop)
            yield {"type": "error", "detail": str(exc)}
            return

        messages.append(AIMessage(content=current_response))
        full_answer = current_response

        # Track the last hop that contained real prose (not just tool-call XML)
        _prose = re.sub(r"<tool_call>.*?</tool_call>", "", current_response, flags=re.DOTALL).strip()
        if _prose:
            last_clean_prose = _prose

        # ── Parse tool calls ───────────────────────────────────────────────
        tool_calls = _extract_tool_calls(current_response)
        if not tool_calls:
            break  # No tools → final answer

        # ── Execute each tool ──────────────────────────────────────────────
        tool_results: list[str] = []
        should_handoff = False

        for call in tool_calls:
            tool_name = call.get("tool", "")
            tool_input = call.get("input", {})

            yield {"type": "tool_use", "tool": tool_name, "input": tool_input}

            if tool_name == "handoff":
                target = tool_input.get("agent_id", "")
                prompt = tool_input.get("prompt", "")
                yield {"type": "handoff", "to": target, "prompt": prompt}
                should_handoff = True
                continue

            # Dispatch to built-in or custom tool
            if tool_name == "rag_query":
                result = await _exec_rag_query(tool_input, settings)
            elif tool_name == "memory_read":
                result = await _exec_memory_read(tool_input, agent.id, db)
            elif tool_name == "memory_write":
                result = await _exec_memory_write(tool_input, agent.id, db)
            elif tool_name == "code_exec":
                if "code_exec" not in agent.tools:
                    result = "[code_exec is not enabled for this agent]"
                else:
                    result = await _exec_code_exec(tool_input)
            elif tool_name == "web_fetch":
                result = await _exec_web_fetch(tool_input)
            elif tool_name in custom_tools:
                result = await exec_custom_tool(custom_tools[tool_name], tool_input)
            else:
                result = f"[unknown tool: {tool_name}]"

            tool_results.append(f"[{tool_name}]: {result}")
            all_tool_results.append(f"**{tool_name}**\n{result}")

        if should_handoff:
            yield {"type": "done", "answer": full_answer}
            return

        if tool_results:
            combined = "\n".join(tool_results)
            # On the last hop, make the instruction even more explicit
            is_last_hop = hop == MAX_HOPS - 2  # next iteration would be the last
            instruction = (
                "IMPORTANT: Do NOT call any tools. Do NOT output <tool_call> blocks.\n"
                "Write your final answer to the user NOW, in plain prose only."
                if is_last_hop else
                "Now write your complete answer to the user in plain text. "
                "Do NOT output any more <tool_call> blocks."
            )
            messages.append(
                HumanMessage(content=f"Tool results:\n{combined}\n\n{instruction}")
            )

    # Strip any trailing tool-call XML from the final answer
    _clean = re.sub(r"<tool_call>.*?</tool_call>", "", full_answer, flags=re.DOTALL).strip()

    if not _clean:
        if last_clean_prose:
            # Use prose the model produced in an earlier hop
            full_answer = last_clean_prose
        else:
            # Force one more summarisation attempt
            logger.warning("No prose after %d hops — forcing summary call", MAX_HOPS)
            messages.append(
                HumanMessage(
                    content=(
                        "You have gathered information using tools. "
                        "Now write a clear, plain-text answer to the user's question. "
                        "Do NOT call any tools or output <tool_call> blocks."
                    )
                )
            )
            forced = ""
            try:
                async for chunk in llm.astream(messages):
                    token = chunk.content if hasattr(chunk, "content") else str(chunk)
                    if token:
                        forced += token
                        yield {"type": "token", "content": token}
            except Exception as exc:
                forced = ""
            forced_clean = re.sub(r"<tool_call>.*?</tool_call>", "", forced, flags=re.DOTALL).strip()

            if forced_clean:
                full_answer = forced_clean
            elif all_tool_results:
                # Last resort: surface the raw tool results so the user gets something useful
                full_answer = "Here is what I found:\n\n" + "\n\n---\n\n".join(all_tool_results)
            else:
                full_answer = "I was unable to produce a response. Please try again."
    else:
        full_answer = _clean

    yield {"type": "done", "answer": full_answer}
