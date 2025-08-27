"""Pydantic schemas for content-related requests and responses."""

from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator, HttpUrl


class DocumentCreate(BaseModel):
    """Document creation schema."""
    path: str = Field(..., description="Document path", min_length=1, max_length=500)
    title: str = Field(..., description="Document title", min_length=1, max_length=500)
    content: str = Field(..., description="Document content")
    category: Optional[str] = Field(None, description="Document category", max_length=100)
    tags: Optional[List[str]] = Field(None, description="Document tags")
    authors: Optional[List[str]] = Field(None, description="Document authors")
    description: Optional[str] = Field(None, description="Document description", max_length=1000)
    keywords: Optional[List[str]] = Field(None, description="Document keywords")
    version: Optional[str] = Field("1.0.0", description="Document version")
    status: Optional[str] = Field("draft", description="Document status")
    featured: Optional[bool] = Field(False, description="Featured content flag")
    
    @validator('tags')
    def validate_tags(cls, v):
        if v and len(v) > 20:
            raise ValueError('Maximum 20 tags allowed')
        return v
    
    @validator('authors')
    def validate_authors(cls, v):
        if v and len(v) > 10:
            raise ValueError('Maximum 10 authors allowed')
        return v
    
    @validator('status')
    def validate_status(cls, v):
        allowed_statuses = {'draft', 'review', 'published', 'archived', 'deprecated'}
        if v not in allowed_statuses:
            raise ValueError(f'Status must be one of: {", ".join(allowed_statuses)}')
        return v


class DocumentUpdate(BaseModel):
    """Document update schema."""
    title: Optional[str] = Field(None, description="Document title", min_length=1, max_length=500)
    content: Optional[str] = Field(None, description="Document content")
    category: Optional[str] = Field(None, description="Document category", max_length=100)
    tags: Optional[List[str]] = Field(None, description="Document tags")
    authors: Optional[List[str]] = Field(None, description="Document authors")
    description: Optional[str] = Field(None, description="Document description", max_length=1000)
    keywords: Optional[List[str]] = Field(None, description="Document keywords")
    version: Optional[str] = Field(None, description="Document version")
    status: Optional[str] = Field(None, description="Document status")
    featured: Optional[bool] = Field(None, description="Featured content flag")
    
    @validator('tags')
    def validate_tags(cls, v):
        if v and len(v) > 20:
            raise ValueError('Maximum 20 tags allowed')
        return v
    
    @validator('status')
    def validate_status(cls, v):
        if v:
            allowed_statuses = {'draft', 'review', 'published', 'archived', 'deprecated'}
            if v not in allowed_statuses:
                raise ValueError(f'Status must be one of: {", ".join(allowed_statuses)}')
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
    category: Optional[str] = Field(None, description="Document category")
    tags: Optional[List[str]] = Field(None, description="Document tags")
    authors: Optional[List[str]] = Field(None, description="Document authors")
    description: Optional[str] = Field(None, description="Document description")
    keywords: Optional[List[str]] = Field(None, description="Document keywords")
    version: str = Field(..., description="Document version")
    git_commit: Optional[str] = Field(None, description="Git commit hash")
    status: str = Field(..., description="Document status")
    quality_score: Optional[float] = Field(None, description="Quality score (0-1)")
    accessibility_score: Optional[float] = Field(None, description="Accessibility score (0-1)")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    published_at: Optional[datetime] = Field(None, description="Publication timestamp")
    indexed_at: Optional[datetime] = Field(None, description="Last indexing timestamp")
    view_count: int = Field(..., description="View count")
    search_count: int = Field(..., description="Search result count")
    bookmark_count: int = Field(..., description="Bookmark count")
    slug: Optional[str] = Field(None, description="URL slug")
    meta_description: Optional[str] = Field(None, description="Meta description for SEO")
    featured: bool = Field(..., description="Featured content flag")
    
    class Config:
        from_attributes = True


class DocumentSummary(BaseModel):
    """Document summary schema for listings."""
    id: str = Field(..., description="Document ID")
    path: str = Field(..., description="Document path")
    title: str = Field(..., description="Document title")
    description: Optional[str] = Field(None, description="Document description")
    category: Optional[str] = Field(None, description="Document category")
    tags: Optional[List[str]] = Field(None, description="Document tags")
    authors: Optional[List[str]] = Field(None, description="Document authors")
    word_count: int = Field(..., description="Word count")
    reading_time_minutes: int = Field(..., description="Estimated reading time")
    quality_score: Optional[float] = Field(None, description="Quality score")
    status: str = Field(..., description="Document status")
    updated_at: datetime = Field(..., description="Last update timestamp")
    view_count: int = Field(..., description="View count")
    featured: bool = Field(..., description="Featured content flag")


