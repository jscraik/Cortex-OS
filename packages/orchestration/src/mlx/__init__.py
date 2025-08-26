"""
MLX Optimization System for Cortex OS

Advanced MLX integration with caching, thermal management, and performance optimization.
"""

from .kv_cache_manager import AdvancedKVCacheManager, DEFAULT_SYSTEM_PROMPTS
from .tiered_model_manager import TieredMLXModelManager, ModelTier, ModelConfig
from .thermal_guard import ThermalGuard, ThermalState, ResourceMonitor
from .batched_inference import BatchedMLXInference, RequestPriority, InferenceRequest

__all__ = [
    # Cache Management
    "AdvancedKVCacheManager",
    "DEFAULT_SYSTEM_PROMPTS",
    
    # Model Management
    "TieredMLXModelManager", 
    "ModelTier",
    "ModelConfig",
    
    # Thermal Management
    "ThermalGuard",
    "ThermalState", 
    "ResourceMonitor",
    
    # Inference System
    "BatchedMLXInference",
    "RequestPriority",
    "InferenceRequest"
]

# Version info
__version__ = "1.0.0"
__author__ = "Cortex OS Team"
__description__ = "Advanced MLX optimization system with caching, thermal management, and performance optimization"