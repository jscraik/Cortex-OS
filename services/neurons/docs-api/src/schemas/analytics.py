"""Pydantic schemas for analytics-related requests and responses."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, validator


class UserEventCreate(BaseModel):
    """User event creation schema."""

    user_id: str | None = Field(
        None, description="User ID (optional for anonymous users)"
    )
    session_id: str = Field(..., description="Session ID", min_length=1, max_length=100)
    event_type: str = Field(..., description="Event type", min_length=1, max_length=50)
    event_data: dict[str, Any] | None = Field(
        None, description="Additional event data"
    )
    document_id: str | None = Field(None, description="Document ID if applicable")
    document_path: str | None = Field(
        None, description="Document path if applicable"
    )
    page_url: str | None = Field(None, description="Current page URL")
    referrer: str | None = Field(None, description="Referrer URL")
    user_agent: str | None = Field(None, description="User agent string")
    duration_ms: int | None = Field(
        None, description="Event duration in milliseconds", ge=0
    )

    @validator("event_type")
    def validate_event_type(self, v):
        allowed_types = {
            "page_view",
            "search",
            "click",
            "bookmark_add",
            "bookmark_remove",
            "progress_update",
            "download",
            "share",
            "feedback",
            "error",
            "session_start",
            "session_end",
            "scroll",
            "time_on_page",
        }
        if v not in allowed_types:
            raise ValueError(f"Event type must be one of: {', '.join(allowed_types)}")
        return v


class UserEventResponse(BaseModel):
    """User event response schema."""

    status: str = Field(..., description="Processing status")
    message: str = Field(..., description="Status message")
    timestamp: datetime = Field(..., description="Processing timestamp")


class SearchEventCreate(BaseModel):
    """Search event creation schema."""

    user_id: str | None = Field(None, description="User ID")
    session_id: str = Field(..., description="Session ID")
    query: str = Field(..., description="Search query", min_length=1, max_length=1000)
    result_count: int = Field(..., description="Number of results", ge=0)
    response_time_ms: int = Field(
        ..., description="Response time in milliseconds", ge=0
    )
    search_type: str = Field("full_text", description="Type of search")
    filters_applied: dict[str, Any] | None = Field(
        None, description="Applied filters"
    )
    clicked_position: int | None = Field(
        None, description="Position of clicked result", ge=1
    )
    clicked_document_id: str | None = Field(
        None, description="ID of clicked document"
    )

    @validator("search_type")
    def validate_search_type(self, v):
        allowed_types = {"full_text", "semantic", "hybrid", "faceted", "autocomplete"}
        if v not in allowed_types:
            raise ValueError(f"Search type must be one of: {', '.join(allowed_types)}")
        return v


class DashboardMetricsResponse(BaseModel):
    """Dashboard metrics response schema."""

    period: str = Field(..., description="Time period")
    page_views: int = Field(..., description="Total page views")
    unique_users: int = Field(..., description="Unique users")
    bounce_rate: float = Field(..., description="Bounce rate (0-1)")
    avg_session_duration: int = Field(
        ..., description="Average session duration in seconds"
    )
    search_queries: int = Field(..., description="Total search queries")
    popular_pages: list[dict[str, str | int]] = Field(
        ..., description="Most popular pages"
    )
    device_breakdown: dict[str, float] = Field(
        ..., description="Device type breakdown percentages"
    )
    generated_at: datetime = Field(..., description="Generation timestamp")


class SearchAnalyticsQuery(BaseModel):
    """Search analytics query item schema."""

    query: str = Field(..., description="Search query")
    count: int = Field(..., description="Number of searches")
    avg_ctr: float | None = Field(None, description="Average click-through rate")
    avg_response_time_ms: int | None = Field(
        None, description="Average response time"
    )
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
    search_performance: dict[str, Any] = Field(..., description="Performance metrics")
    generated_at: datetime | None = Field(None, description="Generation timestamp")


class PerformanceEndpoint(BaseModel):
    """Performance endpoint metrics schema."""

    endpoint: str = Field(..., description="API endpoint")
    avg_time_ms: float = Field(..., description="Average response time")
    error_rate: float = Field(..., description="Error rate (0-1)")
    request_count: int = Field(..., description="Total requests")
    p50_time_ms: float | None = Field(
        None, description="50th percentile response time"
    )
    p95_time_ms: float | None = Field(
        None, description="95th percentile response time"
    )
    p99_time_ms: float | None = Field(
        None, description="99th percentile response time"
    )


class PerformanceMetricsResponse(BaseModel):
    """Performance metrics response schema."""

    period: str = Field(..., description="Time period")
    service: str = Field(..., description="Service name")
    avg_response_time_ms: float = Field(..., description="Average response time")
    error_rate: float = Field(..., description="Overall error rate")
    throughput_rps: float = Field(..., description="Requests per second")
    availability: float = Field(..., description="Availability percentage")
    endpoints: list[PerformanceEndpoint] = Field(
        ..., description="Endpoint-specific metrics"
    )
    generated_at: datetime | None = Field(None, description="Generation timestamp")


class ContentPopularityItem(BaseModel):
    """Popular content item schema."""

    document_id: str = Field(..., description="Document ID")
    title: str = Field(..., description="Document title")
    path: str = Field(..., description="Document path")
    category: str | None = Field(None, description="Document category")
    views: int = Field(..., description="View count")
    unique_visitors: int = Field(..., description="Unique visitors")
    avg_time_on_page: int = Field(..., description="Average time on page in seconds")
    bounce_rate: float = Field(..., description="Bounce rate for this content")
    engagement_score: float | None = Field(
        None, description="Overall engagement score"
    )


class UserEngagementMetrics(BaseModel):
    """User engagement metrics schema."""

    period: str = Field(..., description="Time period")
    avg_session_duration: int = Field(
        ..., description="Average session duration in seconds"
    )
    pages_per_session: float = Field(..., description="Average pages per session")
    bounce_rate: float = Field(..., description="Overall bounce rate")
    return_visitor_rate: float = Field(..., description="Return visitor rate")
    engagement_score: float = Field(..., description="Overall engagement score")
    top_exit_pages: list[dict[str, str | float]] = Field(
        ..., description="Pages with highest exit rates"
    )
    generated_at: datetime | None = Field(None, description="Generation timestamp")


class ABTestVariant(BaseModel):
    """A/B test variant schema."""

    name: str = Field(..., description="Variant name")
    traffic_percentage: float = Field(..., description="Traffic allocation percentage")
    conversion_rate: float | None = Field(None, description="Conversion rate")
    statistical_significance: float | None = Field(
        None, description="Statistical significance"
    )


class ABTestResponse(BaseModel):
    """A/B test response schema."""

    id: str = Field(..., description="Test ID")
    name: str = Field(..., description="Test name")
    description: str | None = Field(None, description="Test description")
    status: str = Field(..., description="Test status")
    variants: list[ABTestVariant] = Field(..., description="Test variants")
    primary_metric: str = Field(..., description="Primary success metric")
    traffic_split: dict[str, float] = Field(
        ..., description="Traffic split configuration"
    )
    metrics: dict[str, dict[str, float]] = Field(
        ..., description="Performance metrics by variant"
    )
    created_at: datetime = Field(..., description="Test creation timestamp")
    started_at: datetime | None = Field(None, description="Test start timestamp")
    ended_at: datetime | None = Field(None, description="Test end timestamp")

    @validator("status")
    def validate_status(self, v):
        allowed_statuses = {"draft", "active", "paused", "completed", "archived"}
        if v not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
        return v


class ABTestConversionEvent(BaseModel):
    """A/B test conversion event schema."""

    test_id: str = Field(..., description="Test ID")
    user_id: str | None = Field(None, description="User ID")
    session_id: str | None = Field(None, description="Session ID")
    variant: str = Field(..., description="Test variant")
    conversion_type: str = Field(..., description="Type of conversion")
    conversion_value: float | None = Field(None, description="Conversion value")
    metadata: dict[str, Any] | None = Field(None, description="Additional metadata")


class AnalyticsFilter(BaseModel):
    """Analytics filter schema."""

    field: str = Field(..., description="Field to filter on")
    operator: str = Field(..., description="Filter operator")
    value: str | int | float | list[str | int | float] = Field(
        ..., description="Filter value"
    )

    @validator("operator")
    def validate_operator(self, v):
        allowed_operators = {
            "eq",
            "ne",
            "gt",
            "gte",
            "lt",
            "lte",
            "in",
            "not_in",
            "contains",
            "not_contains",
        }
        if v not in allowed_operators:
            raise ValueError(f"Operator must be one of: {', '.join(allowed_operators)}")
        return v


class AnalyticsQuery(BaseModel):
    """Analytics query schema."""

    metrics: list[str] = Field(..., description="Metrics to calculate")
    dimensions: list[str] | None = Field(None, description="Dimensions to group by")
    filters: list[AnalyticsFilter] | None = Field(
        None, description="Filters to apply"
    )
    date_range: dict[str, datetime] = Field(
        ..., description="Date range with 'start' and 'end' keys"
    )
    limit: int | None = Field(100, description="Maximum results", ge=1, le=10000)
    order_by: str | None = Field(None, description="Field to order by")
    order_direction: str | None = Field("desc", description="Order direction")

    @validator("order_direction")
    def validate_order_direction(self, v):
        if v not in ["asc", "desc"]:
            raise ValueError('Order direction must be "asc" or "desc"')
        return v


class AnalyticsQueryResponse(BaseModel):
    """Analytics query response schema."""

    query: AnalyticsQuery = Field(..., description="Original query")
    results: list[dict[str, Any]] = Field(..., description="Query results")
    total_rows: int = Field(..., description="Total rows available")
    execution_time_ms: int = Field(..., description="Query execution time")
    cached: bool = Field(..., description="Whether result was cached")
    generated_at: datetime = Field(..., description="Generation timestamp")


class AnalyticsExportRequest(BaseModel):
    """Analytics export request schema."""

    report_type: str = Field(..., description="Type of report to export")
    format: str = Field("json", description="Export format")
    period: str = Field("month", description="Time period")
    filters: list[AnalyticsFilter] | None = Field(
        None, description="Additional filters"
    )
    include_raw_data: bool = Field(False, description="Include raw data in export")

    @validator("format")
    def validate_format(self, v):
        allowed_formats = {"json", "csv", "excel", "parquet"}
        if v not in allowed_formats:
            raise ValueError(f"Format must be one of: {', '.join(allowed_formats)}")
        return v

    @validator("report_type")
    def validate_report_type(self, v):
        allowed_types = {
            "user_events",
            "search_analytics",
            "performance",
            "content_analytics",
            "user_engagement",
            "conversion_funnel",
            "cohort_analysis",
        }
        if v not in allowed_types:
            raise ValueError(f"Report type must be one of: {', '.join(allowed_types)}")
        return v


class AnalyticsExportResponse(BaseModel):
    """Analytics export response schema."""

    report_type: str = Field(..., description="Report type")
    format: str = Field(..., description="Export format")
    period: str = Field(..., description="Time period")
    date_from: datetime = Field(..., description="Start date")
    date_to: datetime = Field(..., description="End date")
    data: dict[str, Any] | str = Field(
        ..., description="Exported data or download URL"
    )
    row_count: int = Field(..., description="Number of rows exported")
    file_size_bytes: int | None = Field(None, description="File size in bytes")
    generated_at: datetime = Field(..., description="Generation timestamp")
    expires_at: datetime | None = Field(
        None, description="Export expiration timestamp"
    )


class RealTimeMetrics(BaseModel):
    """Real-time metrics schema."""

    active_users: int = Field(..., description="Currently active users")
    page_views_last_hour: int = Field(..., description="Page views in last hour")
    search_queries_last_hour: int = Field(
        ..., description="Search queries in last hour"
    )
    avg_response_time_ms: float = Field(
        ..., description="Average response time in last 5 minutes"
    )
    error_rate_last_hour: float = Field(..., description="Error rate in last hour")
    top_pages_last_hour: list[dict[str, str | int]] = Field(
        ..., description="Top pages in last hour"
    )
    last_updated: datetime = Field(..., description="Last update timestamp")


class MetricAlert(BaseModel):
    """Metric alert schema."""

    id: str = Field(..., description="Alert ID")
    metric_name: str = Field(..., description="Metric name")
    threshold: float = Field(..., description="Alert threshold")
    operator: str = Field(..., description="Comparison operator")
    current_value: float = Field(..., description="Current metric value")
    severity: str = Field(..., description="Alert severity")
    triggered_at: datetime = Field(..., description="Alert trigger timestamp")
    message: str = Field(..., description="Alert message")

    @validator("operator")
    def validate_operator(self, v):
        allowed_operators = {"gt", "gte", "lt", "lte", "eq", "ne"}
        if v not in allowed_operators:
            raise ValueError(f"Operator must be one of: {', '.join(allowed_operators)}")
        return v

    @validator("severity")
    def validate_severity(self, v):
        allowed_severities = {"low", "medium", "high", "critical"}
        if v not in allowed_severities:
            raise ValueError(
                f"Severity must be one of: {', '.join(allowed_severities)}"
            )
        return v
