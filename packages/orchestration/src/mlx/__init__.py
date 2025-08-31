"""
MLX Optimization System for Cortex OS

Advanced MLX integration with caching, thermal management, and performance optimization.
"""

from .batched_inference import BatchedMLXInference, InferenceRequest, RequestPriority
from .kv_cache_manager import DEFAULT_SYSTEM_PROMPTS, AdvancedKVCacheManager
from .thermal_guard import ResourceMonitor, ThermalGuard, ThermalState
from .tiered_model_manager import ModelConfig, ModelTier, TieredMLXModelManager

__all__ = [
    "DEFAULT_SYSTEM_PROMPTS",
    # Cache Management
    "AdvancedKVCacheManager",
    # Inference System
    "BatchedMLXInference",
    "InferenceRequest",
    "ModelConfig",
    "ModelTier",
    "RequestPriority",
    "ResourceMonitor",
    # Thermal Management
    "ThermalGuard",
    "ThermalState",
    # Model Management
    "TieredMLXModelManager",
]

# Version info
__version__ = "1.0.0"
__author__ = "Cortex OS Team"
__description__ = "Advanced MLX optimization system with caching, thermal management, and performance optimization"
