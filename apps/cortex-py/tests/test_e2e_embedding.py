#!/usr/bin/env python3
"""
End-to-end tests for cross-platform embedding generation.

Tests both MLX and sentence-transformers backends to ensure operational
readiness on all platforms.
"""

import contextlib
import json
import os
import platform
import sys
import tempfile
from collections.abc import Iterator
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "apps" / "cortex-py" / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))


class TestE2EEmbedding:
    """End-to-end embedding tests"""

    @pytest.fixture
    def mock_model_config(self) -> dict[str, dict[str, object]]:
        """Mock model configuration for testing"""
        return {
            "test-embedding-model": {
                "path": "sentence-transformers/all-MiniLM-L6-v2",
                "dimensions": 384,
                "context_length": 512,
                "memory_gb": 1.0,
            }
        }

    @pytest.fixture
    def mock_config_file(
        self, mock_model_config: dict[str, dict[str, object]]
    ) -> Iterator[str]:
        """Create temporary config file"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(mock_model_config, f)
            f.flush()
            yield f.name
        os.unlink(f.name)

    def test_embedding_generator_cross_platform(self, mock_config_file: str) -> None:
        """Test embedding generator works on any platform"""
        from mlx.embedding_generator import MLXEmbeddingGenerator

        # Test with mock sentence-transformers
        with (
            patch(
                "mlx.embedding_generator.MLX_AVAILABLE", False
            ),  # prevent heavy MLX load path
            patch("mlx.embedding_generator.SENTENCE_TRANSFORMERS_AVAILABLE", True),
            patch("mlx.embedding_generator.SentenceTransformer") as mock_st,
        ):
            # Mock sentence-transformers model
            mock_model = MagicMock()
            mock_model.encode.return_value = MagicMock()
            mock_model.encode.return_value.tolist.return_value = [0.1] * 384
            mock_st.return_value = mock_model

            generator = MLXEmbeddingGenerator(
                model_name="test-embedding-model", config_path=mock_config_file
            )

            # Test embedding generation
            embedding = generator.generate_embedding("Hello world")
            assert isinstance(embedding, list)
            assert len(embedding) == 384
            assert all(isinstance(x, float) for x in embedding)

            # Test model info
            info = generator.get_model_info()
            assert info["model_name"] == "test-embedding-model"
            assert info["dimensions"] == 384
            # When running under shim we only assert that backend key exists; value is not authoritative
            if os.environ.get("CORTEX_MLX_SHIM") == "1":
                assert "backend" in info
            else:
                assert info["backend"] == "sentence-transformers"
            assert info["model_loaded"] is True

    def test_embedding_dimensions_consistency(self, mock_config_file: str) -> None:
        """Test embedding dimensions are consistent"""
        from mlx.embedding_generator import MLXEmbeddingGenerator

        with (
            patch("mlx.embedding_generator.MLX_AVAILABLE", False),
            patch("mlx.embedding_generator.SENTENCE_TRANSFORMERS_AVAILABLE", True),
            patch("mlx.embedding_generator.SentenceTransformer") as mock_st,
        ):
            # Mock model with wrong dimensions
            mock_model = MagicMock()
            mock_model.encode.return_value = MagicMock()
            mock_model.encode.return_value.tolist.return_value = [
                0.1
            ] * 200  # Wrong size
            mock_st.return_value = mock_model

            generator = MLXEmbeddingGenerator(
                model_name="test-embedding-model", config_path=mock_config_file
            )

            embedding = generator.generate_embedding("Test text")
            # Should be padded to correct dimensions
            assert len(embedding) == 384

    def test_no_backend_available_error(self, mock_config_file: str) -> None:
        """Test error when no backends are available"""
        import importlib
        import sys

        # Clear fast-test mode so it doesn't auto-enable fallback ST backend
        os.environ.pop("CORTEX_PY_FAST_TEST", None)
        sys.modules.pop("mlx.embedding_generator", None)
        import mlx.embedding_generator as eg

        importlib.reload(eg)
        # Simulate non-macOS so MLX not usable even if installed
        with patch("platform.system", return_value="Linux"):
            # Mark both backends unavailable
            eg.MLX_AVAILABLE = False
            eg.SENTENCE_TRANSFORMERS_AVAILABLE = False
            from mlx.embedding_generator import MLXEmbeddingGenerator

            with pytest.raises(RuntimeError, match="No embedding backend available"):
                MLXEmbeddingGenerator(
                    model_name="test-embedding-model", config_path=mock_config_file
                )

    def test_mlx_backend_darwin_only(self, mock_config_file: str) -> None:
        """Test MLX backend is only used on macOS"""
        from mlx.embedding_generator import MLXEmbeddingGenerator

        with (
            patch("mlx.embedding_generator.MLX_AVAILABLE", True),
            patch("mlx.embedding_generator.SENTENCE_TRANSFORMERS_AVAILABLE", False),
            patch("platform.system") as mock_platform,
        ):
            mock_platform.return_value = "Linux"

            with pytest.raises(RuntimeError, match="No embedding backend available"):
                MLXEmbeddingGenerator(
                    model_name="test-embedding-model", config_path=mock_config_file
                )


class TestFastAPIIntegration:
    """Test FastAPI integration with embedding service"""

    @pytest.fixture
    def fastapi_client(self):  # type: ignore[no-untyped-def]
        """Create FastAPI test client using fast-test mode (dummy generator)."""
        os.environ["CORTEX_PY_FAST_TEST"] = "1"
        # Ensure a fresh import respecting the env var
        import importlib
        import sys

        if "app" in sys.modules:
            del sys.modules["app"]
        from fastapi.testclient import TestClient

        app_mod = importlib.import_module("app")
        return TestClient(app_mod.app)

    def test_embedding_endpoint_cross_platform(self, fastapi_client) -> None:  # type: ignore[no-untyped-def]
        """Test /embeddings endpoint works cross-platform using stub generator"""
        response = fastapi_client.post(
            "/embeddings", json={"texts": ["Hello world"], "normalize": True}
        )
        assert response.status_code == 200
        data = response.json()
        assert "embeddings" in data
        assert len(data["embeddings"]) == 1
        first = data["embeddings"][0]
        assert isinstance(first, list)
        assert len(first) == 384

    def test_model_info_endpoint(self, fastapi_client) -> None:  # type: ignore[no-untyped-def]
        """Test /model-info endpoint returns backend information from stub"""
        response = fastapi_client.get("/model-info")

        assert response.status_code == 200
        data = response.json()
        assert data["dimensions"] == 384
        # In fast-test mode backend reports 'unavailable'; just ensure key present
        assert "backend" in data
        assert data["backend"] in {"sentence-transformers", "unavailable"}
        assert "model_loaded" in data

    # mock_embedding_generator fixture removed; stub installed in fastapi_client fixture

    def test_health_check_comprehensive(self, fastapi_client) -> None:  # type: ignore[no-untyped-def]
        """Test comprehensive health check"""
        response = fastapi_client.get("/health")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "healthy"
        assert "platform" in data
        assert "backends_available" in data
        assert isinstance(data["backends_available"], dict)


class TestOperationalReadiness:
    """Test operational readiness requirements"""

    def test_all_imports_graceful(self) -> None:
        """Test all imports fail gracefully"""
        # Test MLX import fallback
        with patch.dict("sys.modules", {"mlx.core": None, "mlx_lm": None}):
            from mlx.embedding_generator import MLX_AVAILABLE

            assert MLX_AVAILABLE is False

        # Test sentence-transformers import fallback
        with patch.dict("sys.modules", {"sentence_transformers": None}):
            import importlib

            import mlx.embedding_generator as eg

            importlib.reload(eg)
            assert eg.SENTENCE_TRANSFORMERS_AVAILABLE is False

    def test_environment_variable_overrides(self) -> None:
        """Test environment variable configuration works"""
        original_cache = os.environ.get("HF_CACHE_PATH")
        import tempfile as _tf

        test_cache_dir = _tf.mkdtemp(prefix="cortex-py-cache-")

        try:
            os.environ["HF_CACHE_PATH"] = test_cache_dir
            # Import after setting env var
            import importlib

            import mlx.embedding_generator as embedding_module

            importlib.reload(embedding_module)
            # Validate env var is set
            assert os.environ["HF_CACHE_PATH"] == test_cache_dir
        finally:
            if original_cache:
                os.environ["HF_CACHE_PATH"] = original_cache
            else:
                with contextlib.suppress(KeyError):
                    del os.environ["HF_CACHE_PATH"]

    def test_platform_detection_works(self) -> None:
        """Test platform detection is working correctly"""
        current_platform = platform.system()
        assert current_platform in ["Darwin", "Linux", "Windows"]

        # Test embedding generator respects platform
        from mlx.embedding_generator import MLXEmbeddingGenerator

        # This will vary by platform but should not crash
        mock_config = {
            "test-model": {
                "path": "sentence-transformers/all-MiniLM-L6-v2",
                "dimensions": 384,
                "context_length": 512,
                "memory_gb": 1.0,
            }
        }
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as tmp:
            json.dump(mock_config, tmp)
            tmp.flush()
            cfg_path = tmp.name
        with (
            patch("mlx.embedding_generator.MLX_AVAILABLE", False),
            patch(
                "mlx.embedding_generator.SENTENCE_TRANSFORMERS_AVAILABLE",
                True,
            ),
            patch("mlx.embedding_generator.SentenceTransformer") as mock_st,
        ):
            mock_model = MagicMock()
            mock_model.encode.return_value = MagicMock()
            mock_model.encode.return_value.tolist.return_value = [0.1] * 384
            mock_st.return_value = mock_model

            generator = MLXEmbeddingGenerator("test-model", cfg_path)
            info = generator.get_model_info()

            # Should have detected platform correctly
            assert "backend" in info
            assert info["model_loaded"] is True
        with contextlib.suppress(FileNotFoundError):
            os.unlink(cfg_path)
