"""Multimodal embedding capabilities for Cortex-Py."""

from .modalities import Modality, get_allowed_formats_for_modality, get_max_size_for_modality
from .validation import (
    ValidationError,
    ValidationResult,
    validate_file_extension,
    validate_file_size,
    validate_mime_type_matches_modality,
    validate_multimodal_file,
)
from .embedding_service import (
    BaseEmbeddingModel,
    EmbeddingError,
    EmbeddingRequest,
    EmbeddingResponse,
    MultimodalEmbeddingService,
)

__all__ = [
    # Core types and enums
    "Modality",
    # Validation
    "ValidationError",
    "ValidationResult",
    "validate_file_extension",
    "validate_file_size",
    "validate_mime_type_matches_modality",
    "validate_multimodal_file",
    # Accessory functions
    "get_allowed_formats_for_modality",
    "get_max_size_for_modality",
    # Embedding service
    "BaseEmbeddingModel",
    "EmbeddingError",
    "EmbeddingRequest",
    "EmbeddingResponse",
    "MultimodalEmbeddingService",
]