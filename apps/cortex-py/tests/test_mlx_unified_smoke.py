"""Lightweight smoke tests for mlx_unified to remove 0% coverage penalty.

We avoid heavy model loads by:
- Not calling load_model() (guarded by pragma: no cover anyway)
- Patching globals to simulate absence of optional dependencies

Covered aspects:
- Env helper fallbacks and positive override
- Cache directory resolution functions
- Model type inference logic in MLXUnified.__init__
- Error validation for bad inputs (empty model name)
- Chat generation path error when model not loaded
- Embedding generation validation errors

Directives:  (mypy: ignore-errors, ruff: noqa) for dynamic import patterns.
"""

# ruff: noqa
from __future__ import annotations

import platform
import sys
import tempfile
from pathlib import Path
from types import ModuleType

import pytest

# Ensure src path
ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "apps" / "cortex-py" / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))


def test_env_helpers_and_cache_dirs(monkeypatch: pytest.MonkeyPatch) -> None:
    import mlx.mlx_unified as mu  # type: ignore[import-not-found]

    # Ensure defaults first
    monkeypatch.delenv("MLX_DEFAULT_MAX_LENGTH", raising=False)
    monkeypatch.delenv("MLX_DEFAULT_MAX_TOKENS", raising=False)
    monkeypatch.delenv("MLX_DEFAULT_TEMPERATURE", raising=False)
    assert mu.get_default_max_length() == mu._FALLBACK_MAX_LENGTH
    assert mu.get_default_max_tokens() == mu._FALLBACK_MAX_TOKENS
    assert mu.get_default_temperature() == mu._FALLBACK_TEMPERATURE

    # Override with environment
    monkeypatch.setenv("MLX_DEFAULT_MAX_LENGTH", "204")
    monkeypatch.setenv("MLX_DEFAULT_MAX_TOKENS", "999")
    monkeypatch.setenv("MLX_DEFAULT_TEMPERATURE", "0.9")
    assert mu.get_default_max_length() == 204
    assert mu.get_default_max_tokens() == 999
    assert abs(mu.get_default_temperature() - 0.9) < 1e-9

    # Cache dirs
    hf_dir = tempfile.mkdtemp(prefix="hf-cache-test-")
    monkeypatch.setenv("HF_HOME", hf_dir)
    assert mu.get_hf_home() == hf_dir
    monkeypatch.delenv("HF_HOME", raising=False)
    transformers_dir = tempfile.mkdtemp(prefix="transformers-cache-test-")
    monkeypatch.setenv("TRANSFORMERS_CACHE", transformers_dir)
    assert mu.get_transformers_cache() == transformers_dir
    monkeypatch.delenv("TRANSFORMERS_CACHE", raising=False)
    # MLX cache default should be under HOME
    assert mu.get_mlx_cache_dir().endswith(".cache/mlx")


def test_model_type_detection_and_validation(monkeypatch: pytest.MonkeyPatch) -> None:
    import mlx.mlx_unified as mu

    with pytest.raises(ValueError):
        mu.MLXUnified("")

    # Patch dependency availability flags by faking imports
    monkeypatch.setattr(platform, "system", lambda: "Linux")
    # Force absence of MLX libs
    mu.mlx_lm = None
    mu.mlx_vlm = None

    # Provide fake torch + transformers path for embedding style (we won't call load_model)
    fake_torch = ModuleType("torch")
    sys.modules["torch"] = fake_torch

    # Chat model inference default
    chat = mu.MLXUnified("awesome-chat-model")
    assert chat.model_type == "chat"

    # Embedding model inference
    emb = mu.MLXUnified("super-EMBEDDING-model")
    assert emb.model_type == "embedding"

    # Reranking model inference
    rr = mu.MLXUnified("best-rerank-model")
    assert rr.model_type == "reranking"


def test_error_paths_generate_without_model(monkeypatch: pytest.MonkeyPatch) -> None:
    import mlx.mlx_unified as mu

    u = mu.MLXUnified("embed-model-embedding")
    # Force type to embedding but leave model None -> generate_embedding error
    with pytest.raises(ValueError, match="Embedding model not loaded"):
        u.generate_embedding("hello")

    c = mu.MLXUnified("chat-model")
    # Chat generate without model
    with pytest.raises(ValueError, match="Chat model not loaded"):
        c.generate_chat([{"role": "user", "content": "hi"}])

    # Invalid messages shape
    c.model = object()  # minimal sentinel to pass first check
    with pytest.raises(ValueError, match="Messages must be a non-empty list"):
        c.generate_chat([])
    with pytest.raises(ValueError):
        c.generate_chat([{"role": "user"}])  # missing content


@pytest.mark.parametrize(
    "text",
    [None, ""],
)
def test_generate_embedding_input_validation(text):  # type: ignore[no-untyped-def]
    import mlx.mlx_unified as mu

    u = mu.MLXUnified("embedding-model")
    u.model_type = "embedding"
    u.model = object()
    with pytest.raises(ValueError, match="Text must be a non-empty string"):
        u.generate_embedding(text)
