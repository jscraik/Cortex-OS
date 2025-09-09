"""Document-related schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class DocumentCreate(BaseModel):
    """Document creation schema."""

    path: str = Field(..., description="Document path", min_length=1, max_length=500)
    title: str = Field(..., description="Document title", min_length=1, max_length=500)
    content: str = Field(..., description="Document content")
    category: str | None = Field(None, description="Document category", max_length=100)
    tags: list[str] | None = Field(None, description="Document tags")
    authors: list[str] | None = Field(None, description="Document authors")
    description: str | None = Field(
        None, description="Document description", max_length=1000
    )
    keywords: list[str] | None = Field(None, description="Document keywords")
    version: str | None = Field("1.0.0", description="Document version")
    status: str | None = Field("draft", description="Document status")
    featured: bool | None = Field(False, description="Featured content flag")

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: list[str] | None) -> list[str] | None:
        if v and len(v) > 20:
            raise ValueError("Maximum 20 tags allowed")
        return v

    @field_validator("authors")
    @classmethod
    def validate_authors(cls, v: list[str] | None) -> list[str] | None:
        if v and len(v) > 10:
            raise ValueError("Maximum 10 authors allowed")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed_statuses = {"draft", "review", "published", "archived", "deprecated"}
        if v not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
        return v


class DocumentUpdate(BaseModel):
    """Document update schema."""

    title: str | None = Field(
        None, description="Document title", min_length=1, max_length=500
    )
    content: str | None = Field(None, description="Document content")
    category: str | None = Field(None, description="Document category", max_length=100)
    tags: list[str] | None = Field(None, description="Document tags")
    authors: list[str] | None = Field(None, description="Document authors")
    description: str | None = Field(
        None, description="Document description", max_length=1000
    )
    keywords: list[str] | None = Field(None, description="Document keywords")
    version: str | None = Field(None, description="Document version")
    status: str | None = Field(None, description="Document status")
    featured: bool | None = Field(None, description="Featured content flag")

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: list[str] | None) -> list[str] | None:
        if v and len(v) > 20:
            raise ValueError("Maximum 20 tags allowed")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        if v:
            allowed_statuses = {
                "draft",
                "review",
                "published",
                "archived",
                "deprecated",
            }
            if v not in allowed_statuses:
                raise ValueError(
                    f"Status must be one of: {', '.join(allowed_statuses)}"
                )
        return v


class DocumentResponse(BaseModel):
    """Document response schema."""

    id: str = Field(..., description="Document ID")
    path: str = Field(..., description="Document path")
    title: str = Field(..., description="Document title")
    content: str = Field(..., description="Document content")
    content_hash: str = Field(..., description="Content hash for change detection")
    file_size: int = Field(..., description="File size in bytes")
    word_count: int = Field(..., description="Word count")
    reading_time_minutes: int = Field(..., description="Estimated reading time")
    category: str | None = Field(None, description="Document category")
    tags: list[str] | None = Field(None, description="Document tags")
    authors: list[str] | None = Field(None, description="Document authors")
    description: str | None = Field(None, description="Document description")
    keywords: list[str] | None = Field(None, description="Document keywords")
    version: str = Field(..., description="Document version")
    git_commit: str | None = Field(None, description="Git commit hash")
    status: str = Field(..., description="Document status")
    quality_score: float | None = Field(None, description="Quality score (0-1)")
    accessibility_score: float | None = Field(
        None, description="Accessibility score (0-1)"
    )
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    published_at: datetime | None = Field(None, description="Publication timestamp")
    indexed_at: datetime | None = Field(None, description="Last indexing timestamp")
    view_count: int = Field(..., description="View count")
    search_count: int = Field(..., description="Search result count")
    bookmark_count: int = Field(..., description="Bookmark count")
    slug: str | None = Field(None, description="URL slug")
    meta_description: str | None = Field(None, description="Meta description for SEO")
    featured: bool = Field(..., description="Featured content flag")

    class Config:
        from_attributes = True


class DocumentSummary(BaseModel):
    """Document summary schema for listings."""

    id: str = Field(..., description="Document ID")
    path: str = Field(..., description="Document path")
    title: str = Field(..., description="Document title")
    description: str | None = Field(None, description="Document description")
    category: str | None = Field(None, description="Document category")
    tags: list[str] | None = Field(None, description="Document tags")
    authors: list[str] | None = Field(None, description="Document authors")
    word_count: int = Field(..., description="Word count")
    reading_time_minutes: int = Field(..., description="Estimated reading time")
    quality_score: float | None = Field(None, description="Quality score")
    status: str = Field(..., description="Document status")
    updated_at: datetime = Field(..., description="Last update timestamp")
    view_count: int = Field(..., description="View count")
    featured: bool = Field(..., description="Featured content flag")


class DocumentListResponse(BaseModel):
    """Document list response schema."""

    documents: list[DocumentSummary] = Field(..., description="List of documents")
    total: int = Field(..., description="Total number of documents")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")
    filters_applied: dict[str, Any] | None = Field(None, description="Applied filters")
