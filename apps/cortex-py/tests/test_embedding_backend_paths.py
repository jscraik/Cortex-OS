"""Backend selection tests for `MLXEmbeddingGenerator` (lightweight / no heavy model loads).

Scenarios covered:
1. MLX preferred when both backends available on macOS.
2. sentence-transformers fallback when MLX unavailable.
3. MLX retry path (first load failure then success after snapshot download).
4. Error when no backends available.
5. Fast test mode deterministic zero-vector output.
"""

from __future__ import annotations

import contextlib
import json
import os
import platform
import sys
import tempfile
from collections.abc import Iterator
from pathlib import Path
from types import ModuleType
from typing import cast
from unittest.mock import MagicMock, patch

import pytest


def _write_config(dim: int = 128) -> str:
    data = {
        "test-model": {
            "path": "dummy/repo",
            "dimensions": dim,
            "context_length": 256,
            "memory_gb": 0.1,
        }
    }
    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False)
    with tmp as fh:
        json.dump(data, fh)
    return tmp.name


@pytest.fixture
def config_file() -> Iterator[str]:
    path = _write_config()
    try:
        yield path
    finally:
        with contextlib.suppress(OSError):
            os.unlink(path)


def _ensure_src_path() -> None:
    root = Path(__file__).resolve().parents[3]
    src_path = root / "apps" / "cortex-py" / "src"
    if str(src_path) not in sys.path:
        sys.path.insert(0, str(src_path))


def _import_generator_module() -> ModuleType:
    _ensure_src_path()
    import mlx.embedding_generator as eg  # type: ignore

    return cast(ModuleType, eg)


class _FakeArray:
    def __init__(self, size: int):
        self._data = [0.0] * size

    def tolist(self) -> list[float]:  # pragma: no cover
        return self._data


def test_mlx_preferred_over_sentence_transformers(config_file: str) -> None:
    os.environ.pop("CORTEX_PY_FAST_TEST", None)
    with patch.object(platform, "system", return_value="Darwin"):
        fake_st_mod = ModuleType("sentence_transformers")

        class _FakeSTInit:
            def encode(self, *_args, **_kw):  # type: ignore[no-untyped-def]
                return _FakeArray(128)

        fake_st_mod.SentenceTransformer = _FakeSTInit  # type: ignore[attr-defined]
        sys.modules["sentence_transformers"] = fake_st_mod
        eg = _import_generator_module()
        eg.MLX_AVAILABLE = True  # type: ignore[attr-defined]
        eg.SENTENCE_TRANSFORMERS_AVAILABLE = True  # type: ignore[attr-defined]
        eg.load = MagicMock(return_value=(MagicMock(), MagicMock()))  # type: ignore[attr-defined]
        from mlx.embedding_generator import MLXEmbeddingGenerator

        gen = MLXEmbeddingGenerator("test-model", config_file)
        assert gen.get_model_info()["backend"] == "mlx"
    assert eg.load.called


def test_sentence_transformers_fallback_when_no_mlx(config_file: str) -> None:
    os.environ.pop("CORTEX_PY_FAST_TEST", None)
    with patch.object(platform, "system", return_value="Linux"):
        fake_st_mod = ModuleType("sentence_transformers")

        class _FakeSTInit:
            def __init__(self, *args, **kwargs):  # type: ignore[no-untyped-def]
                pass

            def encode(self, *_args, **_kw):  # type: ignore[no-untyped-def]
                return _FakeArray(64)

        fake_st_mod.SentenceTransformer = _FakeSTInit  # type: ignore[attr-defined]
        sys.modules["sentence_transformers"] = fake_st_mod
        eg = _import_generator_module()
        eg.SentenceTransformer = fake_st_mod.SentenceTransformer  # type: ignore[attr-defined]
        eg.MLX_AVAILABLE = False  # type: ignore[attr-defined]
        eg.SENTENCE_TRANSFORMERS_AVAILABLE = True  # type: ignore[attr-defined]
        from mlx.embedding_generator import MLXEmbeddingGenerator

        gen = MLXEmbeddingGenerator("test-model", config_file)
        assert gen.get_model_info()["backend"] == "sentence-transformers"


def test_mlx_retry_path_initial_failure_then_success(config_file: str) -> None:
    os.environ.pop("CORTEX_PY_FAST_TEST", None)
    with patch.object(platform, "system", return_value="Darwin"):
        eg = _import_generator_module()
        calls = {"n": 0}

        def load_side_effect(_path: str):  # type: ignore[no-untyped-def]
            if calls["n"] == 0:
                calls["n"] += 1
                raise RuntimeError("initial failure")
            return (MagicMock(), MagicMock())

        eg.load = MagicMock(side_effect=load_side_effect)  # type: ignore[attr-defined]
        fake_hub = ModuleType("huggingface_hub")
        fake_hub.snapshot_download = lambda *a, **k: None  # type: ignore[attr-defined]
        sys.modules["huggingface_hub"] = fake_hub
        eg.MLX_AVAILABLE = True  # type: ignore[attr-defined]
        eg.SENTENCE_TRANSFORMERS_AVAILABLE = False  # type: ignore[attr-defined]
        from mlx.embedding_generator import MLXEmbeddingGenerator

        gen = MLXEmbeddingGenerator("test-model", config_file)
        assert gen.selected_backend == "mlx"
    assert eg.load.call_count == 2


