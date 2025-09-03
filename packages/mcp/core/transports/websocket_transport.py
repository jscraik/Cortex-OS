"""WebSocket transport implementation for MCP protocol."""

import asyncio
import contextlib
import json
import logging
from typing import Any

from ..protocol import MCPMessage, MessageType
from .base import ConnectionState, MCPTransport, TransportError

logger = logging.getLogger(__name__)


class WebSocketTransport(MCPTransport):
    """WebSocket-based transport for MCP protocol with real-time bidirectional communication."""

    def __init__(self, host: str = "127.0.0.1", port: int = 8001):
        super().__init__()
        self.host = host
        self.port = port
        # Types use Any to avoid import-time dependency on websockets
        self.websocket: Any | None = None
        self.server: Any | None = None
        self.clients: set[Any] = set()
        self._receive_task: asyncio.Task[Any] | None = None

    async def connect(self, **_kwargs: Any) -> None:
        """Start WebSocket server."""
        try:
            self.state = ConnectionState.CONNECTING

            # Start WebSocket server
            try:
                ws_mod = __import__("websockets")
            except Exception as e:  # noqa: BLE001
                raise TransportError(
                    "websockets is required for WebSocketTransport. Please install 'websockets'."
                ) from e

            self.server = await ws_mod.serve(
                self._handle_client_connection,
                self.host,
                self.port,
                ping_interval=20,
                ping_timeout=10,
                close_timeout=10,
            )

            self.state = ConnectionState.CONNECTED
            self._notify_connection_event("connected")
            logger.info(f"WebSocket server started on {self.host}:{self.port}")

        except Exception as e:
            self.state = ConnectionState.ERROR
            self._notify_connection_event("error", error=e)
            raise TransportError(f"Failed to start WebSocket server: {e}") from e

    async def disconnect(self) -> None:
        """Stop WebSocket server and close all connections."""
        try:
            self.state = ConnectionState.DISCONNECTING

            # Cancel receive task
            if self._receive_task:
                self._receive_task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await self._receive_task

            # Close all client connections
            if self.clients:
                await asyncio.gather(
                    *[client.close() for client in self.clients],
                    return_exceptions=True,
                )
                self.clients.clear()

            # Close server
            if self.server:
                self.server.close()
                await self.server.wait_closed()

            self.state = ConnectionState.DISCONNECTED
            self._notify_connection_event("disconnected")
            logger.info("WebSocket server stopped")

        except Exception as e:
            self.state = ConnectionState.ERROR
            self._notify_connection_event("error", error=e)
            raise TransportError(f"Failed to stop WebSocket server: {e}") from e

    async def send_message(self, message: MCPMessage) -> None:
        """Broadcast message to all connected clients."""
        if not self.is_connected:
            raise TransportError("Transport not connected")

        if not self.clients:
            logger.warning("No clients connected to broadcast message")
            return

        message_json = message.to_json()

        # Send to all connected clients
        disconnected_clients: set[Any] = set()
        for client in self.clients:
            try:
                await client.send(message_json)
            except Exception as e:
                logger.warning(f"Failed to send to client: {e}")
                disconnected_clients.add(client)

        # Remove disconnected clients
        self.clients -= disconnected_clients

    async def send_to_client(self, client: Any, message: MCPMessage) -> None:
        """Send message to specific client."""
        try:
            await client.send(message.to_json())
        except Exception as e:
            logger.warning(f"Failed to send to specific client: {e}")
            self.clients.discard(client)
            raise TransportError(f"Failed to send to client: {e}") from e

    async def receive_messages(self) -> None:
        """Start receiving messages (handled by client connections)."""
        # For WebSocket transport, message reception is handled per-client
        # This method keeps the transport alive
        while self.is_connected:
            await asyncio.sleep(1)

    async def _handle_client_connection(self, websocket: Any, _path: str | None = None) -> None:
        """Handle new client WebSocket connection."""
        self.clients.add(websocket)
        logger.info(f"New WebSocket client connected from {websocket.remote_address}")

        try:
            await self._handle_client_messages(websocket)
        except Exception as e:
            # Treat any exception as a disconnection or client error
            logger.info(
                f"WebSocket client {getattr(websocket, 'remote_address', '<unknown>')} disconnected or errored: {e}"
            )
        finally:
            self.clients.discard(websocket)

    async def _handle_client_messages(self, websocket: Any) -> None:
        """Handle messages from a specific client."""
        async for message_data in websocket:
            try:
                message = MCPMessage.from_json(message_data)

                if self.message_handler:
                    # Process message and send response back to this client if any
                    response_message = await self.message_handler(message)
                    if response_message is not None:
                        await self.send_to_client(websocket, response_message)
                else:
                    logger.warning("No message handler configured")

            except json.JSONDecodeError:
                logger.error("Received invalid JSON from WebSocket client")
                error_message = MCPMessage(
                    type=MessageType.ERROR,
                    id="unknown",
                    error={"code": -32700, "message": "Parse error"},
                )
                await self.send_to_client(websocket, error_message)
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                error_message = MCPMessage(
                    type=MessageType.ERROR,
                    id="unknown",
                    error={"code": -32603, "message": "Internal error"},
                )
                await self.send_to_client(websocket, error_message)

    async def health_check(self) -> dict[str, Any]:
        """Enhanced health check for WebSocket transport."""
        base_health = await super().health_check()
        return {
            **base_health,
            "transport": "websocket",
            "host": self.host,
            "port": self.port,
            "connected_clients": len(self.clients),
            "server_running": self.server is not None,
        }

    def get_client_count(self) -> int:
        """Get number of connected clients."""
        return len(self.clients)

    async def ping_clients(self) -> dict[str, bool]:
        """Ping all connected clients and return results."""
        results: dict[str, bool] = {}
        for i, client in enumerate(self.clients):
            try:
                pong = await client.ping()
                await asyncio.wait_for(pong, timeout=5.0)
                results[f"client_{i}"] = True
            except Exception:
                results[f"client_{i}"] = False
        return results
