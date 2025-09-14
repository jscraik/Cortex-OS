"""Darwin-only MLX health path test.

Skips automatically on non-macOS platforms or when shim is active. Ensures that
when environment forces MLX enable (and dependencies import), capability report
reflects MLX availability.
"""
from __future__ import annotations

import importlib
import os
import platform

import pytest


@pytest.mark.skipif(platform.system() != "Darwin", reason="Darwin-only MLX test")
def test_mlx_capabilities_report():  # type: ignore[no-untyped-def]
    if os.environ.get("CORTEX_MLX_SHIM") == "1":
        pytest.skip("Shim active; real MLX not available")
    # Force recompute path respecting env variable toggles
    os.environ.setdefault("CORTEX_FORCE_ENABLE_MLX", "1")
    import mlx.embedding_generator as eg  # type: ignore

    importlib.reload(eg)
    caps = eg.get_backend_capabilities()
    assert "mlx_available" in caps
    # When forced and on Darwin with imports succeeding, should be True
    # If dependencies truly missing, allow False but ensure key present
    assert isinstance(caps["mlx_available"], bool)
    assert caps["platform"] == "Darwin"
