from __future__ import annotations

import pytest

from cortex_py.thermal import (
    ThermalMonitor,
    ThermalProbeError,
    ThermalReading,
    ThermalStatus,
    create_thermal_event_from_status,
)


class _StubProbe:
    def __init__(
        self,
        *,
        temperature: float,
        warning: float | None,
        critical: float | None,
        source: str = "stub",
    ) -> None:
        self._reading = ThermalReading(
            temperature_c=temperature,
            warning_c=warning,
            critical_c=critical,
            source=source,
            details={"probe": source},
        )

    def read(self) -> ThermalReading:
        return self._reading


class _FailingProbe:
    def read(self) -> ThermalReading:
        raise ThermalProbeError("probe offline")


def test_collect_nominal_status() -> None:
    monitor = ThermalMonitor(probes=[_StubProbe(temperature=55.0, warning=70.0, critical=90.0)])
    status = monitor.collect()

    assert status.status == "nominal"
    assert status.temperature_c == pytest.approx(55.0)
    assert status.warning_c == pytest.approx(70.0)
    assert status.critical_c == pytest.approx(90.0)
    assert status.source == "stub"


def test_collect_warning_status() -> None:
    monitor = ThermalMonitor(probes=[_StubProbe(temperature=78.0, warning=70.0, critical=90.0)])
    status = monitor.collect()

    assert status.status == "warning"
    assert status.temperature_c == pytest.approx(78.0)


def test_collect_critical_status() -> None:
    monitor = ThermalMonitor(probes=[_StubProbe(temperature=95.5, warning=70.0, critical=90.0)])
    status = monitor.collect()

    assert status.status == "critical"
    assert status.temperature_c == pytest.approx(95.5)


def test_collect_unknown_when_all_probes_fail() -> None:
    monitor = ThermalMonitor(probes=[_FailingProbe()])
    status = monitor.collect()

    assert status.status == "unknown"
    assert status.temperature_c is None
    assert "last_error" in status.details


def test_monitor_respects_custom_thresholds() -> None:
    monitor = ThermalMonitor(
        warning_threshold=50.0,
        critical_threshold=60.0,
        probes=[_StubProbe(temperature=55.0, warning=None, critical=None)],
    )
    status = monitor.collect()

    assert status.status == "warning"
    assert status.warning_c == pytest.approx(50.0)
    assert status.critical_c == pytest.approx(60.0)


def test_create_event_from_status() -> None:
    status = ThermalStatus(
        temperature_c=82.0,
        status="warning",
        warning_c=75.0,
        critical_c=90.0,
        source="stub",
        details={},
    )

    event = create_thermal_event_from_status(status, device_id="mlx-01")

    assert event.type == "mlx.thermal.warning"
    assert event.data["status"] == "warning"
    assert event.data["temperature"] == pytest.approx(82.0)
    assert event.data["threshold"] == pytest.approx(90.0 if status.status == "critical" else 75.0)


def test_event_defaults_for_nominal_status() -> None:
    status = ThermalStatus(
        temperature_c=48.0,
        status="nominal",
        warning_c=70.0,
        critical_c=90.0,
        source="stub",
        details={},
    )

    event = create_thermal_event_from_status(status, device_id="mlx-02")

    assert event.type == "mlx.thermal.status"
    assert event.data["status"] == "nominal"
    assert event.data["temperature"] == pytest.approx(48.0)
    assert event.data["threshold"] == pytest.approx(70.0)
