"""Cross-platform thermal monitoring utilities for cortex-py."""

from __future__ import annotations

import platform
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Protocol

try:  # pragma: no cover - optional dependency
    import psutil  # type: ignore
except (ImportError, ModuleNotFoundError):  # pragma: no cover - optional dependency
    psutil = None

from .a2a.events import create_mlx_thermal_event
from .a2a.models import A2AEnvelope


class ThermalProbeError(RuntimeError):
    """Raised when a thermal probe fails to provide data."""


class ThermalProbe(Protocol):
    """Protocol for thermal probes."""

    def read(self) -> "ThermalReading":
        """Return a single thermal reading."""


@dataclass(slots=True)
class ThermalReading:
    """Raw thermal reading returned by probes."""

    temperature_c: Optional[float]
    warning_c: Optional[float]
    critical_c: Optional[float]
    source: str
    details: Dict[str, Any]


@dataclass(slots=True)
class ThermalStatus:
    """Normalized thermal status for the runtime."""

    temperature_c: Optional[float]
    status: str
    warning_c: float
    critical_c: float
    source: str
    details: Dict[str, Any]

    def to_event(
        self,
        device_id: str,
        *,
        correlation_id: Optional[str] = None,
        traceparent: Optional[str] = None,
    ) -> A2AEnvelope:
        """Convert the status into an MLX thermal event."""

        event_status = self.status if self.status in {"warning", "critical"} else "nominal"
        threshold = self.critical_c if self.status == "critical" else self.warning_c
        temperature = self.temperature_c if self.temperature_c is not None else 0.0

        action_taken: Optional[str] = None
        if self.status == "critical":
            action_taken = "brAInwav thermal guard: switching to CPU-safe mode"
        elif self.status == "warning":
            action_taken = "brAInwav thermal guard: throttling workloads"
        elif self.status == "unknown":
            action_taken = "brAInwav thermal guard: sensor unavailable"

        return create_mlx_thermal_event(
            device_id=device_id,
            temperature=temperature,
            threshold=threshold,
            status=event_status,
            action_taken=action_taken,
            correlation_id=correlation_id,
            traceparent=traceparent,
        )


class PsutilProbe:
    """Probe using psutil sensor APIs."""

    def read(self) -> ThermalReading:
        if psutil is None:  # pragma: no cover - optional runtime
            raise ThermalProbeError("psutil not available")

        try:
            sensors = psutil.sensors_temperatures(fahrenheit=False)
        except Exception as exc:  # pragma: no cover - unexpected psutil failure
            raise ThermalProbeError(f"psutil sensors query failed: {exc}") from exc

        readings: List[ThermalReading] = []
        for label, entries in sensors.items():
            for entry in entries:
                if entry.current is None:
                    continue
                details: Dict[str, Any] = {
                    "label": entry.label or label,
                }
                readings.append(
                    ThermalReading(
                        temperature_c=float(entry.current),
                        warning_c=float(entry.high) if entry.high else None,
                        critical_c=float(entry.critical) if entry.critical else None,
                        source="psutil",
                        details=details,
                    )
                )

        if not readings:
            raise ThermalProbeError("psutil reported no temperature sensors")

        hottest = max(readings, key=lambda reading: reading.temperature_c or float("-inf"))
        return ThermalReading(
            temperature_c=hottest.temperature_c,
            warning_c=hottest.warning_c,
            critical_c=hottest.critical_c,
            source=hottest.source,
            details={"sensors": len(readings), **hottest.details},
        )


class LinuxSysfsProbe:
    """Probe reading temperatures from /sys/class/thermal."""

    def __init__(self, root: Optional[Path] = None) -> None:
        self._root = root or Path("/sys/class/thermal")

    def read(self) -> ThermalReading:
        if not self._root.exists():
            raise ThermalProbeError("thermal sysfs directory not available")

        temperatures: List[float] = []
        thresholds: List[float] = []

        for zone in self._root.glob("thermal_zone*"):
            temp_file = zone / "temp"
            try:
                raw_temp = temp_file.read_text().strip()
            except FileNotFoundError:
                continue

            if not raw_temp:
                continue

            value = self._normalize_temperature(raw_temp)
            temperatures.append(value)

            for trip_file in zone.glob("trip_point_*_temp"):
                try:
                    raw_trip = trip_file.read_text().strip()
                except FileNotFoundError:
                    continue
                if not raw_trip:
                    continue
                thresholds.append(self._normalize_temperature(raw_trip))

        if not temperatures:
            raise ThermalProbeError("no thermal zones reported temperatures")

        warning = min((val for val in thresholds if val > 0), default=None)
        critical = max((val for val in thresholds if val > 0), default=None)

        return ThermalReading(
            temperature_c=max(temperatures),
            warning_c=warning,
            critical_c=critical,
            source="linux:sysfs",
            details={"zones": len(temperatures)},
        )

    @staticmethod
    def _normalize_temperature(raw: str) -> float:
        try:
            value = float(raw)
        except ValueError as exc:  # pragma: no cover - malformed sysfs entry
            raise ThermalProbeError(f"invalid thermal value: {raw}") from exc

        if value > 1000:
            return value / 1000.0
        if value > 200:
            # Some kernels already report Celsius but scaled by 10
            return value / 10.0
        return value


