"""User engagement analytics schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


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
    engagement_score: float | None = Field(None, description="Overall engagement score")


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

    test_name: str = Field(..., description="Test name")
    status: str = Field(..., description="Test status")
    variants: list[ABTestVariant] = Field(..., description="Test variants")
    start_date: datetime = Field(..., description="Start date")
    end_date: datetime | None = Field(None, description="End date")
    winner: str | None = Field(None, description="Winning variant")
