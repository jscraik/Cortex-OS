"""Cortex-py multimodal embedding service wrapper.

Bridges the Phase 3 backend service (apps/cortex-py/src/multimodal/embedding_service.py)
into the public cortex_py package without pulling heavy dependencies during import.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict

from multimodal.embedding_service import (
    EmbeddingError,
    EmbeddingRequest,
    EmbeddingResponse,
    MultimodalEmbeddingService as BackendEmbeddingService,
)
from multimodal.modalities import Modality


@dataclass(slots=True)
class MultimodalEmbeddingResult:
    """Structured result returned by the high-level wrapper."""

    embedding: list[float]
    modality: str
    model: str
    dimensions: int
    processing_time_ms: int
    metadata: Dict[str, Any]


class MultimodalEmbeddingService:
    """High-level wrapper that provides a cortex_py-friendly API."""

    def __init__(self, backend: BackendEmbeddingService | None = None) -> None:
        self._backend = backend or BackendEmbeddingService()

    @staticmethod
    def _resolve_modality(modality: str | Modality) -> Modality:
        if isinstance(modality, Modality):
            return modality
        if not isinstance(modality, str) or not modality.strip():
            raise EmbeddingError("Invalid modality value", "VALIDATION_ERROR")
        try:
            return Modality[modality.strip().upper()]
        except KeyError as exc:
            raise EmbeddingError(
                f"Unsupported modality '{modality}'",
                "VALIDATION_ERROR",
            ) from exc

    @staticmethod
    def _filename_from_metadata(metadata: Dict[str, Any] | None, modality: Modality) -> str:
        if metadata is None:
            return f"upload.{modality.value.lower()}"
        name = metadata.get("filename")
        if isinstance(name, str) and name.strip():
            return name
        content_type = metadata.get("content_type")
        if isinstance(content_type, str) and content_type.strip():
            extension = content_type.split("/")[-1]
            return f"upload.{extension}"
        return f"upload.{modality.value.lower()}"

    @staticmethod
    def _coerce_timeout(timeout_ms: int | float | None) -> int | None:
        if timeout_ms is None:
            return None
        if isinstance(timeout_ms, (int, float)) and timeout_ms > 0:
            return int(timeout_ms)
        raise EmbeddingError("Timeout must be positive", "VALIDATION_ERROR")

    async def embed(
        self,
        data: Any,
        *,
        modality: str | Modality,
        metadata: Dict[str, Any] | None = None,
        timeout_ms: int | float | None = None,
        normalize: bool = True,
    ) -> MultimodalEmbeddingResult:
        resolved_modality = self._resolve_modality(modality)
        timeout = self._coerce_timeout(timeout_ms)
        request = EmbeddingRequest(
            data=data,
            modality=resolved_modality,
            filename=self._filename_from_metadata(metadata, resolved_modality),
            timeout=timeout,
            normalize=normalize,
        )
        response = await self._backend.embed_multimodal(request)
        return self._to_result(response)

    @staticmethod
    def _to_result(response: EmbeddingResponse) -> MultimodalEmbeddingResult:
        return MultimodalEmbeddingResult(
            embedding=list(response.embedding),
            modality=response.modality.value.lower(),
            model=response.model,
            dimensions=response.dimensions,
            processing_time_ms=response.processing_time,
            metadata=response.metadata,
        )

    async def is_available(self) -> bool:
        return await self._backend.is_available()

    async def get_supported_modalities(self) -> list[str]:
        return await self._backend.get_supported_modalities()

    async def get_model_info(self, model_name: str | None = None) -> Dict[str, Any]:
        return await self._backend.get_model_info(model_name)


__all__ = [
    "EmbeddingError",
    "MultimodalEmbeddingResult",
    "MultimodalEmbeddingService",
]
