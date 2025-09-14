"""Test configuration & shim for cortex-py embedding tests.

This injects a lightweight `mlx.embedding_generator.MLXEmbeddingGenerator` shim
so tests can run without the real MLX / model dependencies present. The shim
covers only the API surface the tests exercise:

- __init__(model_name: str = "test-model", config_path: str | None = None)
- generate_embeddings(texts: list[str] | str, normalize: bool = True) -> list[list[float]]
- _load_model()  (noop)
- _select_backend() returns a deterministic backend string
- _maybe_cast_inputs(texts) -> list[str]
- Attributes: model_name, backend, dim (vector dimension), _loaded

If the real module is importable, we do nothing.
"""

from __future__ import annotations

import os
import sys
import types
from collections.abc import Sequence
from pathlib import Path

# Ensure source directory import path
_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:  # pragma: no cover - environment wiring
    sys.path.insert(0, str(_SRC))

# Fast mode env to keep tests lightweight
os.environ.setdefault("CORTEX_PY_FAST_TEST", "1")

try:  # pragma: no cover - prefer real implementation if available
    from mlx.embedding_generator import (
        MLXEmbeddingGenerator,  # type: ignore  # pragma: no cover
    )
except Exception:  # pragma: no cover - provide shim
    # Signal to tests that we're using the lightweight shim (no real MLX runtime)
    os.environ.setdefault("CORTEX_MLX_SHIM", "1")
    mlx_pkg = types.ModuleType("mlx")
    # Mark as a package so that Python import machinery allows submodule imports
    # after tests delete and re-import shim modules (e.g., in normalization tests).
    # Direct assignment is safe; if it fails we ignore via contextlib.suppress for safety.
    import contextlib

    with contextlib.suppress(Exception):  # pragma: no cover - defensive
        mlx_pkg.__path__ = []
        # Provide a synthetic ModuleSpec with a minimal loader so importlib.util.find_spec("mlx")
        # returns a spec whose loader is non-None. Some libraries (e.g. transformers) treat a
        # None loader as an invalid spec and may attempt alternative discovery paths which can
        # raise during shim-based testing. Supplying a lightweight loader keeps resolution fast
        # and predictable while avoiding heavy imports.
        import importlib.machinery as _mach  # local import to avoid overhead globally
        import types as _types

        class _ShimLoader(_mach.SourceFileLoader):  # pragma: no cover - trivial loader
            def __init__(self):
                # name and path are largely unused; supply placeholders
                super().__init__("mlx", "<shim-mlx>")

            # create_module/exec_module fall back to default behavior; for safety we implement
            # minimal no-op variants (returning existing module) to satisfy Loader protocol.
            def create_module(self, spec):  # type: ignore[no-untyped-def]
                return (
                    _types.ModuleType(spec.name)
                    if spec and spec.loader is self
                    else None
                )

            def exec_module(self, module):  # type: ignore[no-untyped-def]
                # Nothing to execute; module attributes are assigned below.
                return None

        if (
            getattr(mlx_pkg, "__spec__", None) is None
        ):  # pragma: no cover - idempotent guard
            mlx_pkg.__spec__ = _mach.ModuleSpec(
                name="mlx", loader=_ShimLoader(), is_package=True
            )
    embedding_mod = types.ModuleType("mlx.embedding_generator")
    unified_mod = types.ModuleType("mlx.mlx_unified")

    class ShimMLXEmbeddingGenerator:  # Shim implementation
        dim: int = 16

        def __init__(
            self,
            model_name: str = "test-model",
            config_path: str | None = None,
            **_: object,
        ) -> None:
            self.model_name = model_name
            self.config_path = config_path
            self.backend = self._select_backend()
            self._loaded = True
            # Minimal attributes some tests expect
            self.model = object()
            self.tokenizer = object()
            self.model_config = {
                "dimensions": self.dim,
                "path": "shim/path",
                "context_length": 32,
            }

        # ---- Internal helpers (lightweight) ----
        def _select_backend(self) -> str:  # pragma: no cover - deterministic
            return "shim-backend"

        def _load_model(self) -> None:  # pragma: no cover - noop
            self._loaded = True

        def _maybe_cast_inputs(self, texts: Sequence[str] | str) -> list[str]:
            if isinstance(texts, str):
                return [texts]
            return list(texts)

        # ---- Public API exercised in tests ----
        def generate_embeddings(
            self,
            texts: Sequence[str] | str,
            normalize: bool = True,
            **_: object,
        ) -> list[list[float]]:
            batch = self._maybe_cast_inputs(texts)
            base_vec = [0.0] * self.dim
            out: list[list[float]] = []
            for i, t in enumerate(batch):
                # Simple deterministic pattern derived from hash
                h = abs(hash(t)) % 997
                vec = base_vec.copy()
                vec[i % self.dim] = (h / 997.0) if normalize else float(h)
                out.append(vec)
            return out

    # Expose under expected public name
    embedding_mod.MLXEmbeddingGenerator = ShimMLXEmbeddingGenerator  # type: ignore[attr-defined]
    MLXEmbeddingGenerator = ShimMLXEmbeddingGenerator

    # ---- mlx_unified shim (minimal API used in tests) ----
    class _Unified:
        def __init__(self, model_name: str):
            if not model_name:
                raise ValueError("Model name must be non-empty")
            self.model_name = model_name
            lowered = model_name.lower()
            if "embedding" in lowered:
                self.model_type = "embedding"
            elif "rerank" in lowered:
                self.model_type = "reranking"
            else:
                self.model_type = "chat"
            self.model = None

        def generate_embedding(self, text: str):  # type: ignore[no-untyped-def]
            if self.model_type != "embedding":
                raise ValueError("Embedding model not loaded")
            if not self.model:
                raise ValueError("Embedding model not loaded")
            if not isinstance(text, str) or not text:
                raise ValueError("Text must be a non-empty string")
            return [0.0, 0.0, 0.0]

        def generate_chat(self, messages):  # type: ignore[no-untyped-def]
            if not messages:
                raise ValueError("Messages must be a non-empty list")
            if not isinstance(messages, list) or not all(
                isinstance(m, dict) for m in messages
            ):
                raise ValueError("Messages must be a non-empty list")
            if not self.model:
                raise ValueError("Chat model not loaded")
            # Return minimal structure
            return {"content": "ok"}

    def _get_default_int(var: str, default: int) -> int:
        try:
            return int(os.environ.get(var, default))
        except ValueError:
            return default

    def _get_default_float(var: str, default: float) -> float:
        try:
            return float(os.environ.get(var, default))
        except ValueError:
            return default

    _FALLBACK_MAX_LENGTH = 128
    _FALLBACK_MAX_TOKENS = 256
    _FALLBACK_TEMPERATURE = 0.7

    def get_default_max_length():  # type: ignore[no-untyped-def]
        return _get_default_int("MLX_DEFAULT_MAX_LENGTH", _FALLBACK_MAX_LENGTH)

    def get_default_max_tokens():  # type: ignore[no-untyped-def]
        return _get_default_int("MLX_DEFAULT_MAX_TOKENS", _FALLBACK_MAX_TOKENS)

    def get_default_temperature():  # type: ignore[no-untyped-def]
        return _get_default_float("MLX_DEFAULT_TEMPERATURE", _FALLBACK_TEMPERATURE)

    _CACHE_DIR = ".cache"

    def get_hf_home() -> str:
        return os.environ.get("HF_HOME", str(Path.home() / _CACHE_DIR / "hf"))

    def get_transformers_cache() -> str:
        return os.environ.get(
            "TRANSFORMERS_CACHE", str(Path.home() / _CACHE_DIR / "transformers")
        )

    def get_mlx_cache_dir() -> str:
        return str(Path.home() / _CACHE_DIR / "mlx")

    unified_mod.MLXUnified = _Unified  # type: ignore[attr-defined]
    unified_mod.get_default_max_length = get_default_max_length  # type: ignore[attr-defined]
    unified_mod.get_default_max_tokens = get_default_max_tokens  # type: ignore[attr-defined]
    unified_mod.get_default_temperature = get_default_temperature  # type: ignore[attr-defined]
    unified_mod.get_hf_home = get_hf_home  # type: ignore[attr-defined]
    unified_mod.get_transformers_cache = get_transformers_cache  # type: ignore[attr-defined]
    unified_mod.get_mlx_cache_dir = get_mlx_cache_dir  # type: ignore[attr-defined]
    unified_mod._FALLBACK_MAX_LENGTH = _FALLBACK_MAX_LENGTH  # type: ignore[attr-defined]
    unified_mod._FALLBACK_MAX_TOKENS = _FALLBACK_MAX_TOKENS  # type: ignore[attr-defined]
    unified_mod._FALLBACK_TEMPERATURE = _FALLBACK_TEMPERATURE  # type: ignore[attr-defined]

    # Register modules
    sys.modules.setdefault("mlx", mlx_pkg)
    sys.modules.setdefault("mlx.embedding_generator", embedding_mod)
    sys.modules.setdefault("mlx.mlx_unified", unified_mod)
else:  # Real implementation exists - optionally set a fast flag
    os.environ.setdefault("CORTEX_PY_REAL_MLX", "1")

# Public fixtures (add if needed later)
__all__ = ["MLXEmbeddingGenerator"]
