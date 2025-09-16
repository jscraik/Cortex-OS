from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any, Callable

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from mlx.embedding_generator import MLXEmbeddingGenerator

LOGGER = logging.getLogger(__name__)


class DummyEmbeddingGenerator:
    """Lightweight fallback / fast-test stub."""

    def __init__(self, dims: int = 384):
        self.dimensions = dims
        self.can_use_mlx = False
        self.can_use_sentence_transformers = False

    def generate_embedding(self, text: str) -> list[float]:
        if not text.strip():
            raise ValueError("text must be non-empty string")
        return [0.0] * self.dimensions

    def generate_embeddings(self, texts: list[str], normalize: bool = True) -> list[list[float]]:
        return [[0.0] * self.dimensions for _ in texts]

    def get_model_info(self) -> dict[str, Any]:
        fast_mode = os.getenv("CORTEX_PY_FAST_TEST") == "1"
        return {
            "model_name": "dummy-fast-test" if fast_mode else "dummy-fallback",
            "dimensions": self.dimensions,
            "backend": "unavailable",
            "sentence_transformers_available": False,
            "mlx_available": False,
            "model_loaded": not fast_mode,
        }


class LazyEmbeddingGenerator:
    """Defer heavy MLXEmbeddingGenerator initialization until first use."""

    def __init__(self, factory: Callable[[], Any]):
        self._factory = factory
        self._delegate: Any | None = None

    def _ensure_delegate(self) -> Any:
        if self._delegate is None:
            self._delegate = self._factory()
        return self._delegate

    def generate_embedding(self, text: str):  # type: ignore[no-untyped-def]
        return self._ensure_delegate().generate_embedding(text)

    def generate_embeddings(self, texts, normalize: bool = True):  # type: ignore[no-untyped-def]
        return self._ensure_delegate().generate_embeddings(texts, normalize=normalize)

    def get_model_info(self):  # type: ignore[no-untyped-def]
        if self._delegate is None:
            return {
                "model_name": "lazy-uninitialized",
                "backend": None,
                "model_loaded": False,
                "mlx_available": getattr(MLXEmbeddingGenerator, "MLX_AVAILABLE", True),
            }
        return self._delegate.get_model_info()

    def __getattr__(self, item: str) -> Any:
        return getattr(self._ensure_delegate(), item)


def build_embedding_generator(
    *,
    generator: Any | None = None,
    fast_test: bool | None = None,
    force_lazy: bool | None = None,
    lazy_factory: Callable[[], Any] | None = None,
) -> Any:
    """Create an embedding generator instance honoring environment overrides."""

    if generator is not None:
        return generator

    fast_mode = fast_test if fast_test is not None else os.getenv("CORTEX_PY_FAST_TEST") == "1"
    if fast_mode:
        dims = int(os.getenv("CORTEX_PY_DUMMY_DIMS", "384"))
        LOGGER.debug("Using DummyEmbeddingGenerator for fast test mode")
        return DummyEmbeddingGenerator(dims)

    lazy_flag = force_lazy if force_lazy is not None else os.getenv("CORTEX_PY_FORCE_LAZY", "0") == "1"
    factory = lazy_factory or (lambda: MLXEmbeddingGenerator())
    if lazy_flag:
        LOGGER.debug("Using LazyEmbeddingGenerator (forced)")
    else:
        LOGGER.debug("Using LazyEmbeddingGenerator (default)")
    return LazyEmbeddingGenerator(factory)


