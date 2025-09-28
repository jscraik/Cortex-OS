"""
A2A Event Models for Cortex-Py

Defines data structures for A2A communication compatible with CloudEvents 1.0
"""

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class A2AEnvelope(BaseModel):
    """CloudEvents 1.0 compatible envelope for A2A messages."""

    # Required CloudEvents fields
    specversion: str = Field(
        default="1.0", description="CloudEvents specification version"
    )
    type: str = Field(..., description="Event type identifier")
    source: str = Field(..., description="Source of the event")
    id: str = Field(..., description="Unique event identifier")
    time: Optional[str] = Field(default=None, description="Event timestamp")

    # Optional CloudEvents fields
    subject: Optional[str] = Field(default=None, description="Subject of the event")
    datacontenttype: str = Field(
        default="application/json", description="Data content type"
    )
    dataschema: Optional[str] = Field(default=None, description="Data schema URI")

    # Trace context
    traceparent: Optional[str] = Field(default=None, description="W3C trace parent")
    tracestate: Optional[str] = Field(default=None, description="W3C trace state")
    baggage: Optional[str] = Field(default=None, description="W3C baggage")

    # A2A specific fields
    correlationId: Optional[str] = Field(default=None, description="Correlation ID")
    causationId: Optional[str] = Field(default=None, description="Causation ID")
    ttlMs: Optional[int] = Field(
        default=None, description="Time to live in milliseconds"
    )
    headers: Optional[Dict[str, str]] = Field(
        default=None, description="Additional headers"
    )

    # Event data payload
    data: Any = Field(..., description="Event data payload")

    class Config:
        extra = "forbid"


class MLXThermalEvent(BaseModel):
        """MLX thermal monitoring event data."""

        device_id: str = Field(..., description="MLX device identifier")
        temperature: float = Field(..., description="Current temperature in Celsius")
        threshold: float = Field(..., description="Temperature threshold")
        status: str = Field(..., description="Thermal status: normal, warning, critical")
        timestamp: str = Field(..., description="Event timestamp ISO 8601")
        action_taken: Optional[str] = Field(default=None, description="Action taken if any")
        message: Optional[str] = Field(default=None, description="brAInwav-branded status message")
        throttle_hint: Optional[str] = Field(default=None, description="Recommended throttle action")


class MLXModelEvent(BaseModel):
    """MLX model lifecycle event data."""

    model_id: str = Field(..., description="Model identifier")
    model_name: str = Field(..., description="Human readable model name")
    event_type: str = Field(..., description="Event type: loaded, unloaded, error")
    memory_usage: Optional[int] = Field(
        default=None, description="Memory usage in bytes"
    )
    load_time: Optional[float] = Field(default=None, description="Load time in seconds")
    error_message: Optional[str] = Field(
        default=None, description="Error message if any"
    )
    timestamp: str = Field(..., description="Event timestamp ISO 8601")


class MLXEmbeddingEvent(BaseModel):
    """MLX embedding generation event data."""

    request_id: str = Field(..., description="Request identifier")
    text_count: int = Field(..., description="Number of texts processed")
    total_chars: int = Field(..., description="Total character count")
    processing_time: float = Field(..., description="Processing time in seconds")
    model_used: str = Field(..., description="Model used for embeddings")
    dimension: int = Field(..., description="Embedding dimension")
    success: bool = Field(..., description="Whether processing was successful")
    error_message: Optional[str] = Field(
        default=None, description="Error message if any"
    )
    timestamp: str = Field(..., description="Event timestamp ISO 8601")
