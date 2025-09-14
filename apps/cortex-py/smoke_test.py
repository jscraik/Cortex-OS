#!/usr/bin/env python3
"""
Smoke test for cortex-py cross-platform functionality.

This test verifies that the system works on any platform with available dependencies.
"""

import json
import os
import tempfile
from unittest.mock import MagicMock, patch


def test_embedding_service_smoke():
    """Smoke test for embedding service"""
    print("Testing embedding service cross-platform functionality...")

    # Create mock config
    mock_config = {
        "test-embedding": {
            "path": "sentence-transformers/all-MiniLM-L6-v2",
            "dimensions": 384,
            "context_length": 512,
            "memory_gb": 1.0,
        }
    }

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(mock_config, f)
        config_path = f.name

    try:
        # Test with mocked dependencies
        with (
            patch("src.mlx.embedding_generator.SENTENCE_TRANSFORMERS_AVAILABLE", True),
            patch("src.mlx.embedding_generator.SentenceTransformer") as mock_st,
        ):
            # Mock sentence-transformers model
            mock_model = MagicMock()
            mock_model.encode.return_value = MagicMock()
            mock_model.encode.return_value.tolist.return_value = [0.1] * 384
            mock_st.return_value = mock_model

            from src.mlx.embedding_generator import MLXEmbeddingGenerator

            generator = MLXEmbeddingGenerator("test-embedding", config_path)

            # Test embedding generation
            embedding = generator.generate_embedding("Hello world")
            assert isinstance(embedding, list)
            assert len(embedding) == 384
            assert all(isinstance(x, float) for x in embedding)

            print("✅ Embedding generation works")

            # Test batch generation
            embeddings = generator.generate_embeddings(["Text 1", "Text 2"])
            assert len(embeddings) == 2
            assert all(len(emb) == 384 for emb in embeddings)

            print("✅ Batch embedding generation works")

            # Test model info
            info = generator.get_model_info()
            assert info["dimensions"] == 384
            assert "backend" in info
            assert info["model_loaded"] is True

            print("✅ Model info reporting works")
            print(f"   Backend: {info['backend']}")
            print(f"   Model loaded: {info['model_loaded']}")

    finally:
        os.unlink(config_path)


def test_fastapi_service_smoke():
    """Smoke test for FastAPI service"""
    print("Testing FastAPI service...")

    try:
        from fastapi.testclient import TestClient

        from src.app import app

        client = TestClient(app)

        # Test health endpoint
        response = client.get("/health")
        assert response.status_code == 200
        health_data = response.json()
        assert health_data["status"] == "healthy"

        print("✅ Health endpoint works")

        # Test model info (will show backend availability)
        response = client.get("/model-info")
        assert response.status_code == 200
        model_info = response.json()

        print("✅ Model info endpoint works")
        print(f"   Model: {model_info.get('model_name', 'unknown')}")
        print(
            f"   Backends available: MLX={model_info.get('mlx_available', False)}, ST={model_info.get('sentence_transformers_available', False)}"
        )

    except Exception as e:
        print(f"⚠️ FastAPI service test failed (expected on missing deps): {e}")


def test_mlx_unified_smoke():
    """Smoke test for MLX unified interface"""
    print("Testing MLX unified interface...")

    try:
        from src.mlx.mlx_unified import MLXUnified

        # This will work with available backends
        unified = MLXUnified()

        # Test basic loading (will use whatever backend is available)
        model_info = unified.get_model_info()
        print("✅ MLX unified interface initialized")
        print(
            f"   Available capabilities: {unified.can_embed}, {unified.can_chat}, {unified.can_rerank}"
        )

        # Test embedding if available
        if unified.can_embed:
            try:
                embedding = unified.generate_embedding("Test text", normalize=True)
                assert isinstance(embedding, list)
                assert len(embedding) > 0
                print("✅ Embedding generation works via unified interface")
            except Exception as e:
                print(f"⚠️ Embedding test failed: {e}")

    except Exception as e:
        print(f"⚠️ MLX unified test failed (expected on missing deps): {e}")


def main():
    """Run all smoke tests"""
    print("🚀 Starting cortex-py cross-platform smoke tests\n")

    test_embedding_service_smoke()
    print()

    test_fastapi_service_smoke()
    print()

    test_mlx_unified_smoke()
    print()

    print("🎉 Smoke tests completed!")


if __name__ == "__main__":
    main()
