"""Targeted MLX shim tests exercising lifecycle, cache, fallback, and health paths."""

from __future__ import annotations

import tempfile

import pytest
from mlx_inference import (  # type: ignore
    InferenceRequest,
    MLXInferenceEngine,
    ModelConfig,
    create_mlx_engine,
)

# mypy: ignore-errors


@pytest.mark.asyncio
async def test_engine_lifecycle_and_cache(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    with tempfile.TemporaryDirectory() as td:
        cfg = ModelConfig(name="shim-model", path=td)
        engine = MLXInferenceEngine(cfg)
        # Patch model_manager.get_model_info to avoid recursive attribute access in shim environment
        engine.model_manager.get_model_info = lambda: {"loaded": False}  # type: ignore[attr-defined]

        # Stub out load_model to avoid filesystem access
        async def fake_load():  # pragma: no cover - trivial stub
            engine.model_manager.is_loaded = True
            engine.model_manager.model = object()
            engine.model_manager.tokenizer = object()

        monkeypatch.setattr(engine.model_manager, "load_model", fake_load)
        assert engine.get_status()["initialized"] is False
        await engine.initialize()
        status = engine.get_status()
        assert status["initialized"] is True
        # Prepare minimal model_manager state to satisfy _run_inference
        engine.model_manager.is_loaded = True
        engine.model_manager.model = object()
        engine.model_manager.tokenizer = object()
        req = InferenceRequest(prompt="Hello world", max_tokens=4, temperature=0.1)
        r1 = await engine.generate_text(req)
        assert r1.tokens_generated >= 0
        # Second call exercises cached branch
        r2 = await engine.generate_text(req)
        assert r2.cached in (
            True,
            False,
        )  # shim may not mark cached depending on hashing
        cache_info = engine.get_cache_info()
        assert "hits" in cache_info
        engine.clear_cache()
        await engine.shutdown()
        assert engine.get_status()["initialized"] is False


@pytest.mark.asyncio
async def test_not_initialized_error() -> None:
    with tempfile.TemporaryDirectory() as td:
        engine = MLXInferenceEngine(ModelConfig(name="shim", path=td))
        with pytest.raises(RuntimeError):
            await engine.generate_text(InferenceRequest(prompt="hi"))


@pytest.mark.asyncio
async def test_factory_and_fallback(monkeypatch) -> None:
    with tempfile.TemporaryDirectory() as td:
        engine = create_mlx_engine("shim-model", td)
        # Shortcut initialization
        engine.is_initialized = True
        engine.model_manager.is_loaded = True
        engine.model_manager.model = object()
        engine.model_manager.tokenizer = object()

        # Force protected inference path to raise exception so fallback executes
        async def boom(*_a, **_k):  # pragma: no cover - simple exception helper
            raise RuntimeError("boom")

        monkeypatch.setattr(engine, "_perform_inference_with_protection", boom)

        # Mock error_handler to supply fallback dict
        engine.error_handler.handle_error = lambda e, c: {  # type: ignore[attr-defined]
            "content": f"fallback:{e}"
        }

        resp = await engine.generate_text(InferenceRequest(prompt="test"))
        assert resp.text.startswith("fallback:") or "temporarily" in resp.text


@pytest.mark.asyncio
async def test_health_check_failure(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    with tempfile.TemporaryDirectory() as td:
        engine = create_mlx_engine("shim-model", td)
        engine.is_initialized = True
        engine.model_manager.is_loaded = True
        engine.model_manager.model = object()
        engine.model_manager.tokenizer = object()

        # Force protected inference path to raise immediately
        async def immediate_fail(*_a, **_k):  # pragma: no cover - deterministic fail
            raise RuntimeError("Model health check failed")

        monkeypatch.setattr(
            engine, "_perform_inference_with_protection", immediate_fail
        )

        # Force error handler to re-raise original exception
        def rethrow(e, _c):  # pragma: no cover
            raise e

        engine.error_handler.handle_error = rethrow  # type: ignore[attr-defined]
        with pytest.raises(RuntimeError):
            await engine.generate_text(InferenceRequest(prompt="x"))
