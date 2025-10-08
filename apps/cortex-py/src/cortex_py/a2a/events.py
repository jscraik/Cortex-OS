"""
A2A Events for Cortex-Py MLX Integration

Defines MLX-specific event types and factory functions for A2A communication.
"""

import uuid
from datetime import UTC, datetime
from typing import Optional

from .models import A2AEnvelope, MLXEmbeddingEvent, MLXModelEvent, MLXThermalEvent


class MLXEventTypes:
    """MLX event type constants."""

    THERMAL_STATUS = "mlx.thermal.status"
    THERMAL_WARNING = "mlx.thermal.warning"
    THERMAL_CRITICAL = "mlx.thermal.critical"

    MODEL_LOADED = "mlx.model.loaded"
    MODEL_UNLOADED = "mlx.model.unloaded"
    MODEL_ERROR = "mlx.model.error"

    EMBEDDING_COMPLETED = "mlx.embedding.completed"
    EMBEDDING_FAILED = "mlx.embedding.failed"
    EMBEDDING_BATCH_COMPLETED = "mlx.embedding.batch.completed"


def create_mlx_thermal_event(
    device_id: str,
    temperature: float,
    threshold: float,
    status: str,
    action_taken: Optional[str] = None,
    source: str = "urn:cortex:mlx:thermal",
    correlation_id: Optional[str] = None,
    traceparent: Optional[str] = None,
) -> A2AEnvelope:
    """Create an MLX thermal monitoring event."""

    event_type = MLXEventTypes.THERMAL_STATUS
    if status == "warning":
        event_type = MLXEventTypes.THERMAL_WARNING
    elif status == "critical":
        event_type = MLXEventTypes.THERMAL_CRITICAL

    correlation = correlation_id or str(uuid.uuid4())
    thermal_data = MLXThermalEvent(
        device_id=device_id,
        temperature=temperature,
        threshold=threshold,
        status=status,
        timestamp=datetime.now(UTC).isoformat(),
        action_taken=action_taken,
    )

    return A2AEnvelope(
        type=event_type,
        source=source,
        id=str(uuid.uuid4()),
        time=datetime.now(UTC).isoformat(),
        data=thermal_data.model_dump(),
        correlationId=correlation,
        traceparent=traceparent,
    )


def create_mlx_model_event(
    model_id: str,
    model_name: str,
    event_type: str,
    memory_usage: Optional[int] = None,
    load_time: Optional[float] = None,
    error_message: Optional[str] = None,
    source: str = "urn:cortex:mlx:model",
    correlation_id: Optional[str] = None,
    traceparent: Optional[str] = None,
) -> A2AEnvelope:
    """Create an MLX model lifecycle event."""

    type_mapping = {
        "loaded": MLXEventTypes.MODEL_LOADED,
        "unloaded": MLXEventTypes.MODEL_UNLOADED,
        "error": MLXEventTypes.MODEL_ERROR,
    }

    a2a_event_type = type_mapping.get(event_type, MLXEventTypes.MODEL_ERROR)

    correlation = correlation_id or str(uuid.uuid4())
    model_data = MLXModelEvent(
        model_id=model_id,
        model_name=model_name,
        event_type=event_type,
        memory_usage=memory_usage,
        load_time=load_time,
        error_message=error_message,
        timestamp=datetime.now(UTC).isoformat(),
    )

    return A2AEnvelope(
        type=a2a_event_type,
        source=source,
        id=str(uuid.uuid4()),
        time=datetime.now(UTC).isoformat(),
        data=model_data.model_dump(),
        correlationId=correlation,
        traceparent=traceparent,
    )


def create_mlx_embedding_event(
    request_id: str,
    text_count: int,
    total_chars: int,
    processing_time: float,
    model_used: str,
    dimension: int,
    success: bool,
    error_message: Optional[str] = None,
    source: str = "urn:cortex:mlx:embedding",
    correlation_id: Optional[str] = None,
    traceparent: Optional[str] = None,
) -> A2AEnvelope:
    """Create an MLX embedding generation event."""

    event_type = (
        MLXEventTypes.EMBEDDING_BATCH_COMPLETED
        if text_count > 1
        else MLXEventTypes.EMBEDDING_COMPLETED
    )

    if not success:
        event_type = MLXEventTypes.EMBEDDING_FAILED

    correlation = correlation_id or str(uuid.uuid4())
    embedding_data = MLXEmbeddingEvent(
        request_id=request_id,
        text_count=text_count,
        total_chars=total_chars,
        processing_time=processing_time,
        model_used=model_used,
        dimension=dimension,
        success=success,
        error_message=error_message,
        timestamp=datetime.now(UTC).isoformat(),
    )

    return A2AEnvelope(
        type=event_type,
        source=source,
        id=str(uuid.uuid4()),
        time=datetime.now(UTC).isoformat(),
        data=embedding_data.model_dump(),
        correlationId=correlation,
        traceparent=traceparent,
    )
