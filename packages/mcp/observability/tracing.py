"""Distributed tracing and APM system for MCP."""

import uuid
from contextlib import asynccontextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any

from .metrics import get_metrics_collector
from .structured_logging import get_correlation_id, get_logger

logger = get_logger(__name__)
metrics = get_metrics_collector()


# Context variables for tracing
current_trace_id: ContextVar[str | None] = ContextVar("trace_id", default=None)
current_span_id: ContextVar[str | None] = ContextVar("span_id", default=None)


class SpanStatus(Enum):
    """Span status codes."""

    OK = "OK"
    ERROR = "ERROR"
    TIMEOUT = "TIMEOUT"


class SpanKind(Enum):
    """Span kinds based on OpenTelemetry specification."""

    INTERNAL = "INTERNAL"
    SERVER = "SERVER"
    CLIENT = "CLIENT"
    PRODUCER = "PRODUCER"
    CONSUMER = "CONSUMER"


@dataclass
class Span:
    """Distributed tracing span."""

    trace_id: str
    span_id: str
    parent_span_id: str | None
    operation_name: str
    service_name: str

    # Timing
    start_time: datetime
    end_time: datetime | None = None
    duration: float | None = None  # in seconds

    # Status and metadata
    status: SpanStatus = SpanStatus.OK
    kind: SpanKind = SpanKind.INTERNAL

    # Data
    attributes: dict[str, Any] = field(default_factory=dict)

    # Error information
    error: bool = False
    error_message: str | None = None

    def finish(
        self, status: SpanStatus = SpanStatus.OK, error: Exception | None = None
    ):
        """Finish the span with optional error information."""
        self.end_time = datetime.now()
        self.duration = (self.end_time - self.start_time).total_seconds()
        self.status = status

        if error:
            self.error = True
            self.error_message = str(error)
            self.status = SpanStatus.ERROR

    def add_attribute(self, key: str, value: Any):
        """Add an attribute to the span."""
        self.attributes[key] = value

    def to_dict(self) -> dict[str, Any]:
        """Convert span to dictionary for serialization."""
        return {
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "parent_span_id": self.parent_span_id,
            "operation_name": self.operation_name,
            "service_name": self.service_name,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration": self.duration,
            "status": self.status.value,
            "kind": self.kind.value,
            "attributes": self.attributes,
            "error": self.error,
            "error_message": self.error_message,
        }


class DistributedTracer:
    """Main distributed tracing system."""

    def __init__(self, service_name: str = "mcp-server"):
        self.service_name = service_name
        self.enabled = True
        self.active_spans: dict[str, Span] = {}

        logger.info(f"Distributed tracer initialized for service: {service_name}")

    def start_span(
        self,
        operation_name: str,
        trace_id: str | None = None,
        parent_span_id: str | None = None,
        kind: SpanKind = SpanKind.INTERNAL,
        attributes: dict[str, Any] | None = None,
    ) -> Span:
        """Start a new span."""
        if not self.enabled:
            return Span("", "", None, "", "")

        # Use current trace/span if not specified
        if not trace_id:
            trace_id = current_trace_id.get() or str(uuid.uuid4())
            current_trace_id.set(trace_id)

        if not parent_span_id:
            parent_span_id = current_span_id.get()

        # Create span
        span = Span(
            trace_id=trace_id,
            span_id=str(uuid.uuid4()),
            parent_span_id=parent_span_id,
            operation_name=operation_name,
            service_name=self.service_name,
            start_time=datetime.now(),
            kind=kind,
            attributes=attributes or {},
        )

        # Add correlation ID
        correlation_id = get_correlation_id()
        if correlation_id != "unknown":
            span.add_attribute("correlation_id", correlation_id)

        # Store span
        self.active_spans[span.span_id] = span

        # Update context
        current_span_id.set(span.span_id)

        return span

    def finish_span(
        self,
        span: Span,
        status: SpanStatus = SpanStatus.OK,
        error: Exception | None = None,
    ):
        """Finish a span."""
        if not self.enabled or not span.span_id:
            return

        span.finish(status, error)

        # Remove from active spans
        self.active_spans.pop(span.span_id, None)

        # Record metrics
        metrics.record_request(
            method=f"span_{span.operation_name}",
            status="success" if not span.error else "error",
            plugin="tracing",
            duration=span.duration or 0,
        )

        logger.debug(
            "Span finished",
            trace_id=span.trace_id,
            span_id=span.span_id,
            operation_name=span.operation_name,
            duration=span.duration,
            status=span.status.value,
        )

    @asynccontextmanager
    async def trace_context(
        self,
        operation_name: str,
        kind: SpanKind = SpanKind.INTERNAL,
        attributes: dict[str, Any] | None = None,
    ):
        """Context manager for tracing operations."""
        if not self.enabled:
            yield None
            return

        span = self.start_span(operation_name, kind=kind, attributes=attributes)

        try:
            yield span
            self.finish_span(span, SpanStatus.OK)
        except Exception as e:
            self.finish_span(span, SpanStatus.ERROR, e)
            raise

    def get_trace_summary(self) -> dict[str, Any]:
        """Get tracing system summary."""
        return {
            "enabled": self.enabled,
            "service_name": self.service_name,
            "active_spans": len(self.active_spans),
        }


# Global tracer instance
_tracer: DistributedTracer | None = None


def get_tracer(service_name: str = "mcp-server") -> DistributedTracer:
    """Get or create global tracer instance."""
    global _tracer

    if _tracer is None:
        _tracer = DistributedTracer(service_name)

    return _tracer


def trace(event: str) -> None:
    """Placeholder trace function for backward compatibility."""
    tracer = get_tracer()
    with tracer.trace_context(event):
        pass
