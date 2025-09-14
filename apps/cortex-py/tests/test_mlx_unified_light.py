"""Lightweight smoke tests for `mlx_unified` module.

Goals:
- Import the module to execute top-level env / constant logic.
- Exercise simple helper accessors (cache dir + defaults) to record coverage.
- Instantiate `MLXUnified` without loading a model (no heavy I/O) and trigger
  expected validation errors to execute branches in `generate_embedding` and `generate_chat` guards.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "apps" / "cortex-py" / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))


def test_mlx_unified_helpers_and_guards():  # type: ignore[no-untyped-def]
    # Avoid any accidental model download attempts by clearing network-related env vars
    os.environ.setdefault("HF_HOME", str(ROOT / ".pytest-hf-home"))
    import mlx.mlx_unified as mu  # type: ignore

    # Helper functions
    assert mu.get_default_max_length() > 0
    assert mu.get_default_max_tokens() > 0
    assert 0 < mu.get_default_temperature() < 5
    assert mu.get_hf_home()  # derived path
    assert mu.get_transformers_cache()
    assert mu.get_mlx_cache_dir()

    # Instantiate embedding type (name contains 'embedding')
    unified = mu.MLXUnified("demo-embedding-model")
    # model_type should be embedding (no load_model call yet)
    assert unified.model_type == "embedding"

    # generate_embedding should raise because model not loaded yet
    with pytest.raises(ValueError, match="Embedding model not loaded"):
        unified.generate_embedding("hello world")

    # Force chat type and assert guard logic
    unified.model_type = "chat"  # type: ignore[attr-defined]
    with pytest.raises(ValueError, match="Chat model not loaded"):
        unified.generate_chat([{"role": "user", "content": "Hi"}])

    # Reranking guard
    unified.model_type = "reranking"  # type: ignore[attr-defined]
    with pytest.raises(ValueError, match="Reranking model not loaded"):
        unified.generate_reranking("q", ["doc"])  # type: ignore[arg-type]
