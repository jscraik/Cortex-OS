"""Lightweight smoke tests for MLXUnified chat and rerank paths.

These tests avoid heavy model downloads by patching load_model and internal
attributes to emulate loaded lightweight backends, ensuring control-flow
coverage for generate_chat fallback and rerank backend error handling.
"""

from __future__ import annotations

from typing import Any

import pytest

try:  # pragma: no cover - optional dependency environment handling
    from mlx.mlx_unified import MLXUnified  # type: ignore[import-not-found]
except Exception:  # pragma: no cover - skip entire module if unified not importable
    pytest.skip(
        "mlx.mlx_unified not importable; skipping chat/rerank smoke tests",
        allow_module_level=True,
    )


@pytest.fixture()
def chat_unified(
    monkeypatch: Any,
) -> MLXUnified:  # runtime fixture; monkeypatch from pytest
    # Create instance and simulate a lightweight MLX environment so fallback path is deterministic
    u = MLXUnified("dummy-chat-model")
    u.model_type = "chat"
    u.model = object()  # sentinel non-None so generate_chat passes model check

    # Disable instructor client to force direct MLX fallback branch
    try:  # pragma: no cover - import resolution
        import mlx.mlx_unified as mod
    except Exception:  # pragma: no cover - fallback if module not present
        pytest.skip("mlx.mlx_unified not available", allow_module_level=True)
    monkeypatch.setattr(mod, "ollama_client", None)

    # Provide a dummy mlx_lm with generate returning a simple string
    class DummyMLXLM:
        @staticmethod
        def generate(
            model: Any,
            tokenizer: Any,
            prompt: str,
            max_tokens: int,
            temp: float,
            verbose: bool = False,
        ) -> str:  # pragma: no cover - trivial stub
            return "Hello!"

    monkeypatch.setattr(mod, "mlx_lm", DummyMLXLM)
    u.mlx_available = True
    u.torch_available = False

    def fake_load() -> None:  # no-op load
        return None

    monkeypatch.setattr(u, "load_model", fake_load)
    return u


def test_generate_chat_fallback_path(chat_unified: MLXUnified) -> None:
    # Expect deterministic MLX fallback path (instructor disabled)
    resp = chat_unified.generate_chat(
        [{"role": "user", "content": "Hello"}], max_tokens=8, temperature=0.1
    )
    assert "content" in resp
    assert "usage" in resp and isinstance(resp["usage"], dict)


def test_rerank_unloaded_model_error() -> None:
    u = MLXUnified("dummy-rerank-model")
    u.model_type = "reranking"
    u.model = None  # ensure error path
    with pytest.raises(ValueError, match="Reranking model not loaded"):
        u.generate_reranking("query", ["doc1", "doc2"])
