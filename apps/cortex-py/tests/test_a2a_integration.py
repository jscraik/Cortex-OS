"""
Test A2A integration for cortex-py
"""

from unittest.mock import AsyncMock, patch

import pytest
from cortex_py.a2a import (
    MLXEventTypes,
    create_a2a_bus,
    create_mlx_embedding_event,
    create_mlx_thermal_event,
)


@pytest.mark.asyncio
async def test_a2a_bus_creation():
    """Test A2A bus can be created."""
    bus = create_a2a_bus()
    assert bus is not None
    assert bus.source == "urn:cortex:py:mlx"
    assert bus.a2a_endpoint == "http://localhost:3001/a2a"


@pytest.mark.asyncio
async def test_a2a_bus_lifecycle():
    """Test A2A bus start/stop lifecycle."""
    bus = create_a2a_bus()

    # Start the bus
    await bus.start()
    assert bus._running is True
    assert bus._client is not None

    # Stop the bus
    await bus.stop()
    assert bus._running is False
    assert bus._client is None


@pytest.mark.asyncio
async def test_create_mlx_thermal_event():
    """Test MLX thermal event creation."""
    event = create_mlx_thermal_event(
        device_id="mlx_0",
        temperature=75.5,
        threshold=80.0,
        status="warning",
        action_taken="reduce_load",
    )

    assert event.type == MLXEventTypes.THERMAL_WARNING
    assert event.source == "urn:cortex:mlx:thermal"
    assert event.data["device_id"] == "mlx_0"
    assert event.data["temperature"] == 75.5
    assert event.data["status"] == "warning"
    assert event.data["action_taken"] == "reduce_load"


@pytest.mark.asyncio
async def test_create_mlx_embedding_event():
    """Test MLX embedding event creation."""
    event = create_mlx_embedding_event(
        request_id="req_123",
        text_count=5,
        total_chars=1024,
        processing_time=2.5,
        model_used="sentence-transformers/all-MiniLM-L6-v2",
        dimension=384,
        success=True,
    )

    assert event.type == MLXEventTypes.EMBEDDING_BATCH_COMPLETED
    assert event.source == "urn:cortex:mlx:embedding"
    assert event.data["request_id"] == "req_123"
    assert event.data["text_count"] == 5
    assert event.data["success"] is True
    assert event.data["dimension"] == 384


@pytest.mark.asyncio
async def test_event_subscription():
    """Test event subscription and handling."""
    bus = create_a2a_bus()

    received_events = []

    def handler(envelope):
        received_events.append(envelope)

    # Subscribe to thermal events
    bus.subscribe(MLXEventTypes.THERMAL_WARNING, handler)

    # Create and handle a thermal event
    event = create_mlx_thermal_event(
        device_id="mlx_0", temperature=75.5, threshold=80.0, status="warning"
    )

    await bus.handle_message(event)

    assert len(received_events) == 1
    assert received_events[0].type == MLXEventTypes.THERMAL_WARNING


@pytest.mark.asyncio
async def test_a2a_publish_with_mock():
    """Test A2A message publishing with mocked HTTP client."""
    bus = create_a2a_bus()

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_client_class.return_value = mock_client
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_client.post.return_value = mock_response

        await bus.start()

        event = create_mlx_thermal_event(
            device_id="mlx_0", temperature=65.0, threshold=80.0, status="normal"
        )

        result = await bus.publish(event)

        assert result is True
        mock_client.post.assert_called_once()

        await bus.stop()


@pytest.mark.asyncio
async def test_a2a_health_check():
    """Test A2A bus health check."""
    bus = create_a2a_bus()

    # Health check when not running
    health = await bus.health_check()
    assert health["running"] is False
    assert health["subscriptions"] == 0

    # Health check when running
    await bus.start()
    health = await bus.health_check()
    assert health["running"] is True
    assert "endpoint" in health

    await bus.stop()
