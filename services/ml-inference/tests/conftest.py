"""Test shims for MLX-dependent modules.

Inject lightweight stand-ins for `mlx` packages so that `mlx_inference` and
`services/ml-inference/src/app.py` can import without the real MLX runtime.

The goal is to drive initialization and basic branch coverage without
executing heavy GPU/accelerator code or requiring Apple Silicon MLX install.

Set `CORTEX_MLX_TEST_SHIM=1` to activate (pytest automatically imports this file).
"""

from __future__ import annotations

import os
import sys
import types
from pathlib import Path

# Ensure the service src directory is importable for direct module imports (e.g., mlx_inference)
_SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(_SRC_DIR) not in sys.path:  # pragma: no cover - environment setup
    sys.path.insert(0, str(_SRC_DIR))


def _install_shim() -> None:  # pragma: no cover - infrastructure
    mlx_core = types.ModuleType("mlx.core")
    mlx_core.array = lambda x: x  # type: ignore[attr-defined]
    mlx_core.Device = type("Device", (), {})  # type: ignore[attr-defined]
    mlx_core.gpu = object()  # type: ignore[attr-defined]
    mlx_core.set_default_device = lambda _dev: None  # type: ignore[attr-defined]
    mlx_core.__dict__["__version__"] = "0.0-test"

    mlx = types.ModuleType("mlx")
    mlx.core = mlx_core  # type: ignore[attr-defined]

    mlx_lm = types.ModuleType("mlx_lm")

    def _fake_load(_path):  # type: ignore[override]
        return object(), object()

    mlx_lm.load = _fake_load  # type: ignore[attr-defined]
    mlx_lm.generate = lambda *_, **__: "shim-output"  # type: ignore[attr-defined]

    sys.modules.setdefault("mlx", mlx)
    sys.modules.setdefault("mlx.core", mlx_core)
    sys.modules.setdefault("mlx_lm", mlx_lm)


try:  # Attempt real import first
    import mlx.core  # type: ignore

    getattr(
        mlx.core, "__dict__", {}
    )  # pragma: no cover - reference to avoid unused warning
except Exception:  # pragma: no cover - fallback path
    _install_shim()

"""Pytest configuration for ml-inference tests."""

os.environ.setdefault("MODEL_NAME", "test-model")
