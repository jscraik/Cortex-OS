from __future__ import annotations

import logging
from typing import Any

from pydantic import ValidationError

from cortex_py.services import (
    EmbeddingService,
    RateLimitExceeded,
    SecurityViolation,
    ServiceError,
    ServiceValidationError,
)

from .models import (
    BatchEmbeddingMetadata,
    BatchEmbeddingToolInput,
    BatchEmbeddingToolResponse,
    EmbeddingMetadata,
    EmbeddingToolInput,
    EmbeddingToolResponse,
    HealthStatusResponse,
    ModelInfoResponse,
    ToolErrorResponse,
)

LOGGER = logging.getLogger(__name__)


ERROR_DESCRIPTIONS: dict[str, str] = {
    "VALIDATION_ERROR": "Input failed validation checks.",
    "SECURITY_VIOLATION": "Input failed security policy checks.",
    "RATE_LIMITED": "Too many requests were received in the configured time window.",
    "INTERNAL_ERROR": "Unexpected server failure while generating embeddings.",
}


class CortexPyMCPTools:
    """Collection of MCP-ready tool handlers backed by :class:`EmbeddingService`."""

    def __init__(self, service: EmbeddingService, *, logger: logging.Logger | None = None) -> None:
        self.service = service
        self.logger = logger or LOGGER

    async def embedding_generate(
        self,
        *,
        text: str,
        normalize: bool = True,
        seed: int | None = None,
    ) -> EmbeddingToolResponse | ToolErrorResponse:
        try:
            payload = EmbeddingToolInput(text=text, normalize=normalize, seed=seed)
        except ValidationError as exc:
            return self._error("VALIDATION_ERROR", "Invalid payload", details={"errors": exc.errors()})

        try:
            result = self.service.generate_single(
                payload.text,
                normalize=payload.normalize,
                seed=payload.seed,
            )
        except ServiceValidationError as exc:
            return self._error("VALIDATION_ERROR", str(exc))
        except SecurityViolation as exc:
            return self._error("SECURITY_VIOLATION", str(exc))
        except RateLimitExceeded as exc:
            return self._error("RATE_LIMITED", str(exc))
        except ServiceError as exc:
            self.logger.exception("embedding.generate failed: %s", exc)
            return self._error("INTERNAL_ERROR", str(exc))

        metadata = result.metadata
        response = EmbeddingToolResponse(
            embedding=result.embedding,
            metadata=EmbeddingMetadata(
                model_name=metadata.get("model_name"),
                dimensions=metadata.get("dimensions"),
                backend=metadata.get("backend"),
                cached=result.cached,
                source=metadata.get("source", "generator"),
                generated_at=metadata.get("generated_at"),
                cache_metrics=metadata.get("metrics", {}),
            ),
        )
        return response

    async def embedding_batch(
        self, *, texts: list[str], normalize: bool = True
    ) -> BatchEmbeddingToolResponse | ToolErrorResponse:
        try:
            payload = BatchEmbeddingToolInput(texts=texts, normalize=normalize)
        except ValidationError as exc:
            return self._error("VALIDATION_ERROR", "Invalid payload", details={"errors": exc.errors()})

        try:
            result = self.service.generate_batch(payload.texts, normalize=payload.normalize)
        except ServiceValidationError as exc:
            return self._error("VALIDATION_ERROR", str(exc))
        except SecurityViolation as exc:
            return self._error("SECURITY_VIOLATION", str(exc))
        except RateLimitExceeded as exc:
            return self._error("RATE_LIMITED", str(exc))
        except ServiceError as exc:
            self.logger.exception("embedding.batch failed: %s", exc)
            return self._error("INTERNAL_ERROR", str(exc))

        metadata = result.metadata
        response = BatchEmbeddingToolResponse(
            embeddings=result.embeddings,
            metadata=BatchEmbeddingMetadata(
                model_name=metadata.get("model_name"),
                dimensions=metadata.get("dimensions"),
                backend=metadata.get("backend"),
                count=metadata.get("count", len(result.embeddings)),
                cached_hits=result.cached_hits,
                source=metadata.get("source", "generator"),
                generated_at=metadata.get("generated_at"),
                cache_metrics=metadata.get("metrics", {}),
            ),
        )
        return response

    async def model_info(self) -> ModelInfoResponse:
        info = self.service.get_model_info()
        extras = {k: v for k, v in info.items() if k not in {"model_name", "dimensions", "backend", "model_loaded"}}
        return ModelInfoResponse(
            model_name=info.get("model_name"),
            dimensions=info.get("dimensions"),
            backend=info.get("backend"),
            model_loaded=info.get("model_loaded"),
            extras=extras,
        )

    async def health(self) -> HealthStatusResponse:
        status = self.service.health_status()
        return HealthStatusResponse(**status)

    def _error(self, code: str, message: str, *, details: dict[str, Any] | None = None) -> ToolErrorResponse:
        full_message = message
        description = ERROR_DESCRIPTIONS.get(code)
        if description and description not in full_message:
            full_message = f"{message} ({description})"
        return ToolErrorResponse(code=code, message=full_message, details=details)


TOOL_SUMMARY = {
    "embedding.generate": {
        "description": "Generate a single embedding vector for the provided text.",
        "error_codes": ERROR_DESCRIPTIONS,
    },
    "embedding.batch": {
        "description": "Generate embeddings for a batch of texts with caching support.",
        "error_codes": ERROR_DESCRIPTIONS,
    },
    "model.info": {
        "description": "Return metadata about the active embedding model.",
        "error_codes": {},
    },
    "health.status": {
        "description": "Report health, cache, and rate limit information for cortex-py.",
        "error_codes": {},
    },
}


