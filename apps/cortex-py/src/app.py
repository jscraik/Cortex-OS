import logging
import os

# Ensure this file can be imported directly (tests insert src path). If executed in a context
# where the package isn't recognized, append parent directory so that 'mlx.embedding_generator'
# absolute import resolves without needing a fragile relative fallback.
import sys as _sys
from collections.abc import Callable
from pathlib import Path as _Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

_HERE = _Path(__file__).resolve().parent
if str(_HERE) not in _sys.path:
    _sys.path.insert(0, str(_HERE))
# Import resolution (tests may adjust sys.path). Fallback rarely triggers.
try:  # pragma: no cover
    from mlx.embedding_generator import MLXEmbeddingGenerator  # type: ignore
except Exception:  # pragma: no cover
    from .mlx.embedding_generator import MLXEmbeddingGenerator  # type: ignore


class LazyEmbeddingGenerator:
    """Defer heavy MLXEmbeddingGenerator initialization until first use.

    This prevents module import from attempting model downloads / heavy backend
    loads which were causing long collection times and timeouts in CI. The real
    generator is constructed the first time any generation method or model info
    is requested. Thread-safety is not a concern for test context; for runtime
    a simple double-checked lock could be added later if needed.
    """

    def __init__(self, factory: Callable[[], Any]):
        self._factory = factory
        self._delegate: Any | None = None

    def _ensure_delegate(self) -> Any:
        if self._delegate is None:
            self._delegate = self._factory()
        return self._delegate

    # Delegate methods
    def generate_embedding(self, text: str):  # type: ignore[no-untyped-def]
        return self._ensure_delegate().generate_embedding(text)

    def generate_embeddings(self, texts, normalize: bool = True):  # type: ignore[no-untyped-def]
        return self._ensure_delegate().generate_embeddings(texts, normalize=normalize)

    def get_model_info(self):  # type: ignore[no-untyped-def]
        # If never initialized, expose a lightweight placeholder info for health checks.
        if self._delegate is None:
            return {
                "model_name": "lazy-uninitialized",
                "backend": None,
                "model_loaded": False,
                "mlx_available": getattr(MLXEmbeddingGenerator, "MLX_AVAILABLE", True),  # type: ignore[attr-defined]
            }
        return self._delegate.get_model_info()


logger = logging.getLogger(__name__)


class EmbedRequest(BaseModel):
    # Maintain original single-text field for /embed
    text: str | None = None
    # Allow batch embeddings via tests expecting /embeddings {"texts": [...], "normalize": bool}
    texts: list[str] | None = None
    normalize: bool | None = True


class ErrorModel(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):  # Simple wrapper for consistency
    error: ErrorModel


