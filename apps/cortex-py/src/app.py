from __future__ import annotations

import logging
import os
import sys as _sys
from pathlib import Path as _Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Ensure this file can be imported directly (tests insert src path). If executed in a context
# where the package isn't recognized, append parent directory so that package imports resolve
# without relying on fragile relative fallbacks.
_HERE = _Path(__file__).resolve().parent
if str(_HERE) not in _sys.path:
    _sys.path.insert(0, str(_HERE))

logger = logging.getLogger(__name__)
FAST_TEST = os.getenv("CORTEX_PY_FAST_TEST") == "1"

from cortex_py.generator import (  # noqa: E402  - import after sys.path mutation
    DummyEmbeddingGenerator,
    LazyEmbeddingGenerator,
    build_embedding_generator,
)
from cortex_py.services import (  # noqa: E402
    EmbeddingService,
    RateLimitExceeded,
    SecurityViolation,
    ServiceError,
    ServiceValidationError,
)


class EmbedRequest(BaseModel):
    """Request payload used by both single and batch embedding endpoints."""

    text: str | None = None
    texts: list[str] | None = None
    normalize: bool | None = True


class ErrorModel(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorModel


def create_app(
    generator: Any | None = None,
    *,
    service: EmbeddingService | None = None,
) -> FastAPI:
    """Instantiate the FastAPI application and shared embedding service."""

    app = FastAPI()

    resolved_generator = build_embedding_generator(
        generator=generator,
        fast_test=FAST_TEST,
        force_lazy=os.getenv("CORTEX_PY_FORCE_LAZY", "0") == "1",
    )
    app.embedding_generator = resolved_generator  # type: ignore[attr-defined]

    max_chars = int(os.getenv("EMBED_MAX_CHARS", "8192"))
    cache_size = int(os.getenv("EMBED_CACHE_SIZE", "256"))
    rate_limit = int(os.getenv("EMBED_RATE_LIMIT_PER_MINUTE", "120"))

    def current_generator() -> Any:
        return getattr(app, "embedding_generator", resolved_generator)

    embedding_service = service or EmbeddingService(
        resolved_generator,
        generator_provider=current_generator,
        max_chars=max_chars,
        cache_size=cache_size,
        rate_limit_per_minute=rate_limit,
        audit_logger=logger.getChild("service"),
    )
    app.embedding_service = embedding_service  # type: ignore[attr-defined]

    def _validation_error(message: str, code: str = "VALIDATION_ERROR"):
        logger.error(message)
        return JSONResponse(
            status_code=422,
            content={"error": {"code": code, "message": message}},
        )

    def _handle_service_error(exc: ServiceError):
        error_code = getattr(exc, "code", "INTERNAL_ERROR")
        if isinstance(exc, (ServiceValidationError, SecurityViolation)):
            return _validation_error(str(exc), code=error_code)
        if isinstance(exc, RateLimitExceeded):
            return JSONResponse(
                status_code=429,
                content={"error": {"code": error_code, "message": str(exc)}},
            )
        logger.exception("embedding service failure: %s", exc)
        raise HTTPException(
            status_code=500,
            detail={"code": error_code, "message": str(exc)},
        ) from exc

    @app.post("/embed", responses={422: {"model": ErrorResponse}})
    def embed(req: EmbedRequest):
        text = req.text
        if text is None:
            return _validation_error("text field missing")
        try:
            result = embedding_service.generate_single(text, normalize=req.normalize is not False)
        except ServiceError as exc:
            return _handle_service_error(exc)
        return {"embedding": result.embedding}

    @app.post("/embeddings", responses={422: {"model": ErrorResponse}})
    def embeddings(req: EmbedRequest):
        if req.texts is None or not req.texts:
            return _validation_error("texts field must be a non-empty list")
        try:
            result = embedding_service.generate_batch(req.texts, normalize=req.normalize is not False)
        except ServiceError as exc:
            return _handle_service_error(exc)
        return {"embeddings": result.embeddings}

    @app.get("/model-info")
    def model_info():
        try:
            return embedding_service.get_model_info()
        except Exception as exc:  # pragma: no cover - unexpected runtime error
            raise HTTPException(
                status_code=500,
                detail={"code": "INTERNAL_ERROR", "message": str(exc)},
            ) from exc

    @app.get("/health")
    def health():
        import platform

        status = embedding_service.health_status()
        status.setdefault("status", "healthy")
        status["platform"] = platform.system()
        return status

    return app


__all__ = [
    "DummyEmbeddingGenerator",
    "LazyEmbeddingGenerator",
    "EmbedRequest",
    "ErrorResponse",
    "ErrorModel",
    "create_app",
]


