"""Server-Sent Events transport for MCP."""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx
from opentelemetry import trace

from ..protocol import MCPMessage
from ..validation import validate_mcp_message
from .base import ConnectionState, MCPTransport, TransportError

logger = logging.getLogger(__name__)


class SSETransport(MCPTransport):
    """SSE transport implementation with optional rate limiting/backpressure."""

    def __init__(
        self,
        url: str,
        client: httpx.AsyncClient | None = None,
        rate_limit_per_sec: float | None = None,
        sleep_func=None,
    ) -> None:
        super().__init__()
        self.url = url
        self.client = client or httpx.AsyncClient()
        self.rate_limit_per_sec = rate_limit_per_sec
        # injectable sleep for tests
        import asyncio as _asyncio

        self._sleep = sleep_func or _asyncio.sleep
        # token bucket allowance
        self._allowance = rate_limit_per_sec if rate_limit_per_sec else None
        self._last_check = None

    async def connect(self, **_: Any) -> None:
        self.state = ConnectionState.CONNECTED
        self._notify_connection_event("connected")

    async def disconnect(self) -> None:
        await self.client.aclose()
        self.state = ConnectionState.DISCONNECTED
        self._notify_connection_event("disconnected")

    async def send_message(
        self, message: MCPMessage
    ) -> None:  # pragma: no cover - SSE is receive only
        raise TransportError("SSE transport is receive-only")

    async def receive_messages(self) -> None:
        tracer = trace.get_tracer(__name__)
        async with self.client.stream("GET", self.url) as response:
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data_str = line[len("data:") :].strip()
                # simple token bucket rate limit if configured
                if self.rate_limit_per_sec:
                    import time as _time

                    now = _time.monotonic()
                    if self._last_check is None:
                        self._last_check = now
                        self._allowance = self.rate_limit_per_sec
                    elapsed = max(0.0, now - self._last_check)
                    self._last_check = now
                    self._allowance = min(
                        self.rate_limit_per_sec, (self._allowance or 0) + elapsed * self.rate_limit_per_sec
                    )
                    if (self._allowance or 0) < 1.0:
                        # need to wait
                        to_sleep = (1.0 - (self._allowance or 0)) / self.rate_limit_per_sec
                        await self._sleep(to_sleep)
                        self._allowance = 0.0
                    else:
                        self._allowance = (self._allowance or 0) - 1.0
                with tracer.start_as_current_span("sse.receive"):
                    try:
                        data = json.loads(data_str)
                        validate_mcp_message(data)
                        if self.message_handler:
                            # Build message via JSON path to avoid requiring from_dict
                            message = MCPMessage.from_json(json.dumps(data))
                            await self.message_handler(message)
                    except Exception:  # pragma: no cover - log and notify
                        logger.exception("Failed to handle SSE message")
                        self._notify_connection_event("error")