def create_app(generator: Any | None = None) -> FastAPI:
    app = FastAPI()
    force_lazy = os.getenv("CORTEX_PY_FORCE_LAZY", "0") == "1"
    if generator is not None:
        gen = generator
    else:
        if FAST_TEST:
            gen = DummyEmbeddingGenerator(384)
        elif force_lazy:
            gen = LazyEmbeddingGenerator(lambda: MLXEmbeddingGenerator())
        else:
            # Eager path (runtime usage) still lazy internally to defer heavy init until first call
            gen = LazyEmbeddingGenerator(lambda: MLXEmbeddingGenerator())
    # Expose generator for tests to patch (tests expect module attribute)
    app.embedding_generator = gen  # type: ignore[attr-defined]
    max_chars = int(os.getenv("EMBED_MAX_CHARS", "8192"))

    def _validation_error(message: str, code: str = "VALIDATION_ERROR"):
        logger.error(message)
        return JSONResponse(
            status_code=422,
            content={"error": {"code": code, "message": message}},
        )

    @app.post("/embed", responses={422: {"model": ErrorResponse}})
    def embed(req: EmbedRequest):
        # Single text embedding endpoint (compat)
        # Always resolve current (possibly patched) generator
        current_gen = getattr(app, "embedding_generator", gen)  # type: ignore[attr-defined]
        text = req.text
        if text is None:
            return _validation_error("text field missing")
        if not isinstance(text, str):  # pragma: no cover - defensive (pydantic coerces)
            return _validation_error("text must be a string")
        if not text.strip():
            return _validation_error("text must not be empty or whitespace")
        if len(text) > max_chars:
            return _validation_error(
                f"text exceeds max length of {max_chars} characters", "TEXT_TOO_LONG"
            )
        try:
            embedding = current_gen.generate_embedding(text)
            return {"embedding": embedding}
        except HTTPException:  # re-raise FastAPI exceptions if any
            raise
        except Exception as e:  # pragma: no cover - unexpected runtime error
            logger.exception("embedding generation failed: %s", e)
            raise HTTPException(
                status_code=500,
                detail={"code": "INTERNAL_ERROR", "message": str(e)},
            ) from e

    @app.post("/embeddings", responses={422: {"model": ErrorResponse}})
    def embeddings(req: EmbedRequest):  # batch endpoint expected by tests
        if req.texts is None or not isinstance(req.texts, list) or not req.texts:
            return _validation_error("texts field must be a non-empty list")
        for t in req.texts:
            if not isinstance(t, str) or not t.strip():
                return _validation_error("each text must be a non-empty string")
            if len(t) > max_chars:
                return _validation_error(
                    f"one text exceeds max length of {max_chars} characters",
                    "TEXT_TOO_LONG",
                )
        try:
            current_gen = getattr(app, "embedding_generator", gen)  # type: ignore[attr-defined]
            embs = current_gen.generate_embeddings(
                req.texts, normalize=req.normalize is not False
            )
            return {"embeddings": embs}
        except Exception as e:  # pragma: no cover - unexpected runtime error
            logger.exception("batch embedding generation failed: %s", e)
            raise HTTPException(
                status_code=500,
                detail={"code": "INTERNAL_ERROR", "message": str(e)},
            ) from e

    @app.get("/model-info")
    def model_info():
        try:
            current_gen = getattr(app, "embedding_generator", gen)  # type: ignore[attr-defined]
            return current_gen.get_model_info()
        except Exception as e:  # pragma: no cover - unexpected runtime error
            raise HTTPException(
                status_code=500,
                detail={"code": "INTERNAL_ERROR", "message": str(e)},
            ) from e

    @app.get("/health")
    def health():
        import platform

        current_gen = getattr(app, "embedding_generator", gen)  # type: ignore[attr-defined]

        return {
            "status": "healthy",
            "platform": platform.system(),
            "backends_available": {
                "mlx": getattr(current_gen, "can_use_mlx", False),
                "sentence_transformers": getattr(
                    current_gen, "can_use_sentence_transformers", False
                ),
            },
        }

    return app


FAST_TEST = os.getenv("CORTEX_PY_FAST_TEST") == "1"


class DummyEmbeddingGenerator:  # lightweight fallback / fast-test stub
    def __init__(self, dims: int = 384):
        self.dimensions = dims
        self.can_use_mlx = False
        self.can_use_sentence_transformers = False

    def generate_embedding(self, text: str):  # type: ignore[no-untyped-def]
        if not isinstance(text, str) or not text:
            raise ValueError("text must be non-empty string")
        return [0.0] * self.dimensions

    def generate_embeddings(self, texts, normalize: bool = True):  # type: ignore[no-untyped-def]
        return [[0.0] * self.dimensions for _ in texts]

    def get_model_info(self):  # type: ignore[no-untyped-def]
        # Read the environment dynamically so tests that mutate CORTEX_PY_FAST_TEST
        # after module import still get an accurate reflection (FAST_TEST constant
        # is only evaluated once at import time). This keeps behavior predictable
        # for runtime while allowing tests to toggle fast-test mode explicitly.
        fast_mode = os.getenv("CORTEX_PY_FAST_TEST") == "1"
        return {
            "model_name": "dummy-fast-test" if fast_mode else "dummy-fallback",
            "dimensions": self.dimensions,
            "backend": "unavailable",
            "sentence_transformers_available": False,
            "mlx_available": False,
            "model_loaded": not fast_mode,  # fast mode indicates intentionally not loaded
        }


if FAST_TEST:
    embedding_generator_instance = DummyEmbeddingGenerator(384)
    app = create_app(embedding_generator_instance)
    embedding_generator = embedding_generator_instance  # type: ignore
else:

    def _factory() -> Any:
        try:
            return MLXEmbeddingGenerator()
        except Exception:  # pragma: no cover
            logger.warning(
                "MLXEmbeddingGenerator unavailable during first use; using dummy fallback",
                exc_info=True,
            )
            return DummyEmbeddingGenerator(384)

    embedding_generator_instance = LazyEmbeddingGenerator(_factory)
    app = create_app(embedding_generator_instance)
    embedding_generator = embedding_generator_instance  # type: ignore
