"""OpenTelemetry tracer provider + OTLP exporter setup."""
from __future__ import annotations

import logging

_log = logging.getLogger(__name__)


def setup_otel(service_name: str, settings: object) -> None:
    """Configure a TracerProvider with an OTLP HTTP exporter and wire up the logging bridge."""
    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.logging import LoggingInstrumentor
        from opentelemetry.sdk.resources import SERVICE_NAME, SERVICE_VERSION, Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except ImportError as exc:
        _log.warning("OpenTelemetry packages not available — OTel disabled. %s", exc)
        return

    endpoint = getattr(settings, "otlp_endpoint", "")
    version = getattr(settings, "service_version", "0.1.0")

    resource = Resource.create({SERVICE_NAME: service_name, SERVICE_VERSION: version})
    exporter = OTLPSpanExporter(endpoint=f"{endpoint.rstrip('/')}/v1/traces")
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    # Inject trace_id + span_id into every stdlib log record
    LoggingInstrumentor().instrument(set_logging_format=False)

    _log.info("OTel configured: service=%s endpoint=%s", service_name, endpoint)


def instrument_app(app: object) -> None:
    """Instrument a FastAPI app instance with OpenTelemetry request tracing."""
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        FastAPIInstrumentor.instrument_app(app)  # type: ignore[arg-type]
    except ImportError:
        pass
