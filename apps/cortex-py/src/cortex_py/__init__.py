"""Cortex-py shared services and MCP integration helpers."""

from __future__ import annotations

from importlib import import_module
from typing import TYPE_CHECKING, Any

__all__ = [
    "BatchEmbeddingServiceResult",
    "EmbeddingService",
    "EmbeddingServiceResult",
    "RateLimitExceeded",
    "SecurityViolation",
    "ServiceError",
    "ServiceValidationError",
    "ThermalMonitor",
    "ThermalProbe",
    "ThermalProbeError",
    "ThermalReading",
    "ThermalStatus",
    "create_thermal_event_from_status",
]

_EXPORTS = {
    "BatchEmbeddingServiceResult": ("cortex_py.services", "BatchEmbeddingServiceResult"),
    "EmbeddingService": ("cortex_py.services", "EmbeddingService"),
    "EmbeddingServiceResult": ("cortex_py.services", "EmbeddingServiceResult"),
    "RateLimitExceeded": ("cortex_py.services", "RateLimitExceeded"),
    "SecurityViolation": ("cortex_py.services", "SecurityViolation"),
    "ServiceError": ("cortex_py.services", "ServiceError"),
    "ServiceValidationError": ("cortex_py.services", "ServiceValidationError"),
    "ThermalMonitor": ("cortex_py.thermal", "ThermalMonitor"),
    "ThermalProbe": ("cortex_py.thermal", "ThermalProbe"),
    "ThermalProbeError": ("cortex_py.thermal", "ThermalProbeError"),
    "ThermalReading": ("cortex_py.thermal", "ThermalReading"),
    "ThermalStatus": ("cortex_py.thermal", "ThermalStatus"),
    "create_thermal_event_from_status": (
        "cortex_py.thermal",
        "create_thermal_event_from_status",
    ),
}


if TYPE_CHECKING:  # pragma: no cover - import-time convenience for type checkers
    from .services import (  # noqa: F401
        BatchEmbeddingServiceResult,
        EmbeddingService,
        EmbeddingServiceResult,
        RateLimitExceeded,
        SecurityViolation,
        ServiceError,
        ServiceValidationError,
    )
    from .thermal import (  # noqa: F401
        ThermalMonitor,
        ThermalProbe,
        ThermalProbeError,
        ThermalReading,
        ThermalStatus,
        create_thermal_event_from_status,
    )


def __getattr__(name: str) -> Any:
    module_info = _EXPORTS.get(name)
    if module_info is None:
        raise AttributeError(f"module {__name__} has no attribute {name}")
    module_path, attribute = module_info
    module = import_module(module_path)
    value = getattr(module, attribute)
    globals()[name] = value
    return value


def __dir__() -> list[str]:
    return sorted(__all__)
