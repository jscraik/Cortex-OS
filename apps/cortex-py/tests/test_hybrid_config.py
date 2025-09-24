"""
brAInwav Cortex-OS MLX Hybrid Configuration Tests
Unit tests for TDD compliance and critical methods
"""

import os

# Note: Import path may need adjustment based on Python package structure
# This test file verifies TDD compliance for HybridMLXConfig class
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Add src directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

try:
    from cortex_py.hybrid_config import (
        HybridMLXConfig,
        create_hybrid_config,
        get_hybrid_config,
        validate_hybrid_deployment,
    )
except ImportError:
    # Fallback for different project structures
    pass


class TestHybridMLXConfig:
    """Test suite for HybridMLXConfig class"""

    def test_init_creates_config_with_defaults(self):
        """Test that initialization creates config with default values"""
        config = HybridMLXConfig()

        assert config.mlx_priority == 100
        assert config.hybrid_mode == "performance"
        assert config.privacy_mode is False
        assert config.conjunction_enabled is True
        assert config.company == "brAInwav"
        assert "brAInwav Cortex-OS:" in config.log_prefix

    def test_init_respects_environment_variables(self):
        """Test that initialization respects environment variable overrides"""
        with patch.dict(
            os.environ,
            {
                "CORTEX_MLX_FIRST_PRIORITY": "95",
                "CORTEX_HYBRID_MODE": "privacy",
                "CORTEX_PRIVACY_MODE": "true",
                "CORTEX_CONJUNCTION_ENABLED": "false",
                "CORTEX_COMPANY": "brAInwav",
                "CORTEX_LOG_PREFIX": "brAInwav Test:",
            },
        ):
            config = HybridMLXConfig()

            assert config.mlx_priority == 95
            assert config.hybrid_mode == "privacy"
            assert config.privacy_mode is True
            assert config.conjunction_enabled is False
            assert config.company == "brAInwav"
            assert config.log_prefix == "brAInwav Test:"

    def test_required_models_contains_all_seven(self):
        """Test that required_models contains all 7 expected models"""
        config = HybridMLXConfig()

        expected_models = {
            "glm-4.5",
            "qwen2.5-vl",
            "gemma-2-2b",
            "smollm-135m",
            "qwen3-coder-30b",
            "qwen3-embedding-4b",
            "qwen3-reranker-4b",
        }

        assert set(config.required_models.keys()) == expected_models
        assert len(config.required_models) == 7

    def test_get_primary_model_embedding(self):
        """Test get_primary_model returns correct embedding model"""
        config = HybridMLXConfig()
        model = config.get_primary_model("embedding")

        assert model is not None
        assert model["name"] == "Qwen3-Embedding-4B"
        assert "embedding" in model["capabilities"]

    def test_get_primary_model_chat(self):
        """Test get_primary_model returns correct chat model"""
        config = HybridMLXConfig()
        model = config.get_primary_model("chat")

        assert model is not None
        assert model["name"] == "GLM-4.5-mlx-4Bit"
        assert "chat" in model["capabilities"]

    def test_get_primary_model_vision(self):
        """Test get_primary_model returns correct vision model"""
        config = HybridMLXConfig()
        model = config.get_primary_model("vision")

        assert model is not None
        assert model["name"] == "mlx-community/Qwen2.5-VL-3B-Instruct-6bit"
        assert model.get("supports_vision") is True

    def test_get_primary_model_reranking(self):
        """Test get_primary_model returns correct reranking model"""
        config = HybridMLXConfig()
        model = config.get_primary_model("reranking")

        assert model is not None
        assert model["name"] == "Qwen3-Reranker-4B"
        assert "reranking" in model["capabilities"]

    def test_get_primary_model_large_context(self):
        """Test get_primary_model returns correct large context model"""
        config = HybridMLXConfig()
        model = config.get_primary_model("large_context")

        assert model is not None
        assert model["name"] == "mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit"
        assert model["memory_gb"] == 32.0

    def test_get_primary_model_lightweight(self):
        """Test get_primary_model returns correct lightweight model"""
        config = HybridMLXConfig()
        model = config.get_primary_model("lightweight")

        assert model is not None
        assert model["name"] == "mlx-community/SmolLM-135M-Instruct-4bit"
        assert model["memory_gb"] == 1.0

    def test_get_primary_model_unknown_defaults_to_glm(self):
        """Test get_primary_model defaults to GLM for unknown capabilities"""
        config = HybridMLXConfig()
        model = config.get_primary_model("unknown_capability")

        assert model is not None
        assert model["name"] == "GLM-4.5-mlx-4Bit"

    @patch("cortex_py.hybrid_config.Path.exists")
    def test_validate_models_all_available(self, mock_exists):
        """Test validate_models returns all available when paths exist"""
        mock_exists.return_value = True
        config = HybridMLXConfig()

        result = config.validate_models()

        assert len(result) == 7
        assert all(result.values())  # All models should be available

    @patch("cortex_py.hybrid_config.Path.exists")
    def test_validate_models_some_missing(self, mock_exists):
        """Test validate_models identifies missing models"""
        mock_exists.return_value = False
        config = HybridMLXConfig()

        result = config.validate_models()

        assert len(result) == 7
        assert not any(result.values())  # All models should be missing

    @patch("cortex_py.hybrid_config.Path.exists")
    def test_check_model_in_cache_standard_pattern(self, mock_exists):
        """Test _check_model_in_cache uses standard HuggingFace pattern"""
        mock_exists.return_value = True
        config = HybridMLXConfig()

        result = config._check_model_in_cache("test/model-name")

        assert result is True
        # Should check both direct and hub subdirectory

    @patch("cortex_py.hybrid_config.Path.exists")
    def test_check_model_in_cache_not_found(self, mock_exists):
        """Test _check_model_in_cache returns False when model not found"""
        mock_exists.return_value = False
        config = HybridMLXConfig()

        result = config._check_model_in_cache("nonexistent/model")

        assert result is False

    def test_get_health_info_structure(self):
        """Test get_health_info returns correct structure"""
        config = HybridMLXConfig()

        with patch.object(
            config,
            "validate_models",
            return_value={k: True for k in config.required_models.keys()},
        ):
            health_info = config.get_health_info()

        assert "service" in health_info
        assert health_info["service"] == "MLX"
        assert "company" in health_info
        assert health_info["company"] == "brAInwav"
        assert "priority" in health_info
        assert "hybrid_mode" in health_info
        assert "required_models" in health_info
        assert "available_models" in health_info
        assert "status" in health_info

    def test_get_health_info_healthy_status(self):
        """Test get_health_info returns healthy status with 5+ models"""
        config = HybridMLXConfig()

        with patch.object(
            config,
            "validate_models",
            return_value={k: True for k in config.required_models.keys()},
        ):
            health_info = config.get_health_info()

        assert health_info["available_models"] == 7
        assert health_info["status"] == "healthy"

    def test_get_health_info_degraded_status(self):
        """Test get_health_info returns degraded status with 3-4 models"""
        config = HybridMLXConfig()

        validation_result = {
            k: i < 3 for i, k in enumerate(config.required_models.keys())
        }
        with patch.object(config, "validate_models", return_value=validation_result):
            health_info = config.get_health_info()

        assert health_info["available_models"] == 3
        assert health_info["status"] == "degraded"

    def test_get_health_info_unhealthy_status(self):
        """Test get_health_info returns unhealthy status with <3 models"""
        config = HybridMLXConfig()

        validation_result = {
            k: i < 2 for i, k in enumerate(config.required_models.keys())
        }
        with patch.object(config, "validate_models", return_value=validation_result):
            health_info = config.get_health_info()

        assert health_info["available_models"] == 2
        assert health_info["status"] == "unhealthy"

    def test_get_embedding_config_structure(self):
        """Test get_embedding_config returns correct structure"""
        config = HybridMLXConfig()
        embedding_config = config.get_embedding_config()

        assert "primary_model" in embedding_config
        assert "priority" in embedding_config
        assert "cache_dir" in embedding_config
        assert "max_context" in embedding_config
        assert "memory_requirement" in embedding_config
        assert "conjunction_enabled" in embedding_config

    def test_get_embedding_config_values(self):
        """Test get_embedding_config returns correct values"""
        config = HybridMLXConfig()
        embedding_config = config.get_embedding_config()

        assert embedding_config["primary_model"] == "Qwen3-Embedding-4B"
        assert embedding_config["priority"] == 100
        assert embedding_config["max_context"] == 8192
        assert embedding_config["memory_requirement"] == 4.0


