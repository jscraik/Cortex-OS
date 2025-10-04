from __future__ import annotations

import logging
import os
import sys as _sys
from datetime import datetime, timezone
from pathlib import Path as _Path
from typing import Any

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
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

from cortex_py.a2a import (  # noqa: E402
    A2ABus,
    create_a2a_bus,
    create_mlx_embedding_event,
)
from cortex_py.generator import (  # noqa: E402  - import after sys.path mutation
    build_embedding_generator,
)
from cortex_py.hybrid_config import (  # noqa: E402
    get_hybrid_config,
    validate_hybrid_deployment,
)
from cortex_py.services import (  # noqa: E402
    EmbeddingService,
    RateLimitExceeded,
    SecurityViolation,
    ServiceError,
    ServiceValidationError,
)

# Phase 5: Operational health checks
try:
    from src.operational.health import HealthService
except ImportError:
    # Fallback if operational module not available
    HealthService = None  # type: ignore


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
    a2a_bus: A2ABus | None = None,
) -> FastAPI:
    """Instantiate the FastAPI application and shared embedding service."""

    # Initialize hybrid configuration
    hybrid_config = get_hybrid_config()
    logger.info(
        f"{hybrid_config.log_prefix} Initializing MLX service with hybrid strategy"
    )
    logger.info(
        f"{hybrid_config.log_prefix} MLX priority: {hybrid_config.mlx_priority}"
    )
    logger.info(f"{hybrid_config.log_prefix} Hybrid mode: {hybrid_config.hybrid_mode}")

    # Validate deployment readiness
    if not validate_hybrid_deployment():
        logger.warning(
            f"{hybrid_config.log_prefix} Hybrid deployment validation failed, continuing with degraded service"
        )

    app = FastAPI(
        title="brAInwav Cortex-OS MLX Service",
        description="MLX-first embedding service with hybrid model integration",
        version="1.0.0",
    )

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

    # Initialize A2A bus for cross-language communication
    # Check if we should use real A2A core integration via stdio bridge
    use_real_core = (
        os.getenv("CORTEX_PY_A2A_MODE") == "stdio"
        or os.getenv("CORTEX_PY_USE_REAL_A2A", "true").lower() == "true"
    )

    if use_real_core:
        logger.info("Using real A2A core integration via stdio bridge")
        a2a = a2a_bus or create_a2a_bus(source="urn:cortex:py:mlx", use_real_core=True)
    else:
        logger.info("Using legacy HTTP transport for A2A")
        a2a = a2a_bus or create_a2a_bus(source="urn:cortex:py:mlx", use_real_core=False)

    app.a2a_bus = a2a  # type: ignore[attr-defined]

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
            import time

            start_time = time.time()
            result = embedding_service.generate_single(
                text, normalize=req.normalize is not False
            )
            processing_time = time.time() - start_time

            # Publish A2A event for embedding completion
            import asyncio

            try:
                event = create_mlx_embedding_event(
                    request_id=f"embed_{int(time.time() * 1000)}",
                    text_count=1,
                    total_chars=len(text),
                    processing_time=processing_time,
                    model_used=getattr(result, "model_name", "unknown"),
                    dimension=len(result.embedding) if result.embedding else 0,
                    success=True,
                )
                asyncio.create_task(a2a.publish(event))
            except Exception as e:
                logger.warning(f"Failed to publish A2A embedding event: {e}")

        except ServiceError as exc:
            return _handle_service_error(exc)
        return {"embedding": result.embedding}

    @app.post("/embeddings", responses={422: {"model": ErrorResponse}})
    def embeddings(req: EmbedRequest):
        if req.texts is None or not req.texts:
            return _validation_error("texts field must be a non-empty list")
        try:
            import time

            start_time = time.time()
            result = embedding_service.generate_batch(
                req.texts, normalize=req.normalize is not False
            )
            processing_time = time.time() - start_time

            # Publish A2A event for batch embedding completion
            import asyncio

            try:
                total_chars = sum(len(text) for text in req.texts)
                event = create_mlx_embedding_event(
                    request_id=f"batch_{int(time.time() * 1000)}",
                    text_count=len(req.texts),
                    total_chars=total_chars,
                    processing_time=processing_time,
                    model_used=getattr(result, "model_name", "unknown"),
                    dimension=len(result.embeddings[0])
                    if result.embeddings and result.embeddings[0]
                    else 0,
                    success=True,
                )
                asyncio.create_task(a2a.publish(event))
            except Exception as e:
                logger.warning(f"Failed to publish A2A batch embedding event: {e}")

        except ServiceError as exc:
            return _handle_service_error(exc)
        return {"embeddings": result.embeddings}

    # Phase 5.1: Health/Readiness/Liveness Endpoints
    health_service = HealthService(version="1.0.0") if HealthService else None

    @app.get("/health")
    def health():
        """Comprehensive health check with component validation"""
        if health_service:
            # Use Phase 5 comprehensive health check
            return health_service.check_health()
        
        # Fallback to original hybrid health check
        health_info = hybrid_config.get_health_info()
        embedding_config = hybrid_config.get_embedding_config()

        return {
            "status": "healthy",
            "service": "brAInwav Cortex-OS MLX",
            "company": hybrid_config.company,
            "hybrid_config": health_info,
            "embedding_config": embedding_config,
            "mlx_first_priority": hybrid_config.mlx_priority,
            "deployment_ready": health_info["status"] in ["healthy", "degraded"],
        }

    @app.get("/health/ready")
    def readiness():
        """Kubernetes readiness probe - service ready for traffic"""
        if not health_service:
            return {"status": "healthy", "ready": True, "message": "brAInwav: Health service not available"}
        
        readiness_result = health_service.check_readiness()
        
        # Return 503 if not ready
        if not readiness_result.get("ready", False):
            from fastapi import Response
            return Response(
                content=str(readiness_result),
                status_code=503,
                media_type="application/json"
            )
        
        return readiness_result

    @app.get("/health/live")
    def liveness():
        """Kubernetes liveness probe - service not deadlocked"""
        if not health_service:
            return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}
        
        return health_service.check_liveness()

    @app.get("/models")
    def models():
        """List available MLX models for hybrid routing"""
        return {
            "models": list(hybrid_config.required_models.keys()),
            "model_details": hybrid_config.required_models,
            "validation": hybrid_config.validate_models(),
        }

    @app.post("/embed/multimodal", responses={422: {"model": ErrorResponse}})
    async def embed_multimodal(
        file: UploadFile = File(...),
        modality: str = Form(...),
        normalize: str = Form("true"),
    ):
        """
        Generate embeddings for multimodal content (images, audio, video).
        
        brAInwav Multimodal Embedding Endpoint - Phase 3.1.4
        """
        try:
            # Read file content
            content = await file.read()
            
            # Validate modality
            from multimodal.types import Modality
            
            try:
                mod = Modality[modality.upper()]
            except KeyError:
                return _validation_error(
                    f"brAInwav: Invalid modality '{modality}'. "
                    f"Must be one of: TEXT, IMAGE, AUDIO, VIDEO",
                    code="INVALID_MODALITY"
                )
            
            # Validate file
            from multimodal.validation import validate_multimodal_file, ValidationError
            
            try:
                validation_result = validate_multimodal_file(
                    content=content,
                    filename=file.filename or "upload",
                    modality=mod,
                )
            except ValidationError as e:
                return _validation_error(str(e), code="VALIDATION_ERROR")
            
            # Generate embedding based on modality
            import time
            start_time = time.time()
            
            if mod == Modality.IMAGE:
                from multimodal.clip_embedder import CLIPEmbedder, EmbeddingError
                
                try:
                    embedder = CLIPEmbedder()
                    should_normalize = normalize.lower() in ["true", "1", "yes"]
                    embedding = embedder.generate_image_embedding(
                        content, normalize=should_normalize
                    )
                except EmbeddingError as e:
                    return _validation_error(str(e), code="EMBEDDING_ERROR")
            else:
                # Audio/Video not yet implemented (Phase 3.1.5)
                return _validation_error(
                    f"brAInwav: {modality} embedding not yet implemented. "
                    "Currently only IMAGE is supported.",
                    code="NOT_IMPLEMENTED"
                )
            
            processing_time = time.time() - start_time
            
            # Publish A2A event
            import asyncio
            try:
                event = create_mlx_embedding_event(
                    request_id=f"multimodal_{int(time.time() * 1000)}",
                    text_count=1,
                    total_chars=len(content),
                    processing_time=processing_time,
                    model_used="clip-vit-base-patch32",
                    dimension=len(embedding),
                    success=True,
                )
                asyncio.create_task(a2a.publish(event))
            except Exception as e:
                logger.warning(f"Failed to publish A2A multimodal event: {e}")
            
            # Return response with brAInwav branding
            return {
                "embedding": embedding,
                "modality": modality.upper(),
                "mime_type": validation_result["mime_type"],
                "size": validation_result["size"],
                "processing_time_ms": int(processing_time * 1000),
                "message": f"brAInwav: {modality.upper()} embedding generated successfully",
            }
            
        except Exception as e:
            logger.exception("Multimodal embedding failed: %s", e)
            return JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": f"brAInwav: Multimodal embedding failed - {str(e)}",
                    }
                },
            )

    return app