class DocumentListResponse(BaseModel):
    """Document list response schema."""
    documents: List[DocumentSummary] = Field(..., description="List of documents")
    total: int = Field(..., description="Total number of documents")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")
    filters_applied: Optional[Dict[str, Any]] = Field(None, description="Applied filters")


class DocumentRelationCreate(BaseModel):
    """Document relation creation schema."""
    source_document_id: str = Field(..., description="Source document ID")
    target_document_id: str = Field(..., description="Target document ID")
    relation_type: str = Field(..., description="Relation type")
    weight: Optional[float] = Field(1.0, description="Relation weight", ge=0.0, le=1.0)
    context: Optional[str] = Field(None, description="Relation context", max_length=1000)
    
    @validator('relation_type')
    def validate_relation_type(cls, v):
        allowed_types = {
            'link', 'reference', 'dependency', 'prerequisite', 'follow_up',
            'related', 'alternative', 'supersedes', 'deprecated_by'
        }
        if v not in allowed_types:
            raise ValueError(f'Relation type must be one of: {", ".join(allowed_types)}')
        return v


class DocumentRelationResponse(BaseModel):
    """Document relation response schema."""
    id: int = Field(..., description="Relation ID")
    source_document_id: str = Field(..., description="Source document ID")
    target_document_id: str = Field(..., description="Target document ID")
    relation_type: str = Field(..., description="Relation type")
    weight: float = Field(..., description="Relation weight")
    context: Optional[str] = Field(None, description="Relation context")
    created_at: datetime = Field(..., description="Creation timestamp")
    
    class Config:
        from_attributes = True


class ContentIndexCreate(BaseModel):
    """Content index creation schema."""
    document_id: str = Field(..., description="Document ID")
    index_type: str = Field(..., description="Index type")
    index_data: Dict[str, Any] = Field(..., description="Index data")
    vector_embedding: Optional[List[float]] = Field(None, description="Vector embedding")
    
    @validator('index_type')
    def validate_index_type(cls, v):
        allowed_types = {'elasticsearch', 'vector', 'semantic', 'graph', 'full_text'}
        if v not in allowed_types:
            raise ValueError(f'Index type must be one of: {", ".join(allowed_types)}')
        return v
    
    @validator('vector_embedding')
    def validate_vector_embedding(cls, v):
        if v and len(v) > 2048:
            raise ValueError('Vector embedding must be 2048 dimensions or less')
        return v


class ContentIndexResponse(BaseModel):
    """Content index response schema."""
    id: int = Field(..., description="Index ID")
    document_id: str = Field(..., description="Document ID")
    index_type: str = Field(..., description="Index type")
    index_data: Dict[str, Any] = Field(..., description="Index data")
    vector_embedding: Optional[List[float]] = Field(None, description="Vector embedding")
    indexed_at: datetime = Field(..., description="Indexing timestamp")
    status: str = Field(..., description="Index status")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    retry_count: int = Field(..., description="Number of retry attempts")
    
    class Config:
        from_attributes = True


class ContentValidationRequest(BaseModel):
    """Content validation request schema."""
    content: str = Field(..., description="Content to validate")
    content_type: str = Field("markdown", description="Content type")
    validation_rules: Optional[List[str]] = Field(None, description="Specific validation rules to apply")
    
    @validator('content_type')
    def validate_content_type(cls, v):
        allowed_types = {'markdown', 'html', 'rst', 'plain_text', 'asciidoc'}
        if v not in allowed_types:
            raise ValueError(f'Content type must be one of: {", ".join(allowed_types)}')
        return v


class ValidationIssue(BaseModel):
    """Content validation issue schema."""
    type: str = Field(..., description="Issue type")
    severity: str = Field(..., description="Issue severity")
    message: str = Field(..., description="Issue description")
    line_number: Optional[int] = Field(None, description="Line number where issue occurs")
    column: Optional[int] = Field(None, description="Column where issue occurs")
    suggestion: Optional[str] = Field(None, description="Suggested fix")
    
    @validator('severity')
    def validate_severity(cls, v):
        allowed_severities = {'info', 'warning', 'error', 'critical'}
        if v not in allowed_severities:
            raise ValueError(f'Severity must be one of: {", ".join(allowed_severities)}')
        return v


class ContentValidationResponse(BaseModel):
    """Content validation response schema."""
    valid: bool = Field(..., description="Whether content is valid")
    issues: List[ValidationIssue] = Field(..., description="Validation issues")
    word_count: int = Field(..., description="Word count")
    reading_time_minutes: int = Field(..., description="Estimated reading time")
    quality_score: float = Field(..., description="Content quality score")
    accessibility_score: float = Field(..., description="Accessibility score")
    suggestions: List[str] = Field(..., description="Improvement suggestions")
    validated_at: datetime = Field(..., description="Validation timestamp")


