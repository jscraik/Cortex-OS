"""
A2A (Agent-to-Agent) Communication Module for Cortex-Py

This module provides Python A2A integration for the cortex-py MLX servers,
enabling cross-language communication with TypeScript A2A infrastructure.
"""

from .bus import A2ABus, create_a2a_bus
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

__all__ = [
    "A2ABus",
    "A2AEnvelope",
    "MLXEventTypes",
    "MLXEmbeddingEvent",
    "MLXModelEvent",
    "MLXThermalEvent",
    "create_a2a_bus",
    "create_mlx_embedding_event",
    "create_mlx_model_event",
    "create_mlx_thermal_event",
]
