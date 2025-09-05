"""Dashboard metrics schema."""

from datetime import datetime

from pydantic import BaseModel, Field


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

