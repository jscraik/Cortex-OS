"""Thermal monitoring utilities for cortex-py LangGraph integration."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol

from cortex_py.a2a.events import create_mlx_thermal_event
from cortex_py.a2a.models import A2AEnvelope, MLXThermalEvent


class ThermalPublisher(Protocol):
    """Protocol describing the publish interface for thermal events."""

    async def publish(self, envelope: A2AEnvelope) -> bool:  # pragma: no cover - protocol contract
        """Publish an A2A envelope."""


@dataclass(frozen=True)
class ThermalEvent:
    """Structured thermal event produced by :class:`ThermalMonitor`."""

    device_id: str
    temperature: float
    level: str
    threshold: float
    throttle_hint: str | None
    source: str
    timestamp: str
    message: str


@dataclass(frozen=True)
class ThermalPolicy:
    """Simple threshold policy for determining thermal event levels."""

    warning_threshold: float
    critical_threshold: float

    def classify(self, temperature: float) -> str:
        """Return the level name for the provided ``temperature``."""

        if temperature >= self.critical_threshold:
            return "critical"
        if temperature >= self.warning_threshold:
            return "warning"
        return "nominal"

    def threshold_for(self, level: str) -> float:
        """Return the numeric threshold associated with ``level``."""

        if level == "critical":
            return self.critical_threshold
        if level == "warning":
            return self.warning_threshold
        return self.warning_threshold - 5

    def throttle_hint_for(self, level: str) -> str | None:
        """Provide a deterministic throttle hint for ``level``."""

        if level == "critical":
            return "brAInwav:reduce-load"
        if level == "warning":
            return "brAInwav:prepare-fallback"
        return None


class ThermalMonitor:
    """Monitor MLX thermal readings and publish structured events."""

    def __init__(
        self,
        device_id: str,
        publisher: ThermalPublisher | None = None,
        *,
        policy: ThermalPolicy | None = None,
        source: str = "urn:brainwav:mlx:thermal",
    ) -> None:
        self._device_id = device_id
        self._publisher = publisher
        self._policy = policy or ThermalPolicy(warning_threshold=75.0, critical_threshold=85.0)
        self._source = source
        self._lock = asyncio.Lock()

    @property
    def policy(self) -> ThermalPolicy:
        """Expose the configured policy for tests."""

        return self._policy

    async def publish_reading(self, temperature: float) -> ThermalEvent:
        """Classify ``temperature`` and publish a structured event."""

        async with self._lock:
            level = self._policy.classify(temperature)
            threshold = self._policy.threshold_for(level)
            throttle_hint = self._policy.throttle_hint_for(level)
            timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            message = f"brAInwav thermal {level} detected on {self._device_id}"

            event = ThermalEvent(
                device_id=self._device_id,
                temperature=temperature,
                level=level,
                threshold=threshold,
                throttle_hint=throttle_hint,
                source=self._source,
                timestamp=timestamp,
                message=message,
            )

            if self._publisher is not None:
                await self._publisher.publish(self._build_envelope(event))

            return event

    def _build_envelope(self, event: ThermalEvent) -> A2AEnvelope:
        """Translate the structured event into an :class:`A2AEnvelope`."""

        status = event.level
        if status == "nominal":
            status = "normal"

        envelope = create_mlx_thermal_event(
            device_id=event.device_id,
            temperature=event.temperature,
            threshold=event.threshold,
            status=status,
            action_taken=event.throttle_hint,
            source=event.source,
        )

        payload = MLXThermalEvent(**envelope.data)
        payload_dict = payload.dict()
        payload_dict["message"] = event.message
        if event.throttle_hint is not None:
            payload_dict["throttle_hint"] = event.throttle_hint
        envelope.data = payload_dict
        return envelope


def create_thermal_monitor(
    device_id: str,
    *,
    policy: ThermalPolicy | None = None,
    use_real_bus: bool = False,
    source: str = "urn:brainwav:mlx:thermal",
) -> ThermalMonitor:
    """Factory helper used by tests to create a configured monitor."""

    publisher: ThermalPublisher | None = None
    if use_real_bus:
        try:
            from cortex_py.a2a import create_a2a_bus as _create_a2a_bus

            publisher = _create_a2a_bus(source=source)
        except ModuleNotFoundError:  # pragma: no cover - dependency missing in tests
            publisher = None
        except TypeError:  # pragma: no cover - compatibility shim
            try:
                from cortex_py.a2a import create_a2a_bus as _create_a2a_bus

                publisher = _create_a2a_bus(source=source, use_real_core=True)
            except Exception:  # pragma: no cover - final fallback
                try:
                    from cortex_py.a2a import create_a2a_bus_with_core as _create_a2a_bus_with_core

                    publisher = _create_a2a_bus_with_core(source=source)
                except Exception:
                    publisher = None
        except Exception:  # pragma: no cover - fallback to stdio bridge
            try:
                from cortex_py.a2a import create_a2a_bus_with_core as _create_a2a_bus_with_core

                publisher = _create_a2a_bus_with_core(source=source)
            except Exception:
                publisher = None
    return ThermalMonitor(device_id, publisher=publisher, policy=policy, source=source)


__all__ = [
    "ThermalEvent",
    "ThermalMonitor",
    "ThermalPolicy",
    "ThermalPublisher",
    "create_thermal_monitor",
]
