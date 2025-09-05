"""Misc content operation schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from .documents import DocumentSummary


class ContentTransformRequest(BaseModel):
    """Content transformation request schema."""

    content: str = Field(..., description="Content to transform")
    source_format: str = Field(..., description="Source format")
    target_format: str = Field(..., description="Target format")
    options: dict[str, Any] | None = Field(None, description="Transformation options")

    @field_validator("source_format", "target_format")
    @classmethod
    def validate_formats(cls, v: str) -> str:
        allowed_formats = {
            "markdown",
            "html",
            "rst",
            "plain_text",
            "asciidoc",
            "pdf",
            "docx",
        }
        if v not in allowed_formats:
            raise ValueError(f"Format must be one of: {', '.join(allowed_formats)}")
        return v


class ContentTransformResponse(BaseModel):
    """Content transformation response schema."""

    transformed_content: str = Field(..., description="Transformed content")
    source_format: str = Field(..., description="Source format")
    target_format: str = Field(..., description="Target format")
    transformation_log: list[str] = Field(
        ..., description="Transformation log messages"
    )
    warnings: list[str] = Field(..., description="Transformation warnings")
    transformed_at: datetime = Field(..., description="Transformation timestamp")


class ContentMetricsResponse(BaseModel):
    """Content metrics response schema."""

    total_documents: int = Field(..., description="Total number of documents")
    published_documents: int = Field(..., description="Published documents")
    draft_documents: int = Field(..., description="Draft documents")
    total_words: int = Field(..., description="Total word count across all documents")
    avg_quality_score: float = Field(..., description="Average quality score")
    avg_accessibility_score: float = Field(
        ..., description="Average accessibility score"
    )
    categories: dict[str, int] = Field(..., description="Document count by category")
    authors: dict[str, int] = Field(..., description="Document count by author")
    tags: dict[str, int] = Field(..., description="Document count by tag")
    recent_updates: list[DocumentSummary] = Field(
        ..., description="Recently updated documents"
    )
    generated_at: datetime = Field(..., description="Metrics generation timestamp")


class BulkContentOperation(BaseModel):
    """Bulk content operation schema."""

    operation: str = Field(..., description="Operation type")
    document_ids: list[str] = Field(..., description="List of document IDs")
    data: dict[str, Any] | None = Field(None, description="Operation data")
    options: dict[str, Any] | None = Field(None, description="Operation options")

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, v: str) -> str:
        allowed_operations = {
            "publish",
            "unpublish",
            "archive",
            "delete",
            "reindex",
            "update_category",
            "update_tags",
            "update_authors",
            "validate",
        }
        if v not in allowed_operations:
            raise ValueError(
                f"Operation must be one of: {', '.join(allowed_operations)}"
            )
        return v

    @field_validator("document_ids")
    @classmethod
    def validate_document_ids(cls, v: list[str]) -> list[str]:
        if len(v) > 1000:
            raise ValueError("Maximum 1000 documents per bulk operation")
        return v


class BulkContentOperationResponse(BaseModel):
    """Bulk content operation response schema."""

    operation: str = Field(..., description="Operation type")
    total_documents: int = Field(..., description="Total documents in operation")
    successful: int = Field(..., description="Successfully processed documents")
    failed: int = Field(..., description="Failed documents")
    skipped: int = Field(..., description="Skipped documents")
    errors: list[dict[str, str]] = Field(..., description="Error details")
    warnings: list[dict[str, str]] = Field(..., description="Warning details")
    processed_at: datetime = Field(..., description="Processing timestamp")
    estimated_completion: datetime | None = Field(
        None, description="Estimated completion time"
    )


class ContentDiff(BaseModel):
    """Content difference schema."""

    document_id: str = Field(..., description="Document ID")
    old_version: str = Field(..., description="Old version identifier")
    new_version: str = Field(..., description="New version identifier")
    changes: list[dict[str, Any]] = Field(..., description="List of changes")
    added_lines: int = Field(..., description="Number of added lines")
    removed_lines: int = Field(..., description="Number of removed lines")
    modified_lines: int = Field(..., description="Number of modified lines")
    similarity_score: float = Field(..., description="Content similarity score (0-1)")
    generated_at: datetime = Field(..., description="Diff generation timestamp")


class ContentWorkflow(BaseModel):
    """Content workflow schema."""

    id: str = Field(..., description="Workflow ID")
    name: str = Field(..., description="Workflow name")
    description: str | None = Field(None, description="Workflow description")
    steps: list[dict[str, Any]] = Field(..., description="Workflow steps")
    current_step: str | None = Field(None, description="Current step")
    status: str = Field(..., description="Workflow status")
    assignee: str | None = Field(None, description="Current assignee")
    due_date: datetime | None = Field(None, description="Workflow due date")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed_statuses = {
            "pending",
            "in_progress",
            "review",
            "approved",
            "rejected",
            "completed",
        }
        if v not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
        return v