class TestFactoryFunctions:
    """Test suite for factory functions"""

    def test_create_hybrid_config_returns_new_instance(self):
        """Test create_hybrid_config returns new HybridMLXConfig instance"""
        config = create_hybrid_config()

        assert isinstance(config, HybridMLXConfig)
        assert config.company == "brAInwav"

    def test_get_hybrid_config_shows_deprecation_warning(self):
        """Test get_hybrid_config shows deprecation warning"""
        with pytest.warns(DeprecationWarning, match="get_hybrid_config is deprecated"):
            config = get_hybrid_config()

        assert isinstance(config, HybridMLXConfig)

    @patch("cortex_py.hybrid_config.create_hybrid_config")
    def test_validate_hybrid_deployment_healthy(self, mock_create):
        """Test validate_hybrid_deployment returns True for healthy deployment"""
        mock_config = MagicMock()
        mock_config.get_health_info.return_value = {
            "available_models": 7,
            "required_models": 7,
            "status": "healthy",
        }
        mock_config.log_prefix = "brAInwav Cortex-OS:"
        mock_create.return_value = mock_config

        result = validate_hybrid_deployment()

        assert result is True

    @patch("cortex_py.hybrid_config.create_hybrid_config")
    def test_validate_hybrid_deployment_unhealthy(self, mock_create):
        """Test validate_hybrid_deployment returns False for unhealthy deployment"""
        mock_config = MagicMock()
        mock_config.get_health_info.return_value = {
            "available_models": 2,
            "required_models": 7,
            "status": "unhealthy",
        }
        mock_config.log_prefix = "brAInwav Cortex-OS:"
        mock_create.return_value = mock_config

        result = validate_hybrid_deployment()

        assert result is False


