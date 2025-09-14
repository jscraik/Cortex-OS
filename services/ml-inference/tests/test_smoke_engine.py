"""Smoke tests for MLXInferenceEngine construction and basic method contracts.

We avoid heavy initialization by monkeypatching internal load / initialize steps.
If engine class not importable (missing deps), skip.
"""

from __future__ import annotations

import importlib.util
from typing import Any

import pytest


def _safe_find(name: str):  # pragma: no cover - defensive
    try:
        return importlib.util.find_spec(name)
    except Exception:
        return None

spec = _safe_find("mlx_inference")
mlx_spec = _safe_find("mlx")
if spec is None or mlx_spec is None:  # pragma: no cover - optional dependency absent
    pytest.skip(
        "mlx_inference or mlx core not available; skipping engine smoke tests",
        allow_module_level=True,
    )


def test_engine_basic_methods(monkeypatch):  # type: ignore[no-untyped-def]
    from mlx_inference import MLXInferenceEngine  # type: ignore

    class DummyEngine(MLXInferenceEngine):  # type: ignore[misc]
        async def initialize(self) -> None:  # pragma: no cover - simple assignment
            # Mark initialized flag (engine may normally set internal state)
            self.initialized = True

    eng: Any = DummyEngine("dummy-model", "dummy-path")

    class DummyResponse:  # Minimal shape for downstream expectations
        def __init__(self) -> None:
            self.text = "ok"
            self.tokens_generated = 1
            self.latency_ms = 0.0
            self.cached = False

    async def fake_generate_text(
        _req: Any,
    ) -> DummyResponse:  # pragma: no cover - trivial
        return DummyResponse()

    # Replace network/model heavy method with lightweight stub
    monkeypatch.setattr(eng, "generate_text", fake_generate_text)
    assert hasattr(eng, "model_name")