def test_error_when_no_backends_available(config_file: str) -> None:
    os.environ.pop("CORTEX_PY_FAST_TEST", None)
    with patch.object(platform, "system", return_value="Linux"):
        eg = _import_generator_module()
        eg.MLX_AVAILABLE = False  # type: ignore[attr-defined]
        eg.SENTENCE_TRANSFORMERS_AVAILABLE = False  # type: ignore[attr-defined]
        from mlx.embedding_generator import MLXEmbeddingGenerator

        with pytest.raises(RuntimeError, match="No embedding backend available"):
            MLXEmbeddingGenerator("test-model", config_file)


def test_fast_mode_zero_vector(
    monkeypatch: pytest.MonkeyPatch, config_file: str
) -> None:
    monkeypatch.setenv("CORTEX_PY_FAST_TEST", "1")
    _ensure_src_path()
    # If the module was already imported earlier (without env var), FAST_TEST will be False.
    # Force the runtime flag to True for this test to exercise fast path deterministically.
    import mlx.embedding_generator as eg  # type: ignore

    eg.FAST_TEST = True  # type: ignore[attr-defined]
    from mlx.embedding_generator import MLXEmbeddingGenerator

    gen = MLXEmbeddingGenerator("test-model", config_file)
    emb = gen.generate_embedding("hello world")
    assert set(emb) == {0.0}
    assert len(emb) == 128
    info = gen.get_model_info()
    assert info["backend"] == "sentence-transformers"


def test_dimension_correction_and_normalization(config_file: str) -> None:
    """Force MLX path with a short raw embedding to ensure padding + normalization.

    We stub out heavy loading and provide a short vector of 10 ones; after dimension
    correction it should be padded to expected (128). Normalization should yield
    L2 norm ~= 1.
    """
    os.environ.pop("CORTEX_PY_FAST_TEST", None)
    with patch.object(platform, "system", return_value="Darwin"):
        eg = _import_generator_module()
        # Force MLX availability and disable sentence-transformers so MLX path is chosen.
        eg.MLX_AVAILABLE = True  # type: ignore[attr-defined]
        eg.SENTENCE_TRANSFORMERS_AVAILABLE = False  # type: ignore[attr-defined]
        # Ensure fast test shortcut disabled for this specific test even if module imported earlier
        eg.FAST_TEST = False  # type: ignore[attr-defined]
        from mlx.embedding_generator import MLXEmbeddingGenerator

        # Stub out the heavy _load_model BEFORE instantiation.
        original_load_model = MLXEmbeddingGenerator._load_model

        def _stub_load_model(self):  # type: ignore[no-untyped-def]
            self.model = object()  # minimal placeholder without encode -> MLX path
            self.tokenizer = object()
            self.selected_backend = "mlx"

        MLXEmbeddingGenerator._load_model = _stub_load_model  # type: ignore[assignment]
        try:
            gen = MLXEmbeddingGenerator("test-model", config_file)

            # Provide a raw embedding shorter than expected; the public method will
            # call MLX path -> _generate_raw_embedding -> _generate_mlx_embedding, but we
            # intercept the final stage to return an already dimension-corrected vector
            # of 10 ones followed by padding zeros (so normalization still acts on 10 ones).
            def _short_embed(_self, _text: str):  # type: ignore[no-untyped-def]
                # Provide short embedding then apply dimension correction inside stub to emulate
                # internal behavior before normalization.
                return _self._ensure_correct_dimensions([1.0] * 10)

            # Patch the lower-level method so generate_embedding triggers normalization afterwards.
            gen._generate_mlx_embedding = _short_embed.__get__(
                gen, MLXEmbeddingGenerator
            )  # type: ignore[attr-defined]
            # Call generate_embedding (normalize=True): ensures dimension correction then normalization.
            emb = gen.generate_embedding("short test", normalize=True)
            assert len(emb) == 128
            import math

            import numpy as np

            # After dimension correction we have 10 ones + 118 zeros; normalization divides first 10 by sqrt(10).
            expected_val = 1 / math.sqrt(10)
            for v in emb[:10]:
                assert abs(v - expected_val) < 1e-6
            assert set(emb[10:]) == {0.0}
            assert abs(np.linalg.norm(np.array(emb)) - 1.0) < 1e-6
        finally:
            MLXEmbeddingGenerator._load_model = original_load_model  # restore
