"""
brAInwav Cortex-OS MLX Hybrid Configuration
Ensures MLX-first priority with proper integration into hybrid strategy
"""

import logging
import os
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class HybridMLXConfig:
    """Configuration for MLX integration in hybrid model strategy"""

    def __init__(self):
        """Initialize brAInwav Cortex-OS MLX hybrid configuration"""
        self._init_environment_config()
        self._init_branding_config()
        self._init_mlx_config()
        self._init_required_models()
        self._log_initialization()

    def _init_environment_config(self) -> None:
        """Initialize environment-based configuration"""
        self.mlx_priority = int(os.getenv("CORTEX_MLX_FIRST_PRIORITY", "100"))
        self.hybrid_mode = os.getenv("CORTEX_HYBRID_MODE", "performance")
        self.privacy_mode = os.getenv("CORTEX_PRIVACY_MODE", "false").lower() == "true"
        self.conjunction_enabled = (
            os.getenv("CORTEX_CONJUNCTION_ENABLED", "true").lower() == "true"
        )

    def _init_branding_config(self) -> None:
        """Initialize brAInwav branding configuration"""
        self.company = os.getenv("CORTEX_COMPANY", "brAInwav")
        self.log_prefix = os.getenv("CORTEX_LOG_PREFIX", "brAInwav Cortex-OS:")

    def _init_mlx_config(self) -> None:
        """Initialize MLX-specific configuration"""
        self.mlx_base_url = os.getenv("MLX_BASE_URL", "http://localhost:8081")
        self.mlx_cache_dir = os.getenv("MLX_CACHE_DIR", "/Volumes/ExternalSSD/ai-cache")
        self.mlx_model_path = os.getenv(
            "MLX_MODEL_PATH", "/Volumes/ExternalSSD/ai-models"
        )

    def _init_required_models(self) -> None:
        """Initialize required models configuration"""
        self.required_models = self._build_required_models_config()

    def _log_initialization(self) -> None:
        """Log brAInwav Cortex-OS initialization completion"""
        logger.info(f"{self.log_prefix} MLX hybrid configuration initialized")
        logger.info(f"{self.log_prefix} MLX priority: {self.mlx_priority}")
        logger.info(f"{self.log_prefix} Hybrid mode: {self.hybrid_mode}")
        logger.info(f"{self.log_prefix} Privacy mode: {self.privacy_mode}")
        logger.info(f"{self.log_prefix} Required models: {len(self.required_models)}")

    def _build_required_models_config(self) -> dict[str, dict[str, Any]]:
        """Build the required models configuration dictionary"""
        return {
            "glm-4.5": {
                "name": "GLM-4.5-mlx-4Bit",
                "priority": 100,
                "capabilities": ["chat", "coding"],
                "path": f"{self.mlx_cache_dir}/huggingface/hub/models--brAInwav--GLM-4.5-mlx-4Bit",
                "memory_gb": 8.0,
                "context_length": 32768,
            },
            "qwen2.5-vl": self._build_vision_model_config(),
            "gemma-2-2b": self._build_balanced_model_config(),
            "smollm-135m": self._build_lightweight_model_config(),
            "qwen3-coder-30b": self._build_large_context_model_config(),
            "qwen3-embedding-4b": self._build_embedding_model_config(),
            "qwen3-reranker-4b": self._build_reranking_model_config(),
        }

    def _build_vision_model_config(self) -> dict[str, Any]:
        """Build vision model configuration"""
        return {
            "name": "mlx-community/Qwen2.5-VL-3B-Instruct-6bit",
            "priority": 95,
            "capabilities": ["chat", "vision"],
            "path": f"{self.mlx_cache_dir}/huggingface/hub/models--mlx-community--Qwen2.5-VL-3B-Instruct-6bit",
            "memory_gb": 6.0,
            "context_length": 32768,
            "supports_vision": True,
        }

    def _build_balanced_model_config(self) -> dict[str, Any]:
        """Build balanced performance model configuration"""
        return {
            "name": "mlx-community/gemma-2-2b-it-4bit",
            "priority": 90,
            "capabilities": ["chat"],
            "path": f"{self.mlx_cache_dir}/huggingface/hub/models--mlx-community--gemma-2-2b-it-4bit",
            "memory_gb": 4.0,
            "context_length": 8192,
        }

    def _build_lightweight_model_config(self) -> dict[str, Any]:
        """Build lightweight model configuration"""
        return {
            "name": "mlx-community/SmolLM-135M-Instruct-4bit",
            "priority": 85,
            "capabilities": ["chat"],
            "path": f"{self.mlx_cache_dir}/huggingface/models--mlx-community--SmolLM-135M-Instruct-4bit",
            "memory_gb": 1.0,
            "context_length": 2048,
        }

    def _build_large_context_model_config(self) -> dict[str, Any]:
        """Build large context model configuration"""
        return {
            "name": "mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit",
            "priority": 80,
            "capabilities": ["chat", "coding"],
            "path": f"{self.mlx_cache_dir}/huggingface/hub/models--mlx-community--Qwen3-Coder-30B-A3B-Instruct-4bit",
            "memory_gb": 32.0,
            "context_length": 32768,
            "tier": "large_context",
        }

    def _build_embedding_model_config(self) -> dict[str, Any]:
        """Build embedding model configuration"""
        return {
            "name": "Qwen3-Embedding-4B",
            "priority": 100,
            "capabilities": ["embedding"],
            "path": f"{self.mlx_cache_dir}/huggingface/models--Qwen--Qwen3-Embedding-4B",
            "memory_gb": 4.0,
            "context_length": 8192,
        }

    def _build_reranking_model_config(self) -> dict[str, Any]:
        """Build reranking model configuration"""
        return {
            "name": "Qwen3-Reranker-4B",
            "priority": 100,
            "capabilities": ["reranking"],
            "path": f"{self.mlx_cache_dir}/huggingface/models--Qwen--Qwen3-Reranker-4B",
            "memory_gb": 4.0,
            "context_length": 8192,
        }

    def get_primary_model(self, capability: str = "embedding") -> dict[str, Any] | None:
        """Get the primary model for a given capability"""
        if capability == "embedding":
            return self.required_models.get("qwen3-embedding-4b")
        elif capability == "chat":
            return self.required_models.get("glm-4.5")
        elif capability == "vision":
            return self.required_models.get("qwen2.5-vl")
        elif capability == "reranking":
            return self.required_models.get("qwen3-reranker-4b")
        elif capability == "large_context":
            return self.required_models.get("qwen3-coder-30b")
        elif capability == "lightweight":
            return self.required_models.get("smollm-135m")
        else:
            # Default to GLM-4.5 for unknown capabilities
            return self.required_models.get("glm-4.5")

    def validate_models(self) -> dict[str, bool]:
        """Validate that required models are available"""
        validation_results = {}

        for model_key, model_config in self.required_models.items():
            model_path = Path(model_config["path"])
            is_available = model_path.exists() or self._check_model_in_cache(
                model_config["name"]
            )
            validation_results[model_key] = is_available

            if is_available:
                logger.info(f"{self.log_prefix} ✅ Model {model_key} is available")
            else:
                logger.warning(
                    f"{self.log_prefix} ⚠️  Model {model_key} not found at {model_path}"
                )

        return validation_results

    def _check_model_in_cache(self, model_name: str) -> bool:
        """Check if model exists in the cache directory using standard HuggingFace pattern"""
        cache_dir = Path(self.mlx_cache_dir)
        if not cache_dir.exists():
            return False

        # Standard HuggingFace cache pattern (simplified from legacy patterns)
        pattern = f"models--{model_name.replace('/', '--')}"

        return (cache_dir / pattern).exists() or (cache_dir / "hub" / pattern).exists()

    def get_health_info(self) -> dict[str, Any]:
        """Get health information for MLX service"""
        model_validation = self.validate_models()
        available_count = sum(1 for available in model_validation.values() if available)

        return {
            "service": "MLX",
            "company": self.company,
            "priority": self.mlx_priority,
            "hybrid_mode": self.hybrid_mode,
            "privacy_mode": self.privacy_mode,
            "conjunction_enabled": self.conjunction_enabled,
            "base_url": self.mlx_base_url,
            "required_models": len(self.required_models),
            "available_models": available_count,
            "model_validation": model_validation,
            "status": "healthy"
            if available_count >= 5
            else "degraded"
            if available_count >= 3
            else "unhealthy",
        }

    def get_embedding_config(self) -> dict[str, Any]:
        """Get embedding-specific configuration"""
        primary_model = self.get_primary_model("embedding")
        return {
            "primary_model": primary_model["name"] if primary_model else None,
            "priority": self.mlx_priority,
            "cache_dir": self.mlx_cache_dir,
            "max_context": primary_model["context_length"] if primary_model else 8192,
            "memory_requirement": primary_model["memory_gb"] if primary_model else 4.0,
            "conjunction_enabled": self.conjunction_enabled and not self.privacy_mode,
        }


