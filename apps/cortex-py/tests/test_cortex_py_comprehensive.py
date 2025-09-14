"""Comprehensive test suite for Cortex-PY embedding service.

This consolidated test file covers:
- CLI functionality (mlx_unified main)
- FastAPI endpoints (/embed, /embeddings, /model-info, /health)
- MLX/torch backend selection
- Error handling and validation
- Environment variable configuration
- Edge cases and boundary conditions

Replaces multiple redundant test files with a single, well-organized test suite.
"""

from __future__ import annotations

import importlib
import json
import os
import subprocess
import sys
from collections.abc import Generator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

# Ensure src is on path
SRC_ROOT = Path(__file__).resolve().parents[2] / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))


@pytest.fixture(autouse=True)
def env_isolation() -> Generator[None, None, None]:
    """Isolate environment variables and module state between tests."""
    original_env = dict(os.environ)
    # Clear any app/mlx modules from cache to prevent state leakage
    modules_to_clear = [
        k for k in sys.modules if k.startswith("app") or k.startswith("mlx")
    ]
    for mod in modules_to_clear:
        if mod in sys.modules:
            del sys.modules[mod]
    yield
    os.environ.clear()
    os.environ.update(original_env)
    # Clean up modules again after test
    modules_to_clear = [
        k for k in sys.modules if k.startswith("app") or k.startswith("mlx")
    ]
    for mod in modules_to_clear:
        if mod in sys.modules:
            del sys.modules[mod]


@pytest.fixture
def fast_test_client() -> TestClient:
    """FastAPI test client with fast test mode enabled."""
    os.environ["CORTEX_PY_FAST_TEST"] = "1"
    os.environ["EMBED_MAX_CHARS"] = "50"  # reasonable limit for tests
    app_mod = importlib.import_module("app")
    return TestClient(app_mod.create_app())


@pytest.fixture
def cli_patched_mlx() -> Generator[None, None, None]:
    """Patch MLXUnified for CLI tests to avoid heavy model loading."""
    from mlx import mlx_unified as real_module

    class FakeUnified:
        def __init__(self, model_name: str, model_path: str | None = None):
            self.model_name = model_name
            self.model_path = model_path or model_name
            if "rerank" in model_name:
                self.model_type = "reranking"
            elif "chat" in model_name:
                self.model_type = "chat"
            else:
                self.model_type = "embedding"
            self.mlx_available = True
            self.torch_available = True
            self.sentence_transformers_available = True
            self.model = object()
            self.tokenizer = object()

        def load_model(self) -> None:
            pass

        def generate_embedding(self, text: str) -> list[float]:
            return [0.1, 0.2, 0.3]

        def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
            return [[0.1, 0.2, 0.3] for _ in texts]

        def generate_chat_completion(self, messages: list[dict[str, Any]]) -> str:
            return "Fake chat response"

        def rerank(self, query: str, texts: list[str]) -> list[dict[str, Any]]:
            return [{"index": i, "score": 1.0 - i * 0.1} for i in range(len(texts))]

    # Store original for restoration
    original_unified = getattr(real_module, "MLXUnified", None)
    real_module.MLXUnified = FakeUnified  # type: ignore
    yield
    if original_unified is not None:
        real_module.MLXUnified = original_unified  # type: ignore


# ===== FastAPI Endpoint Tests =====


