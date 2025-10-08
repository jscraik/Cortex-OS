from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class EmbeddingToolInput(BaseModel):
    """Schema for single embedding tool input."""

    text: str = Field(..., description="Input text to embed", min_length=1)
    normalize: bool = Field(default=True, description="Normalize resulting vector")
    seed: int | None = Field(
        default=None,
        ge=1,
        description="Optional deterministic seed for FastMCP clients",
    )

    @field_validator("text")
    @classmethod
    def _sanitize_text(cls, value: str) -> str:
        sanitized = value.strip()
        if not sanitized:
            raise ValueError("text must not be empty")
        return sanitized


class BatchEmbeddingToolInput(BaseModel):
    """Schema for batch embedding tool input."""

    texts: list[str] = Field(..., description="Texts to embed")
    normalize: bool = Field(default=True, description="Normalize vectors where supported")
    seed: int | None = Field(
        default=None,
        ge=1,
        description="Optional deterministic seed for FastMCP clients",
    )

    @field_validator("texts")
    @classmethod
    def _validate_texts(cls, values: list[str]) -> list[str]:
        if not values:
            raise ValueError("texts must contain at least one item")
        sanitized: list[str] = []
        for idx, item in enumerate(values):
            if not isinstance(item, str):
                raise ValueError(f"texts[{idx}] must be a string")
            trimmed = item.strip()
            if not trimmed:
                raise ValueError("each text must be non-empty")
            sanitized.append(trimmed)
        return sanitized


class EmbeddingMetadata(BaseModel):
    model_name: str | None = Field(None, description="Underlying model name")
    dimensions: int | None = Field(None, description="Embedding dimensionality")
    backend: str | None = Field(None, description="Backend used for generation")
    cached: bool = Field(False, description="Whether the result came from cache")
    source: Literal["cache", "generator", "mixed"] = Field(
        "generator", description="Result provenance"
    )
    generated_at: datetime = Field(description="UTC timestamp when embedding was produced")
    cache_metrics: dict[str, int] = Field(
        default_factory=dict, description="Cache and rate limit counters"
    )


class EmbeddingToolResponse(BaseModel):
    embedding: list[float]
    metadata: EmbeddingMetadata


class BatchEmbeddingMetadata(BaseModel):
    model_name: str | None = Field(None, description="Underlying model name")
    dimensions: int | None = Field(None, description="Embedding dimensionality")
    count: int = Field(..., description="Number of embeddings returned")
    cached_hits: int = Field(..., description="How many entries served from cache")
    backend: str | None = Field(None, description="Backend used for generation")
    source: Literal["cache", "generator", "mixed"] = Field(
        "generator", description="Result provenance"
    )
    generated_at: datetime = Field(description="UTC timestamp when embeddings were produced")
    cache_metrics: dict[str, int] = Field(
        default_factory=dict, description="Cache and rate limit counters"
    )


class BatchEmbeddingToolResponse(BaseModel):
    embeddings: list[list[float]]
    metadata: BatchEmbeddingMetadata


class ModelInfoResponse(BaseModel):
    model_name: str | None = None
    dimensions: int | None = None
    backend: str | None = None
    model_loaded: bool | None = None
    extras: dict[str, Any] = Field(default_factory=dict)


class HealthStatusResponse(BaseModel):
    status: str
    backends_available: dict[str, bool]
    rate_limit: int
    cache_size: int
    metrics: dict[str, int]


class ToolErrorResponse(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None


class ToolContract(BaseModel):
    name: str
    description: str
    input: dict[str, Any]
    output: dict[str, Any]
    error: dict[str, Any]


