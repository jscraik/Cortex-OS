"""
A2A (Agent-to-Agent) Communication Module for Cortex-Py

This module provides Python A2A integration for the cortex-py MLX servers,
enabling cross-language communication with TypeScript A2A infrastructure.
Now supports real A2A core integration via stdio bridge.
"""

from .bus import A2ABus
from .bus import create_a2a_bus as create_a2a_bus_http
from .bus_core import A2ABusCore, create_a2a_bus, create_a2a_bus_with_core
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
    "create_a2a_bus",  # Default factory function (now uses real core)
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
