"""Performance metrics schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class PerformanceEndpoint(BaseModel):
    """Performance endpoint metrics schema."""

    endpoint: str = Field(..., description="API endpoint")
    avg_time_ms: float = Field(..., description="Average response time")
    error_rate: float = Field(..., description="Error rate (0-1)")
    request_count: int = Field(..., description="Total requests")
    p50_time_ms: float | None = Field(None, description="50th percentile response time")
    p95_time_ms: float | None = Field(None, description="95th percentile response time")
    p99_time_ms: float | None = Field(None, description="99th percentile response time")


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

