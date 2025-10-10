from __future__ import annotations

import types

import structlog

from cortex_connectors import telemetry


def test_configure_logging_sets_structlog() -> None:
    telemetry.configure_logging("debug")
    logger = structlog.get_logger()
    # Logger should be callable without raising after configuration
    logger.debug("test", brand="brAInwav", component="connectors")


def test_configure_tracing_with_endpoint(monkeypatch) -> None:
    calls: dict[str, object] = {}

    class DummyProvider:
        def __init__(self, resource):
            calls["resource"] = resource

        def add_span_processor(self, processor):
            calls["processor"] = processor

    class DummyTrace:
        def __init__(self) -> None:
            self.provider = None

        def set_tracer_provider(self, provider):
            self.provider = provider
            calls["provider"] = provider

    monkeypatch.setattr(telemetry, "TracerProvider", DummyProvider)
    monkeypatch.setattr(telemetry, "Resource", types.SimpleNamespace(create=lambda value: value))
    monkeypatch.setattr(telemetry, "OTLPSpanExporter", lambda endpoint: ("exporter", endpoint))
    monkeypatch.setattr(telemetry, "BatchSpanProcessor", lambda exporter: ("processor", exporter))
    dummy_trace = DummyTrace()
    monkeypatch.setattr(telemetry, "trace", dummy_trace)

    telemetry.configure_tracing("connectors", "http://collector")
    assert calls["resource"] == {"service.name": "connectors"}
    assert calls["processor"] == ("processor", ("exporter", "http://collector"))
    assert dummy_trace.provider is not None


def test_configure_tracing_without_endpoint(monkeypatch) -> None:
    monkeypatch.setattr(telemetry, "trace", None)
    telemetry.configure_tracing("connectors", None)
