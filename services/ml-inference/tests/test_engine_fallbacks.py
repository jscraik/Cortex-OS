"""Extra coverage tests for mlx_inference fallback and memory health branches.

These target rarely-triggered defensive branches:
1. Final hard fallback response when both protected inference and error handler raise.
2. Memory health check path when ``psutil`` import fails.
"""

from __future__ import annotations

# mypy: ignore-errors
import asyncio
import pathlib
import sys
import tempfile
from typing import Any

import pytest
from _pytest.monkeypatch import MonkeyPatch

# Ensure src directory is importable when running this file in isolation
_SRC_PATH = pathlib.Path(__file__).resolve().parents[1] / "src"
if str(_SRC_PATH) not in sys.path:
    sys.path.insert(0, str(_SRC_PATH))

try:  # pragma: no cover - guarded import
    from mlx_inference import (  # type: ignore
        InferenceRequest,
        MLXInferenceEngine,
        ModelConfig,
    )
except Exception:  # pragma: no cover - skip if still not importable
    InferenceRequest = MLXInferenceEngine = ModelConfig = None  # type: ignore


@pytest.mark.asyncio
async def test_final_fallback_when_error_handler_raises(
    monkeypatch: MonkeyPatch,
) -> None:
    if MLXInferenceEngine is None:  # pragma: no cover - environment guard
        pytest.skip("mlx_inference unavailable")
    # If import failed earlier the module-level import would raise; shim ensures availability
    """Force error_handler to raise so generate_text returns final static fallback response."""
    with tempfile.TemporaryDirectory() as td:
        engine: Any = MLXInferenceEngine(ModelConfig(name="shim-final", path=td))
        engine.is_initialized = True
        engine.model_manager.is_loaded = True
        engine.model_manager.model = object()
        engine.model_manager.tokenizer = object()

        # Cause protected inference to raise
        async def boom(*_a: Any, **_k: Any) -> None:  # pragma: no cover - trivial
            raise RuntimeError("boom")

        monkeypatch.setattr(engine, "_perform_inference_with_protection", boom)

        # Cause error handler fallback attempt to raise as well
        def raise_in_handler(
            e: Exception, ctx: Any
        ) -> None:  # pragma: no cover - trivial
            raise RuntimeError("nested")

        engine.error_handler.handle_error = raise_in_handler  # type: ignore

        resp: Any = await engine.generate_text(InferenceRequest(prompt="x"))
        assert "temporarily unavailable" in resp.text.lower()


@pytest.mark.asyncio
async def test_memory_health_import_error(monkeypatch: MonkeyPatch) -> None:
    if MLXInferenceEngine is None:  # pragma: no cover - environment guard
        pytest.skip("mlx_inference unavailable")
    # Shim ensures MLXInferenceEngine is available
    """Simulate psutil ImportError so _check_memory_health returns True fallback path."""
    with tempfile.TemporaryDirectory() as td:
        engine: Any = MLXInferenceEngine(ModelConfig(name="shim-memory", path=td))
        engine.is_initialized = True
        engine.model_manager.is_loaded = True
        engine.model_manager.model = object()
        engine.model_manager.tokenizer = object()

        # Remove psutil so import inside _check_memory_health fails
        monkeypatch.setitem(__import__("sys").modules, "psutil", None)

        # Allow inference path to proceed; patch protected call
        async def protected(
            prompt_req: Any, start: Any
        ) -> Any:  # pragma: no cover - minimal stub
            await asyncio.sleep(0)
            return engine._run_inference("ok", 4, 0.1)

        monkeypatch.setattr(engine, "_perform_inference_with_protection", protected)
        resp: Any = await engine.generate_text(InferenceRequest(prompt="hello"))
        assert isinstance(resp.text, str)
