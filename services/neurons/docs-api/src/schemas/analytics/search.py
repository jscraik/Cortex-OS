"""Search analytics schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SearchAnalyticsQuery(BaseModel):
    """Search analytics query item schema."""

    query: str = Field(..., description="Search query")
    count: int = Field(..., description="Number of searches")
    avg_ctr: float | None = Field(None, description="Average click-through rate")
    avg_response_time_ms: int | None = Field(None, description="Average response time")
    avg_position: float | None = Field(None, description="Average click position")


class SearchAnalyticsResponse(BaseModel):
    """Search analytics response schema."""

    period: str = Field(..., description="Analytics period")
    total_searches: int = Field(..., description="Total searches")
    unique_queries: int = Field(..., description="Unique queries")
    avg_response_time_ms: int = Field(..., description="Average response time")
    top_queries: list[SearchAnalyticsQuery] = Field(
        ..., description="Top search queries"
    )
    no_results_queries: list[SearchAnalyticsQuery] = Field(
        ..., description="Queries with no results"
    )
    search_performance: dict[str, Any] = Field(
        ..., description="Performance metrics"
    )
    generated_at: datetime | None = Field(None, description="Generation timestamp")

