"""Event-related analytics schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class UserEventCreate(BaseModel):
    """User event creation schema."""

    user_id: str | None = Field(
        None, description="User ID (optional for anonymous users)"
    )
    session_id: str = Field(..., description="Session ID", min_length=1, max_length=100)
    event_type: str = Field(..., description="Event type", min_length=1, max_length=50)
    event_data: dict[str, Any] | None = Field(None, description="Additional event data")
    document_id: str | None = Field(None, description="Document ID if applicable")
    document_path: str | None = Field(None, description="Document path if applicable")
    page_url: str | None = Field(None, description="Current page URL")
    referrer: str | None = Field(None, description="Referrer URL")
    user_agent: str | None = Field(None, description="User agent string")
    duration_ms: int | None = Field(
        None, description="Event duration in milliseconds", ge=0
    )

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, v: str) -> str:
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
    filters_applied: dict[str, Any] | None = Field(None, description="Applied filters")
    clicked_position: int | None = Field(
        None, description="Position of clicked result", ge=1
    )
    clicked_document_id: str | None = Field(None, description="ID of clicked document")

    @field_validator("search_type")
    @classmethod
    def validate_search_type(cls, v: str) -> str:
        allowed_types = {"full_text", "semantic", "hybrid", "faceted", "autocomplete"}
        if v not in allowed_types:
            raise ValueError(f"Search type must be one of: {', '.join(allowed_types)}")
        return v