class TestModelConfigurationFactories:
    """Test suite for model configuration factory methods"""

    def test_build_vision_model_config(self):
        """Test _build_vision_model_config returns correct configuration"""
        config = HybridMLXConfig()
        vision_config = config._build_vision_model_config()

        assert vision_config["name"] == "mlx-community/Qwen2.5-VL-3B-Instruct-6bit"
        assert vision_config["priority"] == 95
        assert "vision" in vision_config["capabilities"]
        assert vision_config["supports_vision"] is True

    def test_build_balanced_model_config(self):
        """Test _build_balanced_model_config returns correct configuration"""
        config = HybridMLXConfig()
        balanced_config = config._build_balanced_model_config()

        assert balanced_config["name"] == "mlx-community/gemma-2-2b-it-4bit"
        assert balanced_config["memory_gb"] == 4.0
        assert balanced_config["context_length"] == 8192

    def test_build_lightweight_model_config(self):
        """Test _build_lightweight_model_config returns correct configuration"""
        config = HybridMLXConfig()
        lightweight_config = config._build_lightweight_model_config()

        assert lightweight_config["memory_gb"] == 1.0
        assert lightweight_config["priority"] == 85

    def test_build_large_context_model_config(self):
        """Test _build_large_context_model_config returns correct configuration"""
        config = HybridMLXConfig()
        large_config = config._build_large_context_model_config()

        assert large_config["memory_gb"] == 32.0
        assert large_config["tier"] == "large_context"

    def test_build_embedding_model_config(self):
        """Test _build_embedding_model_config returns correct configuration"""
        config = HybridMLXConfig()
        embedding_config = config._build_embedding_model_config()

        assert "embedding" in embedding_config["capabilities"]
        assert embedding_config["priority"] == 100

    def test_build_reranking_model_config(self):
        """Test _build_reranking_model_config returns correct configuration"""
        config = HybridMLXConfig()
        reranking_config = config._build_reranking_model_config()

        assert "reranking" in reranking_config["capabilities"]
        assert reranking_config["name"] == "Qwen3-Reranker-4B"


class TestBrAInwavBranding:
    """Test suite for brAInwav branding compliance"""

    def test_log_prefix_contains_brainwav(self):
        """Test that log prefix contains brAInwav branding"""
        config = HybridMLXConfig()
        assert "brAInwav" in config.log_prefix

    def test_company_defaults_to_brainwav(self):
        """Test that company defaults to brAInwav"""
        config = HybridMLXConfig()
        assert config.company == "brAInwav"

    def test_glm_model_path_contains_brainwav(self):
        """Test that GLM model path contains brAInwav branding"""
        config = HybridMLXConfig()
        glm_model = config.required_models["glm-4.5"]
        assert "brAInwav" in glm_model["path"]

    def test_health_info_includes_brainwav_company(self):
        """Test that health info includes brAInwav company"""
        config = HybridMLXConfig()
        health_info = config.get_health_info()
        assert health_info["company"] == "brAInwav"
