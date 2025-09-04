"""MCP client core implementation."""

import asyncio
import json
from typing import Any

from .protocol import MCPMessage, MCPProtocolHandler
from .transports.base import MCPTransport
from .transports.http_transport import HTTPTransport


class MCPClient:
    """Client for communicating with an MCP server."""

    def __init__(self, transport: MCPTransport | None = None) -> None:
        self.transport = transport or HTTPTransport()
        self.protocol = MCPProtocolHandler()
        self._pending: dict[str, asyncio.Future[MCPMessage]] = {}
        self._receive_task: asyncio.Task | None = None
        self.transport.set_message_handler(self._handle_incoming)

    async def connect(self, **kwargs: Any) -> None:
        """Connect the underlying transport."""
        await self.transport.connect(**kwargs)
        self._receive_task = asyncio.create_task(self.transport.receive_messages())

    async def disconnect(self) -> None:
        """Disconnect the underlying transport."""
        await self.transport.disconnect()
        if self._receive_task is not None:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass
            self._receive_task = None

    async def _handle_incoming(self, message: MCPMessage) -> MCPMessage | None:
        future = self._pending.pop(message.id, None)
        if future:
            future.set_result(message)
        return None

    async def send_message(self, message: MCPMessage | dict[str, Any]) -> MCPMessage:
        """Send a message and await the response."""
        if isinstance(message, dict):
            message = MCPMessage.from_json(json.dumps(message))

        if isinstance(self.transport, HTTPTransport):
            url = getattr(
                self.transport,
                "remote_url",
                f"http://{self.transport.host}:{self.transport.port}/mcp/message",
            )
            return await self.transport.send_to_endpoint(url, message)

        if not self.transport.is_connected:
            await self.connect()

        loop = asyncio.get_running_loop()
        future: asyncio.Future[MCPMessage] = loop.create_future()
        self._pending[message.id] = future
        await self.transport.send_message(message)
        return await future

    async def call(self, method: str, params: dict[str, Any] | None = None) -> Any:
        """Convenience method to perform an MCP request."""
        request = self.protocol.create_request(method, params)
        response = await self.send_message(request)
        if response.error:
            raise RuntimeError(response.error.get("message", "Unknown error"))
        return response.result
