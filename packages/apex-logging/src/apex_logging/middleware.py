"""Per-request structured logging middleware with user-context binding."""
from __future__ import annotations

import base64
import json
import time
import uuid

import structlog
from structlog.contextvars import bind_contextvars, clear_contextvars
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

_log = structlog.get_logger("apex.http")


def _extract_user_id(request: Request) -> str | None:
    """
    Decode JWT payload to extract the subject claim.

    No signature verification is performed — this is for logging context only.
    Security enforcement happens in the identity service.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        payload_b64 = auth[7:].split(".")[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        uid = payload.get("sub") or payload.get("user_id")
        return str(uid) if uid else None
    except Exception:
        return None


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Bind per-request context to structlog's contextvars, then log completion.

    Every log call made during a request will automatically include:
      request_id, user_id, method, path, client_ip

    Also adds ``X-Request-ID`` to every response so clients can correlate logs.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        clear_contextvars()

        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        user_id = _extract_user_id(request)

        bind_contextvars(
            request_id=request_id,
            user_id=user_id,
            method=request.method,
            path=str(request.url.path),
            client_ip=request.client.host if request.client else None,
        )

        t0 = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - t0) * 1000, 2)

        _log.info("http_request", status=response.status_code, duration_ms=duration_ms)

        response.headers["X-Request-ID"] = request_id
        return response