class ContentTransformRequest(BaseModel):
    """Content transformation request schema."""
    content: str = Field(..., description="Content to transform")
    source_format: str = Field(..., description="Source format")
    target_format: str = Field(..., description="Target format")
    options: Optional[Dict[str, Any]] = Field(None, description="Transformation options")
    
    @validator('source_format', 'target_format')
    def validate_formats(cls, v):
        allowed_formats = {'markdown', 'html', 'rst', 'plain_text', 'asciidoc', 'pdf', 'docx'}
        if v not in allowed_formats:
            raise ValueError(f'Format must be one of: {", ".join(allowed_formats)}')
        return v


class ContentTransformResponse(BaseModel):
    """Content transformation response schema."""
    transformed_content: str = Field(..., description="Transformed content")
    source_format: str = Field(..., description="Source format")
    target_format: str = Field(..., description="Target format")
    transformation_log: List[str] = Field(..., description="Transformation log messages")
    warnings: List[str] = Field(..., description="Transformation warnings")
    transformed_at: datetime = Field(..., description="Transformation timestamp")


class ContentMetricsResponse(BaseModel):
    """Content metrics response schema."""
    total_documents: int = Field(..., description="Total number of documents")
    published_documents: int = Field(..., description="Published documents")
    draft_documents: int = Field(..., description="Draft documents")
    total_words: int = Field(..., description="Total word count across all documents")
    avg_quality_score: float = Field(..., description="Average quality score")
    avg_accessibility_score: float = Field(..., description="Average accessibility score")
    categories: Dict[str, int] = Field(..., description="Document count by category")
    authors: Dict[str, int] = Field(..., description="Document count by author")
    tags: Dict[str, int] = Field(..., description="Document count by tag")
    recent_updates: List[DocumentSummary] = Field(..., description="Recently updated documents")
    generated_at: datetime = Field(..., description="Metrics generation timestamp")


class BulkContentOperation(BaseModel):
    """Bulk content operation schema."""
    operation: str = Field(..., description="Operation type")
    document_ids: List[str] = Field(..., description="List of document IDs")
    data: Optional[Dict[str, Any]] = Field(None, description="Operation data")
    options: Optional[Dict[str, Any]] = Field(None, description="Operation options")
    
    @validator('operation')
    def validate_operation(cls, v):
        allowed_operations = {
            'publish', 'unpublish', 'archive', 'delete', 'reindex',
            'update_category', 'update_tags', 'update_authors', 'validate'
        }
        if v not in allowed_operations:
            raise ValueError(f'Operation must be one of: {", ".join(allowed_operations)}')
        return v
    
    @validator('document_ids')
    def validate_document_ids(cls, v):
        if len(v) > 1000:
            raise ValueError('Maximum 1000 documents per bulk operation')
        return v


class BulkContentOperationResponse(BaseModel):
    """Bulk content operation response schema."""
    operation: str = Field(..., description="Operation type")
    total_documents: int = Field(..., description="Total documents in operation")
    successful: int = Field(..., description="Successfully processed documents")
    failed: int = Field(..., description="Failed documents")
    skipped: int = Field(..., description="Skipped documents")
    errors: List[Dict[str, str]] = Field(..., description="Error details")
    warnings: List[Dict[str, str]] = Field(..., description="Warning details")
    processed_at: datetime = Field(..., description="Processing timestamp")
    estimated_completion: Optional[datetime] = Field(None, description="Estimated completion time")


class ContentDiff(BaseModel):
    """Content difference schema."""
    document_id: str = Field(..., description="Document ID")
    old_version: str = Field(..., description="Old version identifier")
    new_version: str = Field(..., description="New version identifier")
    changes: List[Dict[str, Any]] = Field(..., description="List of changes")
    added_lines: int = Field(..., description="Number of added lines")
    removed_lines: int = Field(..., description="Number of removed lines")
    modified_lines: int = Field(..., description="Number of modified lines")
    similarity_score: float = Field(..., description="Content similarity score (0-1)")
    generated_at: datetime = Field(..., description="Diff generation timestamp")


class ContentWorkflow(BaseModel):
    """Content workflow schema."""
    id: str = Field(..., description="Workflow ID")
    name: str = Field(..., description="Workflow name")
    description: Optional[str] = Field(None, description="Workflow description")
    steps: List[Dict[str, Any]] = Field(..., description="Workflow steps")
    current_step: Optional[str] = Field(None, description="Current step")
    status: str = Field(..., description="Workflow status")
    assignee: Optional[str] = Field(None, description="Current assignee")
    due_date: Optional[datetime] = Field(None, description="Workflow due date")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    @validator('status')
    def validate_status(cls, v):
        allowed_statuses = {'pending', 'in_progress', 'review', 'approved', 'rejected', 'completed'}
        if v not in allowed_statuses:
            raise ValueError(f'Status must be one of: {", ".join(allowed_statuses)}')
        return v