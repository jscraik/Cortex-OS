"""
A2A (Agent-to-Agent) Communication Module for Cortex-Py

This module provides Python A2A integration for the cortex-py MLX servers,
enabling cross-language communication with TypeScript A2A infrastructure.
Now supports real A2A core integration via stdio bridge.
"""

import os
from typing import Optional, Union

from .bus import A2ABus
from .bus import create_a2a_bus as create_a2a_bus_http
from .bus_core import A2ABusCore, create_a2a_bus_with_core
from .events import (
    MLXEventTypes,
    create_mlx_embedding_event,
    create_mlx_model_event,
    create_mlx_thermal_event,
)
from .models import (
    A2AEnvelope,
    MLXEmbeddingEvent,
    MLXModelEvent,
    MLXThermalEvent,
)
from .stdio_bridge import A2AStdioBridge, create_a2a_stdio_bridge

__all__ = [
    # Legacy HTTP transport
    "A2ABus",
    "create_a2a_bus_http",
    # Real A2A core integration
    "A2ABusCore",
    "create_a2a_bus",
    "create_a2a_bus_with_core",
    # Stdio bridge
    "A2AStdioBridge",
    "create_a2a_stdio_bridge",
    # Models and events
    "A2AEnvelope",
    "MLXEventTypes",
    "MLXEmbeddingEvent",
    "MLXModelEvent",
    "MLXThermalEvent",
    "create_mlx_embedding_event",
    "create_mlx_model_event",
    "create_mlx_thermal_event",
]


def _should_use_real_core(use_real_core: Optional[bool]) -> bool:
    if use_real_core is not None:
        return use_real_core

    env_flag = os.getenv("CORTEX_PY_USE_REAL_A2A")
    if env_flag is None:
        env_flag = os.getenv("CORTEX_PY_A2A_MODE")

    if not env_flag:
        return False

    normalized = env_flag.lower().strip()
    return normalized in {"true", "1", "stdio", "core", "real", "bridge"}


def create_a2a_bus(
    source: str = "urn:cortex:py:mlx",
    *,
    a2a_endpoint: Optional[str] = None,
    rate_limit: int = 100,
    timeout: float = 30.0,
    use_real_core: Optional[bool] = None,
    bridge: Optional[A2AStdioBridge] = None,
) -> Union[A2ABus, A2ABusCore]:
    """Factory that selects between HTTP and stdio bridge implementations."""

    if _should_use_real_core(use_real_core):
        return create_a2a_bus_with_core(source=source, bridge=bridge)

    return create_a2a_bus_http(
        source=source,
        a2a_endpoint=a2a_endpoint,
        rate_limit=rate_limit,
        timeout=timeout,
    )
