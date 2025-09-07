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
    """SSE transport implementation."""

    def __init__(self, url: str, client: httpx.AsyncClient | None = None) -> None:
        super().__init__()
        self.url = url
        self.client = client or httpx.AsyncClient()

    async def connect(self, **_: Any) -> None:
        self.state = ConnectionState.CONNECTED
        self._notify_connection_event("connected")

    async def disconnect(self) -> None:
        await self.client.aclose()
        self.state = ConnectionState.DISCONNECTED
        self._notify_connection_event("disconnected")

    async def send_message(self, message: MCPMessage) -> None:  # pragma: no cover - SSE is receive only
        raise TransportError("SSE transport is receive-only")

    async def receive_messages(self) -> None:
        tracer = trace.get_tracer(__name__)
        async with self.client.stream("GET", self.url) as response:
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data_str = line[len("data:") :].strip()
                with tracer.start_as_current_span("sse.receive"):
                    try:
                        data = json.loads(data_str)
                        validate_mcp_message(data)
                        if self.message_handler:
                            message = MCPMessage.from_json(data_str)
                            await self.message_handler(message)
                    except Exception:  # pragma: no cover - log and notify
                        logger.exception("Failed to handle SSE message")
                        self._notify_connection_event("error")
