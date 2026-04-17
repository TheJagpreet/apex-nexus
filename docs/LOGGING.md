# Logging — Apex Nexus

All four Python services (apex-rag, apex-identity, apex-gateway, apex-agents) share the `packages/apex-logging` library for structured logging and optional OpenTelemetry tracing.

## Log fields

Every log line includes the following fields automatically:

| Field | Source | Example |
|-------|--------|---------|
| `timestamp` | structlog | `2025-04-17T12:34:56.789Z` |
| `level` | structlog | `info` |
| `logger` | module name | `apex_gateway.main` |
| `service` | configured at startup | `apex-gateway` |
| `event` | log message | `http_request` |
| `request_id` | `X-Request-ID` header or UUID | `3f9a1b2c-...` |
| `user_id` | JWT `sub` claim (no verification) | `42` |
| `method` | HTTP method | `POST` |
| `path` | URL path | `/generate` |
| `client_ip` | remote address | `127.0.0.1` |
| `status` | HTTP status code | `200` |
| `duration_ms` | response time | `142.3` |

`request_id` and `user_id` flow through the entire request — every `logger.info()` call within a handler automatically carries them.
This means you can filter logs by `request_id` to reconstruct a full trace, or by `user_id` to see all activity from a specific user across all services.

## Configuration

Set via environment variables (prefix `APEX_LOG_`):

| Variable | Default | Description |
|----------|---------|-------------|
| `APEX_LOG_FORMAT` | `console` | `console` — coloured human-readable (local dev); `json` — one JSON object per line (Docker/prod) |
| `APEX_LOG_LEVEL` | `INFO` | `DEBUG` / `INFO` / `WARNING` / `ERROR` |
| `APEX_LOG_OTLP_ENDPOINT` | `` | OTLP HTTP base URL, e.g. `http://localhost:4318`. Empty disables OTel. |
| `APEX_LOG_OTLP_INSECURE` | `true` | Skip TLS for the OTLP exporter |

## OpenTelemetry (optional)

When `APEX_LOG_OTLP_ENDPOINT` is set:
1. A `TracerProvider` is created with a `BatchSpanProcessor` → OTLP HTTP exporter.
2. FastAPI routes are auto-instrumented (request spans created per endpoint).
3. `trace_id` and `span_id` are injected into every stdlib log record.

### Quick start with Jaeger

```bash
# Start just Jaeger (no need to run the full stack)
docker compose --profile observability up jaeger

# In each service .env (or root .env.example):
APEX_LOG_OTLP_ENDPOINT=http://localhost:4318
APEX_LOG_FORMAT=json
```

Open the Jaeger UI at **http://localhost:16686** to browse traces.

### Sending traces from Docker Compose

In `docker-compose.yml`, set per-service:
```yaml
APEX_LOG_OTLP_ENDPOINT: http://jaeger:4318
```
and start with:
```bash
docker compose --profile observability up
```

## Console output (local dev)

```
2025-04-17T12:34:56.789Z [info     ] http_request   [apex.http] service=apex-gateway request_id=3f9a1b2c user_id=42 method=POST path=/generate status=200 duration_ms=142.3
2025-04-17T12:34:56.795Z [info     ] LLM call       [apex_gateway.main] service=apex-gateway request_id=3f9a1b2c model=gemma4:e2b prompt_len=1024
```

## JSON output (Docker / production)

```json
{"timestamp": "2025-04-17T12:34:56.789Z", "level": "info", "logger": "apex.http", "service": "apex-gateway", "event": "http_request", "request_id": "3f9a1b2c", "user_id": "42", "method": "POST", "path": "/generate", "status": 200, "duration_ms": 142.3}
```

## Adding structured context in service code

```python
from apex_logging import get_logger

logger = get_logger(__name__)

# Plain message
logger.info("collection queried", collection="sample_rag", results=5)

# Bind extra context for the duration of a function
import structlog
log = structlog.get_logger().bind(agent_id="orchestrator", session_id="abc123")
log.info("agent started")
log.info("agent done", tokens=312)
```

## Adding logging to a new service

1. Add to `pyproject.toml`:
   ```toml
   "apex-logging @ file:../../packages/apex-logging",
   ```
2. Reinstall: `uv pip install -e ".[dev]"` from the service directory.
3. In the service entry point:
   ```python
   from apex_logging import configure_logging, get_logger, instrument_app, RequestLoggingMiddleware

   configure_logging("my-service")   # call once, before app = FastAPI(...)
   logger = get_logger(__name__)

   app = FastAPI(...)
   app.add_middleware(CORSMiddleware, ...)
   app.add_middleware(RequestLoggingMiddleware)
   instrument_app(app)
   ```