class TestFastAPIEndpoints:
    """Test FastAPI application endpoints."""

    def test_embed_success(self, fast_test_client: TestClient) -> None:
        """Test successful single embedding generation."""
        resp = fast_test_client.post("/embed", json={"text": "hello world"})
        assert resp.status_code == 200
        data = resp.json()
        assert "embedding" in data
        assert isinstance(data["embedding"], list)
        assert len(data["embedding"]) == 384  # dummy dimensions

    def test_embed_missing_text(self, fast_test_client: TestClient) -> None:
        """Test embed endpoint with missing text field."""
        resp = fast_test_client.post("/embed", json={})
        assert resp.status_code == 422
        data = resp.json()
        assert "error" in data
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert "missing" in data["error"]["message"]

    def test_embed_empty_text(self, fast_test_client: TestClient) -> None:
        """Test embed endpoint with empty/whitespace text."""
        resp = fast_test_client.post("/embed", json={"text": "   "})
        assert resp.status_code == 422
        data = resp.json()
        assert "empty" in data["error"]["message"]

    def test_embed_text_too_long(self, fast_test_client: TestClient) -> None:
        """Test embed endpoint with text exceeding max length."""
        long_text = "a" * 100  # exceeds EMBED_MAX_CHARS=50
        resp = fast_test_client.post("/embed", json={"text": long_text})
        assert resp.status_code == 422
        data = resp.json()
        assert data["error"]["code"] == "TEXT_TOO_LONG"

    def test_embeddings_success(self, fast_test_client: TestClient) -> None:
        """Test successful batch embeddings generation."""
        resp = fast_test_client.post(
            "/embeddings", json={"texts": ["hello", "world"], "normalize": True}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "embeddings" in data
        assert len(data["embeddings"]) == 2
        assert all(len(emb) == 384 for emb in data["embeddings"])

    def test_embeddings_missing_texts(self, fast_test_client: TestClient) -> None:
        """Test embeddings endpoint with missing texts field."""
        resp = fast_test_client.post("/embeddings", json={})
        assert resp.status_code == 422
        data = resp.json()
        assert "missing" in data["error"]["message"]

    def test_embeddings_empty_list(self, fast_test_client: TestClient) -> None:
        """Test embeddings endpoint with empty texts list."""
        resp = fast_test_client.post("/embeddings", json={"texts": []})
        assert resp.status_code == 422

    def test_embeddings_empty_text_element(self, fast_test_client: TestClient) -> None:
        """Test embeddings endpoint with empty text element."""
        resp = fast_test_client.post(
            "/embeddings", json={"texts": ["hello", "   ", "world"]}
        )
        assert resp.status_code == 422
        data = resp.json()
        assert "non-empty" in data["error"]["message"]

    def test_model_info_endpoint(self, fast_test_client: TestClient) -> None:
        """Test model info endpoint returns expected structure."""
        resp = fast_test_client.get("/model-info")
        assert resp.status_code == 200
        data = resp.json()
        assert "model_name" in data
        assert "dimensions" in data
        assert "backend" in data
        assert data["model_name"] == "dummy-fast-test"

    def test_health_endpoint(self, fast_test_client: TestClient) -> None:
        """Test health endpoint returns expected structure."""
        resp = fast_test_client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        assert "platform" in data
        assert "backends_available" in data
        assert data["status"] == "healthy"
        backends = data["backends_available"]
        assert "mlx" in backends
        assert "sentence_transformers" in backends


# ===== CLI Tests =====


class TestCLIInterface:
    """Test CLI interface via mlx_unified main function."""

    def test_cli_embedding_mode(self, cli_patched_mlx: None) -> None:
        """Test CLI in embedding mode."""
        # Test via subprocess to match real usage
        result = subprocess.run(
            [
                sys.executable,
                "-c",
                f"import sys; sys.path.insert(0, '{SRC_ROOT}'); "
                "from mlx.mlx_unified import main; "
                "main(['--model', 'test-embedding', '--mode', 'embedding', '--text', 'hello'])",
            ],
            capture_output=True,
            text=True,
            cwd=SRC_ROOT,
        )

        assert result.returncode == 0
        output = result.stdout.strip()
        # Should output JSON list of floats
        try:
            data = json.loads(output)
            assert isinstance(data, list)
            assert len(data) > 0
            assert all(isinstance(x, (int, float)) for x in data)
        except json.JSONDecodeError:
            pytest.fail(f"CLI output is not valid JSON: {output}")

    def test_cli_batch_embedding_mode(self, cli_patched_mlx: None) -> None:
        """Test CLI in batch embedding mode."""
        result = subprocess.run(
            [
                sys.executable,
                "-c",
                f"import sys; sys.path.insert(0, '{SRC_ROOT}'); "
                "from mlx.mlx_unified import main; "
                "main(['--model', 'test-embedding', '--mode', 'embedding', '--text', 'hello', '--text', 'world'])",
            ],
            capture_output=True,
            text=True,
            cwd=SRC_ROOT,
        )

        assert result.returncode == 0
        output = result.stdout.strip()
        try:
            data = json.loads(output)
            assert isinstance(data, list)
            assert len(data) == 2  # two texts
            assert all(isinstance(emb, list) for emb in data)
        except json.JSONDecodeError:
            pytest.fail(f"CLI batch output is not valid JSON: {output}")

    def test_cli_chat_mode(self, cli_patched_mlx: None) -> None:
        """Test CLI in chat mode."""
        result = subprocess.run(
            [
                sys.executable,
                "-c",
                f"import sys; sys.path.insert(0, '{SRC_ROOT}'); "
                "from mlx.mlx_unified import main; "
                "main(['--model', 'test-chat', '--mode', 'chat', '--text', 'Hello!'])",
            ],
            capture_output=True,
            text=True,
            cwd=SRC_ROOT,
        )

        assert result.returncode == 0
        assert len(result.stdout.strip()) > 0

    def test_cli_rerank_mode(self, cli_patched_mlx: None) -> None:
        """Test CLI in rerank mode."""
        result = subprocess.run(
            [
                sys.executable,
                "-c",
                f"import sys; sys.path.insert(0, '{SRC_ROOT}'); "
                "from mlx.mlx_unified import main; "
                "main(['--model', 'test-rerank', '--mode', 'rerank', '--query', 'test query', '--text', 'doc1', '--text', 'doc2'])",
            ],
            capture_output=True,
            text=True,
            cwd=SRC_ROOT,
        )

        assert result.returncode == 0
        output = result.stdout.strip()
        try:
            data = json.loads(output)
            assert isinstance(data, list)
            assert len(data) == 2
            assert all("index" in item and "score" in item for item in data)
        except json.JSONDecodeError:
            pytest.fail(f"CLI rerank output is not valid JSON: {output}")


# ===== Environment and Configuration Tests =====


class TestEnvironmentConfiguration:
    """Test environment variable handling and configuration."""

    def test_fast_test_mode_detection(self) -> None:
        """Test that FAST_TEST mode is properly detected."""
        os.environ["CORTEX_PY_FAST_TEST"] = "1"
        app_mod = importlib.import_module("app")
        # FAST_TEST constant should be True
        assert getattr(app_mod, "FAST_TEST", False) is True

    def test_max_chars_configuration(self) -> None:
        """Test that EMBED_MAX_CHARS is configurable."""
        os.environ["CORTEX_PY_FAST_TEST"] = "1"
        os.environ["EMBED_MAX_CHARS"] = "20"

        app_mod = importlib.import_module("app")
        client = TestClient(app_mod.create_app())

        # Test text within limit
        resp = client.post("/embed", json={"text": "short"})
        assert resp.status_code == 200

        # Test text exceeding limit
        resp = client.post(
            "/embed", json={"text": "this text is longer than 20 characters"}
        )
        assert resp.status_code == 422
        assert "TEXT_TOO_LONG" in resp.json()["error"]["code"]

    def test_lazy_loading_configuration(self) -> None:
        """Test that lazy loading can be forced via environment."""
        os.environ["CORTEX_PY_FAST_TEST"] = "0"  # disable fast test
        os.environ["CORTEX_PY_FORCE_LAZY"] = "1"  # force lazy loading

        app_mod = importlib.import_module("app")
        app = app_mod.create_app()

        # Should have LazyEmbeddingGenerator
        generator = getattr(app, "embedding_generator", None)
        assert generator is not None
        assert hasattr(
            generator, "_factory"
        )  # characteristic of LazyEmbeddingGenerator


# ===== Backend Selection Tests =====


class TestBackendSelection:
    """Test MLX/torch backend selection logic."""

    def test_dummy_generator_properties(self) -> None:
        """Test DummyEmbeddingGenerator has expected properties."""
        from app import DummyEmbeddingGenerator

        dummy = DummyEmbeddingGenerator(128)
        assert dummy.dimensions == 128
        assert dummy.can_use_mlx is False
        assert dummy.can_use_sentence_transformers is False

        # Test methods
        emb = dummy.generate_embedding("test")
        assert len(emb) == 128
        assert all(x == 0.0 for x in emb)

        embs = dummy.generate_embeddings(["test1", "test2"])
        assert len(embs) == 2
        assert all(len(emb) == 128 for emb in embs)

    def test_lazy_generator_delegation(self) -> None:
        """Test LazyEmbeddingGenerator properly delegates to factory."""
        from app import DummyEmbeddingGenerator, LazyEmbeddingGenerator

        def dummy_factory() -> DummyEmbeddingGenerator:
            return DummyEmbeddingGenerator(256)

        lazy = LazyEmbeddingGenerator(dummy_factory)

        # Should not be initialized yet
        assert lazy._delegate is None

        # First call should initialize
        info = lazy.get_model_info()
        assert lazy._delegate is not None
        assert "dimensions" in info

        # Subsequent calls should use same delegate
        emb = lazy.generate_embedding("test")
        assert len(emb) == 256


# ===== Error Handling Tests =====


class TestErrorHandling:
    """Test error handling and edge cases."""

    def test_app_creation_with_custom_generator(self) -> None:
        """Test app creation with custom generator instance."""
        from app import DummyEmbeddingGenerator, create_app

        custom_gen = DummyEmbeddingGenerator(512)
        app = create_app(custom_gen)
        client = TestClient(app)

        resp = client.get("/model-info")
        assert resp.status_code == 200
        data = resp.json()
        assert data["dimensions"] == 512

    def test_embedding_validation_edge_cases(
        self, fast_test_client: TestClient
    ) -> None:
        """Test edge cases in embedding validation."""
        # Test with None text (should be handled by Pydantic)
        resp = fast_test_client.post("/embed", json={"text": None})
        assert resp.status_code == 422

        # Test with exactly max length
        os.environ["EMBED_MAX_CHARS"] = "5"
        app_mod = importlib.import_module("app")
        client = TestClient(app_mod.create_app())

        resp = client.post("/embed", json={"text": "12345"})  # exactly 5 chars
        assert resp.status_code == 200

        resp = client.post("/embed", json={"text": "123456"})  # 6 chars, exceeds limit
        assert resp.status_code == 422

    def test_normalize_parameter_handling(self, fast_test_client: TestClient) -> None:
        """Test normalize parameter in embeddings endpoint."""
        # Test with normalize=True
        resp = fast_test_client.post(
            "/embeddings", json={"texts": ["hello"], "normalize": True}
        )
        assert resp.status_code == 200

        # Test with normalize=False
        resp = fast_test_client.post(
            "/embeddings", json={"texts": ["hello"], "normalize": False}
        )
        assert resp.status_code == 200

        # Test without normalize (should default to True)
        resp = fast_test_client.post("/embeddings", json={"texts": ["hello"]})
        assert resp.status_code == 200
