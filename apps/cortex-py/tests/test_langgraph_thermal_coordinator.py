"""Tests for cortex-py thermal monitoring integration with LangGraph."""

from __future__ import annotations

import asyncio
import sys
import types
from typing import Any, List

import pytest

# Provide shim for optional dependency used by cortex_py.a2a before importing monitor
sys.modules.setdefault('asyncio_throttle', types.SimpleNamespace(Throttler=object))

from thermal.monitor import ThermalMonitor, ThermalPolicy


class StubPublisher:
    """Capture published envelopes for assertions."""

    def __init__(self) -> None:
        self.envelopes: List[Any] = []

    async def publish(self, envelope: Any) -> bool:
        self.envelopes.append(envelope)
        return True


def test_monitor_publishes_structured_events() -> None:
    publisher = StubPublisher()
    monitor = ThermalMonitor(
        "mlx0",
        publisher=publisher,
        policy=ThermalPolicy(warning_threshold=70.0, critical_threshold=80.0),
    )

    event = asyncio.run(monitor.publish_reading(83.5))

    assert event.level == "critical"
    assert event.throttle_hint == "brAInwav:reduce-load"
    assert event.message.startswith("brAInwav thermal critical")

    assert len(publisher.envelopes) == 1
    envelope = publisher.envelopes[0]
    assert envelope.data["status"] == "critical"
    assert envelope.data["action_taken"] == "brAInwav:reduce-load"
    assert envelope.data["message"].startswith("brAInwav thermal critical")


def test_monitor_respects_policy_thresholds() -> None:
    publisher = StubPublisher()
    monitor = ThermalMonitor(
        "mlx1",
        publisher=publisher,
        policy=ThermalPolicy(warning_threshold=65.0, critical_threshold=90.0),
    )

    event = asyncio.run(monitor.publish_reading(70.0))
    assert event.level == "warning"
    assert event.throttle_hint == "brAInwav:prepare-fallback"

    # Ensure async path is locked correctly by issuing concurrent publishes
    async def _collect() -> list[Any]:
        return await asyncio.gather(
            monitor.publish_reading(50.0), monitor.publish_reading(95.0)
        )

    results = asyncio.run(_collect())
    assert {r.level for r in results} == {"nominal", "critical"}
