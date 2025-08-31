"""Pydantic schemas for search-related requests and responses."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    """Search request schema."""

    query: str = Field(
        ..., description="Search query string", min_length=1, max_length=1000
    )
    category: list[str] | None = Field(None, description="Filter by categories")
    tags: list[str] | None = Field(None, description="Filter by tags")
    authors: list[str] | None = Field(None, description="Filter by authors")
    status: list[str] | None = Field(None, description="Filter by status")
    word_count_min: int | None = Field(None, description="Minimum word count", ge=0)
    word_count_max: int | None = Field(
        None, description="Maximum word count", le=50000
    )
    quality_score_min: float | None = Field(
        None, description="Minimum quality score", ge=0.0, le=1.0
    )
    featured_only: bool | None = Field(
        False, description="Show only featured content"
    )
    facets: list[str] | None = Field(
        None, description="Facets to include in response"
    )
    sort_by: str | None = Field("relevance", description="Sort criteria")
    page: int = Field(1, description="Page number", ge=1)
    page_size: int = Field(20, description="Items per page", ge=1, le=100)


class SearchDocument(BaseModel):
    """Search result document schema."""

    id: str = Field(..., description="Document ID")
    path: str = Field(..., description="Document path")
    title: str = Field(..., description="Document title")
    description: str | None = Field(None, description="Document description")
    category: str | None = Field(None, description="Document category")
    tags: list[str] | None = Field(None, description="Document tags")
    authors: list[str] | None = Field(None, description="Document authors")
    word_count: int | None = Field(None, description="Word count")
    reading_time_minutes: int | None = Field(
        None, description="Estimated reading time"
    )
    quality_score: float | None = Field(None, description="Quality score")
    accessibility_score: float | None = Field(
        None, description="Accessibility score"
    )
    updated_at: datetime | None = Field(None, description="Last updated timestamp")
    featured: bool | None = Field(None, description="Featured content flag")
    score: float | None = Field(None, description="Search relevance score")
    highlights: dict[str, list[str]] | None = Field(
        None, description="Search highlights"
    )


class SearchFacet(BaseModel):
    """Search facet item schema."""

    value: str = Field(..., description="Facet value")
    count: int = Field(..., description="Number of documents with this facet value")


class SearchResponse(BaseModel):
    """Search response schema."""

    total: int = Field(..., description="Total number of results")
    documents: list[SearchDocument] = Field(..., description="Search result documents")
    facets: dict[str, list[SearchFacet]] = Field(..., description="Search facets")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")
    response_time_ms: int | None = Field(
        None, description="Search response time in milliseconds"
    )
    cached: bool | None = Field(None, description="Whether result was cached")


class SuggestionResponse(BaseModel):
    """Auto-complete suggestions response schema."""

    query: str = Field(..., description="Original query")
    suggestions: list[str] = Field(..., description="List of suggestions")
    cached: bool | None = Field(None, description="Whether suggestions were cached")


class SearchAnalyticsQuery(BaseModel):
    """Search analytics query item schema."""

    query: str = Field(..., description="Search query")
    count: int = Field(..., description="Number of times searched")
    avg_ctr: float | None = Field(None, description="Average click-through rate")
    avg_response_time_ms: int | None = Field(
        None, description="Average response time"
    )


class SearchAnalyticsResponse(BaseModel):
    """Search analytics response schema."""

    period: str = Field(..., description="Analytics period")
    total_searches: int = Field(..., description="Total number of searches")
    unique_queries: int = Field(..., description="Number of unique queries")
    avg_response_time_ms: int = Field(..., description="Average response time")
    top_queries: list[SearchAnalyticsQuery] = Field(
        ..., description="Most popular queries"
    )
    no_results_queries: list[SearchAnalyticsQuery] = Field(
        ..., description="Queries with no results"
    )
    search_performance: dict[str, Any] = Field(..., description="Performance metrics")
    generated_at: datetime | None = Field(
        None, description="Report generation timestamp"
    )


class IndexStats(BaseModel):
    """Search index statistics schema."""

    index_name: str = Field(..., description="Index name")
    document_count: int = Field(..., description="Number of indexed documents")
    index_size_bytes: int = Field(..., description="Index size in bytes")
    cluster_status: str = Field(..., description="Elasticsearch cluster status")
    cluster_name: str = Field(..., description="Elasticsearch cluster name")
    number_of_nodes: int = Field(..., description="Number of cluster nodes")
    active_shards: int = Field(..., description="Number of active shards")
    last_updated: datetime = Field(..., description="Last update timestamp")


class ReindexRequest(BaseModel):
    """Reindex request schema."""

    force: bool | None = Field(
        False, description="Force reindexing even if up to date"
    )
    batch_size: int | None = Field(
        50, description="Batch size for processing", ge=1, le=1000
    )
    include_patterns: list[str] | None = Field(
        None, description="File patterns to include"
    )
    exclude_patterns: list[str] | None = Field(
        None, description="File patterns to exclude"
    )


class ReindexResponse(BaseModel):
    """Reindex response schema."""

    message: str = Field(..., description="Status message")
    status: str = Field(..., description="Operation status")
    total_files: int | None = Field(None, description="Total files processed")
    indexed_files: int | None = Field(None, description="Successfully indexed files")
    failed_files: int | None = Field(None, description="Failed files")
    errors: list[str] | None = Field(None, description="Error messages")
    indexing_time_seconds: float | None = Field(
        None, description="Total indexing time"
    )
    documents_per_second: float | None = Field(None, description="Indexing rate")
    completed_at: datetime | None = Field(None, description="Completion timestamp")
