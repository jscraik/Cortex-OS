#!/usr/bin/env python3
"""
Tiered Model Loading Architecture for MLX
Smart model management with memory-aware loading and eviction
"""

import asyncio
import json
import logging
import platform
import psutil
import subprocess
import time
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Set, Any, Tuple

try:
    import mlx.core as mx
    from mlx_lm import load
    MLX_AVAILABLE = True
except ImportError:
    MLX_AVAILABLE = False
    # Mock for environments without MLX
    class mx:
        @staticmethod
        def metal_clear_cache():
            pass
    
    def load(*args, **kwargs):
        return None, None

logger = logging.getLogger(__name__)


class ModelTier(Enum):
    """Model tier classifications"""
    ALWAYS_ON = "always_on"      # Keep loaded at all times (1GB limit)
    FREQUENT = "frequent"        # Load when needed, keep if space (5GB limit)
    ON_DEMAND = "on_demand"      # Load only when requested (22GB limit)


@dataclass
class ModelConfig:
    """Model configuration with metadata"""
    id: str
    name: str
    ram_gb: float
    tier: ModelTier
    use_cases: List[str]
    priority: str
    tokens_per_second: int = 80
    context_length: int = 4096
    first_token_latency_ms: int = 100
    specializations: List[str] = None
    quantization: str = "4bit"
    
    def __post_init__(self):
        if self.specializations is None:
            self.specializations = []


@dataclass
class LoadedModel:
    """Represents a loaded model in memory"""
    config: ModelConfig
    model: Any
    tokenizer: Any
    loaded_at: float
    last_used: float
    usage_count: int = 0
    
    def update_usage(self):
        """Update usage statistics"""
        self.last_used = time.time()
        self.usage_count += 1