class DarwinPowermetricsProbe:
    """Probe using pmset thermlog on macOS."""

    _COMMAND = ["/usr/bin/pmset", "-g", "thermlog"]

    def read(self) -> ThermalReading:
        try:
            completed = subprocess.run(
                self._COMMAND,
                check=True,
                capture_output=True,
                text=True,
                timeout=3,
            )
        except (FileNotFoundError, subprocess.SubprocessError, subprocess.TimeoutExpired) as exc:
            raise ThermalProbeError(f"pmset thermlog failed: {exc}") from exc

        match = re.search(r"CPU die temperature:\s*([0-9.]+)C", completed.stdout)
        if not match:
            raise ThermalProbeError("pmset thermlog did not report CPU temperature")

        return ThermalReading(
            temperature_c=float(match.group(1)),
            warning_c=None,
            critical_c=None,
            source="darwin:pmset",
            details={},
        )


class WindowsWmiProbe:
    """Probe using WMIC for thermal zone temperatures."""

    _COMMAND = [
        "wmic",
        "/namespace:\\root\\wmi",
        "PATH",
        "MSAcpi_ThermalZoneTemperature",
        "get",
        "CurrentTemperature",
    ]

    def read(self) -> ThermalReading:
        try:
            completed = subprocess.run(
                self._COMMAND,
                check=True,
                capture_output=True,
                text=True,
                timeout=3,
            )
        except (FileNotFoundError, subprocess.SubprocessError, subprocess.TimeoutExpired) as exc:
            raise ThermalProbeError(f"wmic query failed: {exc}") from exc

        temps = [line.strip() for line in completed.stdout.splitlines() if line.strip().isdigit()]
        if not temps:
            raise ThermalProbeError("wmic did not return temperatures")

        kelvin_times10 = float(temps[0])
        celsius = (kelvin_times10 / 10.0) - 273.15
        return ThermalReading(
            temperature_c=celsius,
            warning_c=None,
            critical_c=None,
            source="windows:wmic",
            details={},
        )


class ThermalMonitor:
    """High-level thermal monitor with platform-aware probes."""

    def __init__(
        self,
        *,
        warning_threshold: float = 80.0,
        critical_threshold: float = 90.0,
        probes: Optional[Iterable[ThermalProbe]] = None,
    ) -> None:
        self.warning_threshold = warning_threshold
        self.critical_threshold = max(critical_threshold, warning_threshold)
        self._probes = list(probes) if probes is not None else self._default_probes()

    def collect(self) -> ThermalStatus:
        last_error: Optional[str] = None
        for probe in self._probes:
            try:
                reading = probe.read()
            except ThermalProbeError as exc:
                last_error = str(exc)
                continue

            if reading.temperature_c is None:
                last_error = "probe returned no temperature"
                continue

            warning = reading.warning_c or self.warning_threshold
            critical = reading.critical_c or self.critical_threshold
            status = self._classify(reading.temperature_c, warning, critical)

            return ThermalStatus(
                temperature_c=round(reading.temperature_c, 2),
                status=status,
                warning_c=warning,
                critical_c=critical,
                source=reading.source,
                details=reading.details,
            )

        details: Dict[str, Any] = {"reason": "no_sensor_data"}
        if last_error:
            details["last_error"] = last_error

        return ThermalStatus(
            temperature_c=None,
            status="unknown",
            warning_c=self.warning_threshold,
            critical_c=self.critical_threshold,
            source="fallback",
            details=details,
        )

    def _default_probes(self) -> List[ThermalProbe]:
        probes: List[ThermalProbe] = []
        system = platform.system().lower()

        if psutil is not None:
            probes.append(PsutilProbe())

        if system == "linux":
            probes.append(LinuxSysfsProbe())
        elif system == "darwin":
            probes.append(DarwinPowermetricsProbe())
        elif system == "windows":
            probes.append(WindowsWmiProbe())

        return probes

    @staticmethod
    def _classify(temperature: float, warning: float, critical: float) -> str:
        if temperature >= critical:
            return "critical"
        if temperature >= warning:
            return "warning"
        return "nominal"


def create_thermal_event_from_status(
    status: ThermalStatus,
    device_id: str,
    *,
    correlation_id: Optional[str] = None,
    traceparent: Optional[str] = None,
) -> A2AEnvelope:
    """Helper for generating A2A events from a status."""

    return status.to_event(
        device_id=device_id,
        correlation_id=correlation_id,
        traceparent=traceparent,
    )


__all__ = [
    "ThermalMonitor",
    "ThermalProbe",
    "ThermalProbeError",
    "ThermalReading",
    "ThermalStatus",
    "create_thermal_event_from_status",
]
