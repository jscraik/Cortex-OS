"""Server-sent events utilities."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import AsyncGenerator, Optional

from .registry import ConnectorRegistry


async def connector_status_stream(
    registry: ConnectorRegistry, interval: float = 15.0, max_events: Optional[int] = None
) -> AsyncGenerator[dict, None]:
    """Yield periodic connector status snapshots."""

    count = 0
    while max_events is None or count < max_events:
        payload = registry.service_map()
        yield {
            "event": "status",
            "data": {
                "timestamp": datetime.now(UTC).isoformat(),
                "payload": payload,
            },
        }
        count += 1
        await asyncio.sleep(interval)


__all__ = ["connector_status_stream"]