class TieredMLXModelManager:
    """
    Intelligent model loading manager with tiered architecture
    
    Tiers:
    - always_on: Ultra-light models kept loaded (Gemma-3-270m, Phi3-mini) - 1GB max
    - frequent: Medium models loaded on demand, kept if space - 5GB max  
    - on_demand: Large models loaded only when needed - 22GB max
    
    Features:
    - Smart eviction based on usage patterns
    - Memory pressure detection
    - Task complexity-based model selection
    - Thermal awareness integration
    - Performance monitoring
    """
    
    def __init__(self, max_memory_gb: int = 28):
        self.max_memory_gb = max_memory_gb
        
        # Model configurations by tier
        self.model_configs = self._initialize_model_configs()
        
        # Currently loaded models
        self.loaded_models: Dict[str, LoadedModel] = {}
        
        # Memory management
        self.memory_usage_gb = 0.0
        self.memory_warning_threshold = 0.8  # 80% of max memory
        self.memory_critical_threshold = 0.95  # 95% of max memory
        
        # Usage tracking
        self.load_history: List[Dict[str, Any]] = []
        self.eviction_history: List[Dict[str, Any]] = []
        
        # Performance metrics
        self.total_loads = 0
        self.total_evictions = 0
        self.load_failures = 0
        
        # Tier memory limits
        self.tier_limits = {
            ModelTier.ALWAYS_ON: 1.0,
            ModelTier.FREQUENT: 5.0,
            ModelTier.ON_DEMAND: 22.0
        }
        
        logger.info(f"Tiered Model Manager initialized with {max_memory_gb}GB limit")
        
        # Auto-load always_on models
        asyncio.create_task(self._load_always_on_models())
    
    def _initialize_model_configs(self) -> Dict[str, ModelConfig]:
        """Initialize model configurations"""
        configs = {
            "gemma-3-270m": ModelConfig(
                id="lmstudio-community/gemma-2-2b-it-4bit",
                name="gemma-3-270m",
                ram_gb=0.3,
                tier=ModelTier.ALWAYS_ON,
                use_cases=["instant_response", "always_on", "coordination"],
                priority="critical",
                tokens_per_second=150,
                context_length=8192,
                first_token_latency_ms=50,
                specializations=["speed_optimized", "low_latency"],
                quantization="4bit"
            ),
            "phi3-mini": ModelConfig(
                id="mlx-community/Phi-3-mini-4k-instruct-4bit",
                name="phi3-mini",
                ram_gb=2.0,
                tier=ModelTier.ALWAYS_ON,
                use_cases=["utility", "simple_task", "always_on"],
                priority="critical",
                tokens_per_second=120,
                specializations=["utility_tasks"]
            ),
            "mixtral": ModelConfig(
                id="mlx-community/Mixtral-8x7B-v0.1-hf-4bit-mlx",
                name="mixtral",
                ram_gb=12.0,
                tier=ModelTier.FREQUENT,
                use_cases=["fast_response", "multilingual"],
                priority="medium",
                tokens_per_second=90,
                context_length=32768
            ),
            "qwen2.5-vl": ModelConfig(
                id="mlx-community/Qwen2.5-VL-3B-Instruct-6bit",
                name="qwen2.5-vl",
                ram_gb=3.0,
                tier=ModelTier.FREQUENT,
                use_cases=["image_analysis", "vision_tasks"],
                priority="medium",
                tokens_per_second=100,
                specializations=["vision", "multimodal"]
            ),
            "qwen3-coder": ModelConfig(
                id="mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit",
                name="qwen3-coder",
                ram_gb=17.0,
                tier=ModelTier.ON_DEMAND,
                use_cases=["code_generation", "code_review", "debugging"],
                priority="critical",
                tokens_per_second=80,
                context_length=256000,
                specializations=["function_calling", "repository_understanding", "fill_in_middle"]
            ),
            "qwen3-instruct": ModelConfig(
                id="mlx-community/Qwen3-30B-A3B-Instruct-4bit",
                name="qwen3-instruct",
                ram_gb=22.0,
                tier=ModelTier.ON_DEMAND,
                use_cases=["general_chat", "complex_reasoning"],
                priority="high",
                tokens_per_second=75,
                context_length=128000
            ),
            "glm-4.5": ModelConfig(
                id="mlx-community/GLM-4.5-4bit",
                name="glm-4.5",
                ram_gb=22.0,
                tier=ModelTier.ON_DEMAND,
                use_cases=["document_analysis", "long_context"],
                priority="high",
                tokens_per_second=70,
                context_length=128000
            )
        }
        
        return configs
    
    def calculate_task_complexity(self, task_description: str, context_length: int = 0) -> float:
        """
        Calculate task complexity score to determine appropriate model
        
        Args:
            task_description: Description of the task
            context_length: Length of context/prompt
            
        Returns:
            Complexity score between 0.0 and 1.0
        """
        complexity = 0.0
        description_lower = task_description.lower()
        
        # Base complexity from task type
        if any(word in description_lower for word in ["simple", "quick", "basic", "utility"]):
            complexity += 0.1
        elif any(word in description_lower for word in ["moderate", "standard", "normal"]):
            complexity += 0.3
        elif any(word in description_lower for word in ["complex", "advanced", "sophisticated"]):
            complexity += 0.6
        elif any(word in description_lower for word in ["expert", "research", "analysis"]):
            complexity += 0.8
        else:
            complexity += 0.5  # Default moderate
        
        # Adjust for specific domains
        if any(word in description_lower for word in ["code", "programming", "debug", "refactor"]):
            complexity += 0.2
        if any(word in description_lower for word in ["image", "vision", "visual", "photo"]):
            complexity += 0.1
        if any(word in description_lower for word in ["reasoning", "logic", "math", "calculation"]):
            complexity += 0.2
        if any(word in description_lower for word in ["creative", "story", "writing", "content"]):
            complexity += 0.1
        
        # Adjust for context length
        if context_length > 10000:
            complexity += 0.2
        elif context_length > 50000:
            complexity += 0.4
        
        return min(complexity, 1.0)
    
    def smart_load(self, task_description: str, context_length: int = 0) -> Optional[str]:
        """
        Smart model selection and loading based on task complexity
        
        Args:
            task_description: Description of the task
            context_length: Length of context/prompt
            
        Returns:
            Name of selected model or None if loading failed
        """
        complexity = self.calculate_task_complexity(task_description, context_length)
        
        # Select model based on complexity
        if complexity < 0.3:
            # Simple tasks - use always_on models
            candidates = ["gemma-3-270m", "phi3-mini"]
        elif complexity < 0.6:
            # Moderate tasks - use frequent tier
            candidates = ["mixtral", "qwen2.5-vl"]
            
            # Check for specific use cases
            task_lower = task_description.lower()
            if any(word in task_lower for word in ["image", "vision", "visual"]):
                candidates = ["qwen2.5-vl"]
        else:
            # Complex tasks - use on_demand models
            task_lower = task_description.lower()
            if any(word in task_lower for word in ["code", "programming", "debug"]):
                candidates = ["qwen3-coder"]
            elif context_length > 50000:
                candidates = ["qwen3-instruct", "glm-4.5"]
            else:
                candidates = ["qwen3-instruct", "qwen3-coder"]
        
        # Try to load the best candidate
        for model_name in candidates:
            if self._can_load_model(model_name):
                success = asyncio.run(self.load_model(model_name))
                if success:
                    logger.info(f"Selected {model_name} for complexity {complexity:.2f}")
                    return model_name
        
        # Fallback to already loaded models
        for model_name in self.loaded_models:
            if self._model_suitable_for_task(model_name, task_description):
                logger.info(f"Using already loaded {model_name} for task")
                return model_name
        
        logger.warning(f"No suitable model available for task complexity {complexity:.2f}")
        return None
    
    def _model_suitable_for_task(self, model_name: str, task_description: str) -> bool:
        """Check if a loaded model is suitable for the task"""
        if model_name not in self.model_configs:
            return False
        
        config = self.model_configs[model_name]
        task_lower = task_description.lower()
        
        # Check use cases
        for use_case in config.use_cases:
            if use_case.replace("_", " ") in task_lower:
                return True
        
        # Check specializations
        for spec in config.specializations:
            if spec.replace("_", " ") in task_lower:
                return True
        
        return False
    
    def _can_load_model(self, model_name: str) -> bool:
        """Check if model can be loaded given current memory constraints"""
        if model_name not in self.model_configs:
            return False
        
        config = self.model_configs[model_name]
        
        # Check if already loaded
        if model_name in self.loaded_models:
            return True
        
        # Check memory availability
        available_memory = self.max_memory_gb - self.memory_usage_gb
        if config.ram_gb > available_memory:
            # Try to evict models to make space
            if self._evict_for_space(config.ram_gb):
                return True
            return False
        
        return True
    
    async def load_model(self, model_name: str) -> bool:
        """
        Load a model into memory
        
        Args:
            model_name: Name of the model to load
            
        Returns:
            True if loading succeeded, False otherwise
        """
        if model_name in self.loaded_models:
            # Update usage if already loaded
            self.loaded_models[model_name].update_usage()
            return True
        
        if model_name not in self.model_configs:
            logger.error(f"Unknown model: {model_name}")
            return False
        
        config = self.model_configs[model_name]
        
        # Check memory availability
        if not self._can_load_model(model_name):
            logger.warning(f"Cannot load {model_name} - insufficient memory")
            return False
        
        logger.info(f"Loading model {model_name} ({config.ram_gb}GB)")
        
        try:
            start_time = time.time()
            
            if MLX_AVAILABLE:
                model, tokenizer = load(config.id)
                
                if model is None or tokenizer is None:
                    raise Exception("Failed to load model from MLX")
            else:
                # Mock for testing
                model, tokenizer = None, None
            
            load_time = time.time() - start_time
            
            # Create loaded model entry
            loaded_model = LoadedModel(
                config=config,
                model=model,
                tokenizer=tokenizer,
                loaded_at=time.time(),
                last_used=time.time()
            )
            
            self.loaded_models[model_name] = loaded_model
            self.memory_usage_gb += config.ram_gb
            self.total_loads += 1
            
            # Record load history
            self.load_history.append({
                "model_name": model_name,
                "timestamp": time.time(),
                "load_time_seconds": load_time,
                "memory_gb": config.ram_gb,
                "tier": config.tier.value
            })
            
            logger.info(f"Successfully loaded {model_name} in {load_time:.2f}s")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            self.load_failures += 1
            return False
    
    def _evict_for_space(self, required_gb: float) -> bool:
        """
        Evict models to make space for a new model
        
        Args:
            required_gb: Amount of memory needed
            
        Returns:
            True if enough space was freed, False otherwise
        """
        available = self.max_memory_gb - self.memory_usage_gb
        
        if available >= required_gb:
            return True
        
        needed = required_gb - available
        
        # Get eviction candidates (excluding always_on tier)
        candidates = []
        for name, loaded_model in self.loaded_models.items():
            if loaded_model.config.tier != ModelTier.ALWAYS_ON:
                candidates.append((name, loaded_model))
        
        # Sort by priority (least recently used, lower priority first)
        candidates.sort(key=lambda x: (
            self._get_priority_score(x[1].config.priority),
            x[1].last_used
        ))
        
        freed_memory = 0.0
        evicted_models = []
        
        for name, loaded_model in candidates:
            if freed_memory >= needed:
                break
            
            self._evict_model(name)
            freed_memory += loaded_model.config.ram_gb
            evicted_models.append(name)
        
        if freed_memory >= needed:
            logger.info(f"Evicted {evicted_models} to free {freed_memory:.1f}GB")
            return True
        else:
            logger.warning(f"Could not free enough memory (needed {needed:.1f}GB, freed {freed_memory:.1f}GB)")
            return False
    
    def _get_priority_score(self, priority: str) -> int:
        """Convert priority string to numeric score for sorting"""
        priority_map = {
            "critical": 4,
            "high": 3,
            "medium": 2,
            "low": 1
        }
        return priority_map.get(priority, 1)
    
    def _evict_model(self, model_name: str) -> bool:
        """
        Evict a specific model from memory
        
        Args:
            model_name: Name of model to evict
            
        Returns:
            True if eviction succeeded
        """
        if model_name not in self.loaded_models:
            return False
        
        loaded_model = self.loaded_models[model_name]
        
        # Don't evict always_on models unless critical memory pressure
        if loaded_model.config.tier == ModelTier.ALWAYS_ON:
            memory_pressure = self.memory_usage_gb / self.max_memory_gb
            if memory_pressure < self.memory_critical_threshold:
                return False
        
        logger.info(f"Evicting model {model_name} ({loaded_model.config.ram_gb}GB)")
        
        # Clear model from memory
        del self.loaded_models[model_name]
        self.memory_usage_gb -= loaded_model.config.ram_gb
        self.total_evictions += 1
        
        # Record eviction history
        self.eviction_history.append({
            "model_name": model_name,
            "timestamp": time.time(),
            "usage_count": loaded_model.usage_count,
            "loaded_duration": time.time() - loaded_model.loaded_at,
            "reason": "memory_pressure"
        })
        
        # Clear MLX cache
        if MLX_AVAILABLE:
            mx.metal.clear_cache()
        
        return True
    
    async def _load_always_on_models(self) -> None:
        """Load all always_on tier models at startup"""
        always_on_models = [
            name for name, config in self.model_configs.items()
            if config.tier == ModelTier.ALWAYS_ON
        ]
        
        for model_name in always_on_models:
            success = await self.load_model(model_name)
            if success:
                logger.info(f"Loaded always_on model: {model_name}")
            else:
                logger.warning(f"Failed to load always_on model: {model_name}")
    
    def get_loaded_model(self, model_name: str) -> Optional[LoadedModel]:
        """Get a loaded model instance"""
        loaded_model = self.loaded_models.get(model_name)
        if loaded_model:
            loaded_model.update_usage()
        return loaded_model
    
    def get_memory_status(self) -> Dict[str, Any]:
        """Get current memory status"""
        memory_pressure = self.memory_usage_gb / self.max_memory_gb
        
        status = "normal"
        if memory_pressure > self.memory_critical_threshold:
            status = "critical"
        elif memory_pressure > self.memory_warning_threshold:
            status = "warning"
        
        return {
            "total_memory_gb": self.max_memory_gb,
            "used_memory_gb": self.memory_usage_gb,
            "available_memory_gb": self.max_memory_gb - self.memory_usage_gb,
            "memory_pressure": memory_pressure,
            "status": status,
            "loaded_models_count": len(self.loaded_models),
            "loaded_models": list(self.loaded_models.keys())
        }
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        return {
            "total_loads": self.total_loads,
            "total_evictions": self.total_evictions,
            "load_failures": self.load_failures,
            "success_rate": (self.total_loads - self.load_failures) / max(self.total_loads, 1),
            "models_by_tier": {
                tier.value: [
                    name for name, loaded in self.loaded_models.items()
                    if loaded.config.tier == tier
                ]
                for tier in ModelTier
            },
            "memory_efficiency": self.memory_usage_gb / self.max_memory_gb
        }
    
    def list_available_models(self) -> List[Dict[str, Any]]:
        """List all available models with their configurations"""
        models = []
        
        for name, config in self.model_configs.items():
            is_loaded = name in self.loaded_models
            last_used = None
            usage_count = 0
            
            if is_loaded:
                loaded_model = self.loaded_models[name]
                last_used = loaded_model.last_used
                usage_count = loaded_model.usage_count
            
            models.append({
                "name": name,
                "id": config.id,
                "ram_gb": config.ram_gb,
                "tier": config.tier.value,
                "use_cases": config.use_cases,
                "priority": config.priority,
                "tokens_per_second": config.tokens_per_second,
                "context_length": config.context_length,
                "specializations": config.specializations,
                "is_loaded": is_loaded,
                "last_used": last_used,
                "usage_count": usage_count
            })
        
        return sorted(models, key=lambda x: (x["tier"], -x["ram_gb"]))


if __name__ == "__main__":
    # Demo usage
    import asyncio
    
    async def demo():
        manager = TieredMLXModelManager()
        
        # Wait for always_on models to load
        await asyncio.sleep(2)
        
        # Test task complexity calculation
        tasks = [
            "Simple utility task",
            "Moderate code review",
            "Complex research analysis",
            "Image processing task",
            "Advanced mathematical reasoning"
        ]
        
        for task in tasks:
            complexity = manager.calculate_task_complexity(task)
            model = manager.smart_load(task)
            print(f"Task: {task}")
            print(f"Complexity: {complexity:.2f}, Selected Model: {model}")
            print()
        
        # Print memory status
        memory_status = manager.get_memory_status()
        print("Memory Status:", json.dumps(memory_status, indent=2))
        
        # Print performance stats
        perf_stats = manager.get_performance_stats()
        print("Performance Stats:", json.dumps(perf_stats, indent=2))
    
    asyncio.run(demo())