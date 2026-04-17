# CLAUDE.md — apex-logging

Shared structured logging + optional OpenTelemetry tracing for all Apex Nexus Python services.
Not a deployable service — installed as a path dependency by each service.

## Architecture

| File | Purpose |
|------|---------|
| `config.py` | `LoggingSettings` — reads `APEX_LOG_*` env vars |
| `logger.py` | `configure_logging(service_name)` + `get_logger(name)` |
| `middleware.py` | `RequestLoggingMiddleware` — per-request context binding |
| `otel.py` | `setup_otel()` + `instrument_app(app)` — optional OTLP tracing |

## Consuming in a service

```python
# 1. At module top (before app creation)
from apex_logging import configure_logging, get_logger, instrument_app, RequestLoggingMiddleware

configure_logging("my-service")      # call once
logger = get_logger(__name__)        # use everywhere

# 2. After app = FastAPI(...)
app.add_middleware(RequestLoggingMiddleware)
instrument_app(app)                  # no-op when OTel packages absent
```

## What gets logged per request

`request_id`, `user_id`, `method`, `path`, `client_ip`, `status`, `duration_ms`

Every `logger.*()` call within a request automatically carries all of the above.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APEX_LOG_LEVEL` | `INFO` | `DEBUG` / `INFO` / `WARNING` / `ERROR` |
| `APEX_LOG_FORMAT` | `console` | `console` (coloured) or `json` (one object per line) |
| `APEX_LOG_OTLP_ENDPOINT` | `` | OTLP HTTP base URL, e.g. `http://localhost:4318` — empty = disabled |
| `APEX_LOG_OTLP_INSECURE` | `true` | Skip TLS verification for the exporter |

## Adding to a new service

1. Add to `pyproject.toml` dependencies:
   ```toml
   "apex-logging @ file:../../packages/apex-logging",
   ```
2. Re-run `uv pip install -e ".[dev]"` from the service directory.
3. Follow the "Consuming in a service" snippet above.