def create_hybrid_config() -> HybridMLXConfig:
    """Create a new brAInwav Cortex-OS hybrid configuration instance"""
    return HybridMLXConfig()


def get_hybrid_config() -> HybridMLXConfig:
    """Get hybrid configuration instance (deprecated - use create_hybrid_config)"""
    import warnings

    warnings.warn(
        "get_hybrid_config is deprecated, use create_hybrid_config for better testability",
        DeprecationWarning,
        stacklevel=2,
    )
    return create_hybrid_config()


def validate_hybrid_deployment() -> bool:
    """Validate that the brAInwav Cortex-OS hybrid deployment is ready"""
    config = create_hybrid_config()
    health_info = config.get_health_info()

    logger.info(f"{config.log_prefix} Validating hybrid deployment...")
    logger.info(f"{config.log_prefix} Status: {health_info['status']}")
    logger.info(
        f"{config.log_prefix} Available models: {health_info['available_models']}/{health_info['required_models']}"
    )

    # Require at least 5 out of 7 models for basic operation
    is_ready = health_info["available_models"] >= 5

    if is_ready:
        logger.info(f"{config.log_prefix} ✅ Hybrid deployment validation passed")
    else:
        logger.error(f"{config.log_prefix} ❌ Hybrid deployment validation failed")
        logger.error(
            f"{config.log_prefix} Need at least 5 models, found {health_info['available_models']}"
        )

    return is_ready
