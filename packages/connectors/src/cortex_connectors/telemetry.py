"""Telemetry helpers for connectors runtime."""

from __future__ import annotations

import logging
from typing import Optional

try:  # pragma: no cover - structlog optional in tests
	import structlog
except ModuleNotFoundError:  # pragma: no cover - fallback when structlog absent
	structlog = None  # type: ignore[assignment]

try:  # pragma: no cover - exercised through side effects
    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
except Exception:  # pragma: no cover - gracefully handle missing OTEL
    trace = None
    TracerProvider = None  # type: ignore[assignment]


def configure_logging(level: str = "info") -> None:
	logging.basicConfig(level=level.upper(), format="%(message)s")
	if structlog is None:
		return
	structlog.configure(
		wrapper_class=structlog.make_filtering_bound_logger(logging.getLevelName(level.upper())),
		processors=[
			structlog.processors.add_log_level,
			structlog.processors.TimeStamper(fmt="iso"),
			structlog.processors.JSONRenderer(),
		],
	)


def configure_tracing(service_name: str, endpoint: Optional[str]) -> None:
    if not endpoint or trace is None or TracerProvider is None:  # pragma: no cover - env dependent
        return

    provider = TracerProvider(resource=Resource.create({"service.name": service_name}))
    exporter = OTLPSpanExporter(endpoint=endpoint)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)


__all__ = ["configure_logging", "configure_tracing"]
