"""Structured logging configuration using structlog with a stdlib bridge."""
from __future__ import annotations

import logging
import sys
from typing import Any

import structlog

from .config import LoggingSettings


def _service_processor(name: str):
    def _add(logger: Any, method: str, event_dict: dict) -> dict:
        event_dict.setdefault("service", name)
        return event_dict
    return _add


def configure_logging(service_name: str) -> None:
    """
    Configure structlog + stdlib logging bridge for a service.

    - Console (default): human-readable coloured output for local dev.
    - JSON (APEX_LOG_FORMAT=json): one JSON object per line for prod/Docker.
    - OTel (APEX_LOG_OTLP_ENDPOINT set): BatchSpanProcessor + FastAPI tracing.

    Call once at startup before the FastAPI app is created.
    """
    settings = LoggingSettings()

    shared: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        _service_processor(service_name),
    ]

    renderer: structlog.types.Processor = (
        structlog.processors.JSONRenderer()
        if settings.format == "json"
        else structlog.dev.ConsoleRenderer(colors=sys.stderr.isatty())
    )

    structlog.configure(
        processors=shared + [structlog.stdlib.ProcessorFormatter.wrap_for_formatter],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        structlog.stdlib.ProcessorFormatter(processor=renderer, foreign_pre_chain=shared)
    )

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(getattr(logging, settings.level.upper(), logging.INFO))

    # Access logs are handled by RequestLoggingMiddleware; watchfiles is too noisy on reload
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("watchfiles").setLevel(logging.WARNING)

    if settings.otlp_endpoint:
        from .otel import setup_otel
        setup_otel(service_name=service_name, settings=settings)


def get_logger(name: str = "") -> structlog.stdlib.BoundLogger:
    """Return a bound structlog logger. Pass module ``__name__`` as the name."""
    return structlog.get_logger(name)  # type: ignore[return-value]
