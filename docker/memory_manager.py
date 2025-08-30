#!/usr/bin/env python3
"""
MLX Memory Manager for Cortex-OS
Intelligent memory management for Apple Silicon M4 Max with 36GB RAM
Optimizes model loading/unloading based on available memory
"""

import logging
from datetime import datetime, timedelta

import psutil

logger = logging.getLogger(__name__)


class MLXMemoryManager:
    """Manages memory allocation for MLX models on Apple Silicon"""

    def __init__(self, total_ram_gb: int = 36, mlx_reserved_gb: int = 28):
        self.total_ram_gb = total_ram_gb
        self.mlx_reserved_gb = mlx_reserved_gb
        self.mlx_reserved_mb = mlx_reserved_gb * 1024
        self.system_reserved_mb = (total_ram_gb - mlx_reserved_gb) * 1024

        # Model memory tracking
        self.model_memory: dict[str, int] = {}  # model_name -> memory_mb
        self.memory_history: list[dict] = []

        # Memory thresholds
        self.memory_warning_threshold = 0.85  # 85% of MLX memory
        self.memory_critical_threshold = 0.95  # 95% of MLX memory

        logger.info(
            f"MLX Memory Manager initialized: {mlx_reserved_gb}GB reserved for MLX inference"
        )

    def get_system_memory_info(self) -> dict[str, float]:
        """Get current system memory usage"""
        memory = psutil.virtual_memory()
        return {
            "total_gb": memory.total / (1024**3),
            "available_gb": memory.available / (1024**3),
            "used_gb": memory.used / (1024**3),
            "percent_used": memory.percent,
        }

    def get_mlx_memory_usage(self) -> dict[str, float]:
        """Get MLX-specific memory usage"""
        used_mb = sum(self.model_memory.values())
        available_mb = self.mlx_reserved_mb - used_mb

        return {
            "mlx_reserved_gb": self.mlx_reserved_gb,
            "mlx_used_mb": used_mb,
            "mlx_used_gb": used_mb / 1024,
            "mlx_available_mb": available_mb,
            "mlx_available_gb": available_mb / 1024,
            "mlx_usage_percent": (used_mb / self.mlx_reserved_mb) * 100,
        }

    def can_load_model_size(self, required_mb: int) -> bool:
        """Check if enough MLX memory is available for a model"""
        usage = self.get_mlx_memory_usage()
        available_mb = usage["mlx_available_mb"]

        # Leave safety buffer of 512MB
        safety_buffer_mb = 512
        can_load = available_mb >= (required_mb + safety_buffer_mb)

        if not can_load:
            logger.warning(
                f"Insufficient MLX memory: need {required_mb}MB, have {available_mb}MB"
            )

        return can_load

    def register_model_memory(self, model_name: str, memory_mb: int):
        """Register a model's memory usage"""
        self.model_memory[model_name] = memory_mb
        self._log_memory_change("LOAD", model_name, memory_mb)
        self._check_memory_thresholds()

    def free_model_memory(self, model_name: str, memory_mb: int):
        """Free memory when a model is unloaded"""
        if model_name in self.model_memory:
            del self.model_memory[model_name]
            self._log_memory_change("UNLOAD", model_name, memory_mb)

    def _log_memory_change(self, action: str, model_name: str, memory_mb: int):
        """Log memory allocation changes"""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "action": action,
            "model": model_name,
            "memory_mb": memory_mb,
            "total_used_mb": sum(self.model_memory.values()),
        }
        self.memory_history.append(entry)

        # Keep last 100 entries
        if len(self.memory_history) > 100:
            self.memory_history = self.memory_history[-100:]

        logger.info(f"Memory {action}: {model_name} ({memory_mb}MB)")

    def _check_memory_thresholds(self):
        """Check if memory usage exceeds warning thresholds"""
        usage = self.get_mlx_memory_usage()
        usage_percent = usage["mlx_usage_percent"] / 100

        if usage_percent >= self.memory_critical_threshold:
            logger.critical(f"MLX memory critical: {usage_percent:.1%} used")
        elif usage_percent >= self.memory_warning_threshold:
            logger.warning(f"MLX memory warning: {usage_percent:.1%} used")

    def get_memory_strategy(self, required_mb: int) -> dict:
        """Get memory management strategy to free space for a new model"""
        if self.can_load_model_size(required_mb):
            return {"action": "no_action_needed", "unload": []}

        # Calculate how much memory needs to be freed
        usage = self.get_mlx_memory_usage()
        available_mb = usage["mlx_available_mb"]
        safety_buffer_mb = 512
        needed_mb = required_mb - available_mb + safety_buffer_mb

        # Find models to unload (prioritize by memory size and usage patterns)
        unload_candidates = self._get_unload_candidates()
        models_to_unload = []
        freed_memory = 0

        for model_name, memory_mb in unload_candidates:
            if freed_memory >= needed_mb:
                break
            models_to_unload.append(model_name)
            freed_memory += memory_mb

        if freed_memory >= needed_mb:
            return {
                "action": "unload_models",
                "unload": models_to_unload,
                "memory_freed_mb": freed_memory,
                "memory_needed_mb": needed_mb,
            }
        else:
            return {
                "action": "insufficient_memory",
                "unload": [],
                "message": f"Cannot free enough memory: need {needed_mb}MB, can free {freed_memory}MB",
            }

    def _get_unload_candidates(self) -> list[tuple[str, int]]:
        """Get list of models that can be unloaded, sorted by priority"""
        candidates = []

        # Model unload priorities (lower priority = unload first)
        unload_priorities = {
            "qwen3-instruct": 2,  # General purpose, can be reloaded
            "glm-4.5": 2,  # Large model, good candidate for unloading
            "mixtral": 3,  # Medium priority
            "qwen2.5-vl": 3,  # Vision model, specialized use
            "qwen3-coder": 4,  # High priority for development
            "phi3-mini": 5,  # Never unload (always-on utility)
        }

        for model_name, memory_mb in self.model_memory.items():
            priority = unload_priorities.get(model_name, 1)
            if priority < 5:  # Don't include phi3-mini (priority 5)
                candidates.append((model_name, memory_mb, priority))

        # Sort by priority (lower first), then by memory size (larger first)
        candidates.sort(key=lambda x: (x[2], -x[1]))

        return [(name, memory) for name, memory, _ in candidates]

    def get_optimal_model_combination(self) -> list[str]:
        """Get optimal combination of models for current memory"""
        available_mb = self.mlx_reserved_mb

        # Model configurations with priorities
        models = [
            ("phi3-mini", 2048, 5),  # Always load first
            ("qwen3-coder", 17408, 4),  # High priority for development
            ("mixtral", 12288, 3),  # Medium priority, fast inference
            ("qwen2.5-vl", 3072, 3),  # Vision capabilities
            ("qwen3-instruct", 22528, 2),  # General purpose
            ("glm-4.5", 22528, 1),  # Large context, lowest priority
        ]

        # Sort by priority (higher first)
        models.sort(key=lambda x: x[2], reverse=True)

        selected_models = []
        used_memory = 0

        for model_name, memory_mb, _priority in models:
            if used_memory + memory_mb <= available_mb:
                selected_models.append(model_name)
                used_memory += memory_mb
            else:
                break

        return selected_models

    def get_memory_status_report(self) -> dict:
        """Get comprehensive memory status report"""
        system_info = self.get_system_memory_info()
        mlx_info = self.get_mlx_memory_usage()

        # Model breakdown
        model_breakdown = []
        for model_name, memory_mb in self.model_memory.items():
            model_breakdown.append(
                {
                    "model": model_name,
                    "memory_mb": memory_mb,
                    "memory_gb": round(memory_mb / 1024, 1),
                    "percent_of_mlx": round(
                        (memory_mb / self.mlx_reserved_mb) * 100, 1
                    ),
                }
            )

        # Sort by memory usage
        model_breakdown.sort(key=lambda x: x["memory_mb"], reverse=True)  # type: ignore

        return {
            "timestamp": datetime.now().isoformat(),
            "system_memory": system_info,
            "mlx_memory": mlx_info,
            "loaded_models": model_breakdown,
            "memory_warnings": self._get_memory_warnings(),
            "recommendations": self._get_memory_recommendations(),
        }

    def _get_memory_warnings(self) -> list[str]:
        """Get current memory warnings"""
        warnings = []
        usage = self.get_mlx_memory_usage()
        usage_percent = usage["mlx_usage_percent"] / 100

        if usage_percent >= self.memory_critical_threshold:
            warnings.append(f"CRITICAL: MLX memory usage at {usage_percent:.1%}")
        elif usage_percent >= self.memory_warning_threshold:
            warnings.append(f"WARNING: MLX memory usage at {usage_percent:.1%}")

        if usage["mlx_available_gb"] < 2:
            warnings.append(
                f"LOW MEMORY: Only {usage['mlx_available_gb']:.1f}GB available"
            )

        return warnings

    def _get_memory_recommendations(self) -> list[str]:
        """Get memory optimization recommendations"""
        recommendations = []
        usage = self.get_mlx_memory_usage()

        if usage["mlx_usage_percent"] > 80:
            recommendations.append("Consider unloading unused models to free memory")

        if "glm-4.5" in self.model_memory and "qwen3-instruct" in self.model_memory:
            recommendations.append(
                "Both GLM-4.5 and Qwen3-Instruct loaded - consider unloading one"
            )

        if usage["mlx_available_gb"] > 15:
            recommendations.append(
                "Plenty of memory available - consider loading additional models"
            )

        return recommendations

    def get_available_memory(self) -> int:
        """Get available MLX memory in MB"""
        usage = self.get_mlx_memory_usage()
        return int(usage["mlx_available_mb"])

    def cleanup_memory_history(self, days_to_keep: int = 7):
        """Clean up old memory history entries"""
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)

        self.memory_history = [
            entry
            for entry in self.memory_history
            if datetime.fromisoformat(entry["timestamp"]) > cutoff_date
        ]

        logger.info(f"Cleaned memory history, kept last {days_to_keep} days")

    def get_memory_efficiency_score(self) -> float:
        """Calculate memory efficiency score (0-100)"""
        usage = self.get_mlx_memory_usage()
        usage_percent = usage["mlx_usage_percent"] / 100

        # Optimal usage is around 70-80%
        if 0.7 <= usage_percent <= 0.8:
            efficiency = 100.0
        elif usage_percent < 0.7:
            # Underutilization penalty
            efficiency = max(0.0, 100.0 - (0.7 - usage_percent) * 200)
        else:
            # Over-utilization penalty
            efficiency = max(0.0, 100.0 - (usage_percent - 0.8) * 500)

        return round(efficiency, 1)
