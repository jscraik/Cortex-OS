"""Content indexing schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class ContentIndexCreate(BaseModel):
    """Content index creation schema."""

    document_id: str = Field(..., description="Document ID")
    index_type: str = Field(..., description="Index type")
    index_data: dict[str, Any] = Field(..., description="Index data")
    vector_embedding: list[float] | None = Field(None, description="Vector embedding")

    @field_validator("index_type")
    @classmethod
    def validate_index_type(cls, v: str) -> str:
        allowed_types = {"elasticsearch", "vector", "semantic", "graph", "full_text"}
        if v not in allowed_types:
            raise ValueError(f"Index type must be one of: {', '.join(allowed_types)}")
        return v

    @field_validator("vector_embedding")
    @classmethod
    def validate_vector_embedding(cls, v: list[float] | None) -> list[float] | None:
        if v and len(v) > 2048:
            raise ValueError("Vector embedding must be 2048 dimensions or less")
        return v


class ContentIndexResponse(BaseModel):
    """Content index response schema."""

    id: int = Field(..., description="Index ID")
    document_id: str = Field(..., description="Document ID")
    index_type: str = Field(..., description="Index type")
    index_data: dict[str, Any] = Field(..., description="Index data")
    vector_embedding: list[float] | None = Field(None, description="Vector embedding")
    indexed_at: datetime = Field(..., description="Indexing timestamp")
    status: str = Field(..., description="Index status")
    error_message: str | None = Field(None, description="Error message if failed")
    retry_count: int = Field(..., description="Number of retry attempts")

    class Config:
        from_attributes = True

