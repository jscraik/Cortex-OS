"""Pydantic schemas for content-related requests and responses."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, validator


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

    @validator("tags")
    def validate_tags(self, v):
        if v and len(v) > 20:
            raise ValueError("Maximum 20 tags allowed")
        return v

    @validator("authors")
    def validate_authors(self, v):
        if v and len(v) > 10:
            raise ValueError("Maximum 10 authors allowed")
        return v

    @validator("status")
    def validate_status(self, v):
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

    @validator("tags")
    def validate_tags(self, v):
        if v and len(v) > 20:
            raise ValueError("Maximum 20 tags allowed")
        return v

    @validator("status")
    def validate_status(self, v):
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


class DocumentRelationCreate(BaseModel):
    """Document relation creation schema."""

    source_document_id: str = Field(..., description="Source document ID")
    target_document_id: str = Field(..., description="Target document ID")
    relation_type: str = Field(..., description="Relation type")
    weight: float | None = Field(1.0, description="Relation weight", ge=0.0, le=1.0)
    context: str | None = Field(None, description="Relation context", max_length=1000)

    @validator("relation_type")
    def validate_relation_type(self, v):
        allowed_types = {
            "link",
            "reference",
            "dependency",
            "prerequisite",
            "follow_up",
            "related",
            "alternative",
            "supersedes",
            "deprecated_by",
        }
        if v not in allowed_types:
            raise ValueError(
                f"Relation type must be one of: {', '.join(allowed_types)}"
            )
        return v


class DocumentRelationResponse(BaseModel):
    """Document relation response schema."""

    id: int = Field(..., description="Relation ID")
    source_document_id: str = Field(..., description="Source document ID")
    target_document_id: str = Field(..., description="Target document ID")
    relation_type: str = Field(..., description="Relation type")
    weight: float = Field(..., description="Relation weight")
    context: str | None = Field(None, description="Relation context")
    created_at: datetime = Field(..., description="Creation timestamp")

    class Config:
        from_attributes = True


class ContentIndexCreate(BaseModel):
    """Content index creation schema."""

    document_id: str = Field(..., description="Document ID")
    index_type: str = Field(..., description="Index type")
    index_data: dict[str, Any] = Field(..., description="Index data")
    vector_embedding: list[float] | None = Field(None, description="Vector embedding")

    @validator("index_type")
    def validate_index_type(self, v):
        allowed_types = {"elasticsearch", "vector", "semantic", "graph", "full_text"}
        if v not in allowed_types:
            raise ValueError(f"Index type must be one of: {', '.join(allowed_types)}")
        return v

    @validator("vector_embedding")
    def validate_vector_embedding(self, v):
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


class ContentValidationRequest(BaseModel):
    """Content validation request schema."""

    content: str = Field(..., description="Content to validate")
    content_type: str = Field("markdown", description="Content type")
    validation_rules: list[str] | None = Field(
        None, description="Specific validation rules to apply"
    )

    @validator("content_type")
    def validate_content_type(self, v):
        allowed_types = {"markdown", "html", "rst", "plain_text", "asciidoc"}
        if v not in allowed_types:
            raise ValueError(f"Content type must be one of: {', '.join(allowed_types)}")
        return v


class ValidationIssue(BaseModel):
    """Content validation issue schema."""

    type: str = Field(..., description="Issue type")
    severity: str = Field(..., description="Issue severity")
    message: str = Field(..., description="Issue description")
    line_number: int | None = Field(None, description="Line number where issue occurs")
    column: int | None = Field(None, description="Column where issue occurs")
    suggestion: str | None = Field(None, description="Suggested fix")

    @validator("severity")
    def validate_severity(self, v):
        allowed_severities = {"info", "warning", "error", "critical"}
        if v not in allowed_severities:
            raise ValueError(
                f"Severity must be one of: {', '.join(allowed_severities)}"
            )
        return v


class ContentValidationResponse(BaseModel):
    """Content validation response schema."""

    valid: bool = Field(..., description="Whether content is valid")
    issues: list[ValidationIssue] = Field(..., description="Validation issues")
    word_count: int = Field(..., description="Word count")
    reading_time_minutes: int = Field(..., description="Estimated reading time")
    quality_score: float = Field(..., description="Content quality score")
    accessibility_score: float = Field(..., description="Accessibility score")
    suggestions: list[str] = Field(..., description="Improvement suggestions")
    validated_at: datetime = Field(..., description="Validation timestamp")


class ContentTransformRequest(BaseModel):
    """Content transformation request schema."""

    content: str = Field(..., description="Content to transform")
    source_format: str = Field(..., description="Source format")
    target_format: str = Field(..., description="Target format")
    options: dict[str, Any] | None = Field(None, description="Transformation options")

    @validator("source_format", "target_format")
    def validate_formats(self, v):
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

    @validator("operation")
    def validate_operation(self, v):
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

    @validator("document_ids")
    def validate_document_ids(self, v):
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

    @validator("status")
    def validate_status(self, v):
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
