"""HTTP transport implementation for MCP protocol."""

import asyncio
import json
from typing import Any

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException, Request

from ..protocol import MCPMessage
from .base import ConnectionState, MCPTransport, TransportError


class HTTPTransport(MCPTransport):
    """HTTP-based transport for MCP protocol."""

    def __init__(self, host: str = "127.0.0.1", port: int = 8000):
        super().__init__()
        self.host = host
        self.port = port
        self.app = FastAPI(title="MCP HTTP Transport", version="1.0.0")
        self.server: uvicorn.Server | None = None
        self.client = httpx.AsyncClient()
        self._setup_routes()

    def _setup_routes(self) -> None:
        """Setup FastAPI routes for MCP protocol."""

        @self.app.post("/mcp/message")
        async def handle_message(request: Request) -> dict[str, Any]:
            """Handle incoming MCP messages."""
            try:
                body = await request.json()
                message = MCPMessage.from_json(json.dumps(body))

                if not self.message_handler:
                    raise HTTPException(
                        status_code=500, detail="No message handler configured"
                    )

                # Process message asynchronously
                response_message = await self.message_handler(message)

                # Return response as JSON
                response_dict = json.loads(response_message.to_json())
                return response_dict

            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid JSON")
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/mcp/health")
        async def health_check() -> dict[str, Any]:
            """Health check endpoint."""
            return await self.health_check()

        @self.app.get("/mcp/info")
        async def server_info() -> dict[str, Any]:
            """Server information endpoint."""
            return {
                "transport": "http",
                "host": self.host,
                "port": self.port,
                "state": self.state.value,
            }

    async def connect(self, **kwargs) -> None:
        """Start HTTP server."""
        try:
            self.state = ConnectionState.CONNECTING

            config = uvicorn.Config(
                app=self.app,
                host=self.host,
                port=self.port,
                log_level="info",
                access_log=True,
            )
            self.server = uvicorn.Server(config)

            # Start server in background
            server_task = asyncio.create_task(self.server.serve())

            # Wait a moment for server to start
            await asyncio.sleep(0.5)

            self.state = ConnectionState.CONNECTED
            self._notify_connection_event("connected")

            # Keep server task reference
            self._server_task = server_task

        except Exception as e:
            self.state = ConnectionState.ERROR
            self._notify_connection_event("error", error=e)
            raise TransportError(f"Failed to start HTTP server: {e}")

    async def disconnect(self) -> None:
        """Stop HTTP server."""
        try:
            self.state = ConnectionState.DISCONNECTING

            if self.server:
                self.server.should_exit = True
                await self.server.shutdown()

            await self.client.aclose()

            self.state = ConnectionState.DISCONNECTED
            self._notify_connection_event("disconnected")

        except Exception as e:
            self.state = ConnectionState.ERROR
            self._notify_connection_event("error", error=e)
            raise TransportError(f"Failed to stop HTTP server: {e}")

    async def send_message(self, message: MCPMessage) -> None:
        """Send message via HTTP POST."""
        if not self.is_connected:
            raise TransportError("Transport not connected")

        try:
            # For HTTP transport, we typically send to a remote endpoint
            # This is a client-side send operation
            message_data = json.loads(message.to_json())

            # Send to configured remote endpoint, not to self
            # This should be configured with actual remote server URL
            if hasattr(self, "remote_url") and self.remote_url:
                response = await self.client.post(
                    f"{self.remote_url}/mcp/message",
                    json=message_data,
                    timeout=30.0,
                )
                response.raise_for_status()
            else:
                # For local testing only - normally would fail in production
                raise TransportError("No remote URL configured for message sending")

        except Exception as e:
            raise TransportError(f"Failed to send HTTP message: {e}")

    async def receive_messages(self) -> None:
        """HTTP transport receives via endpoint handlers."""
        # For HTTP transport, messages are received via the FastAPI endpoints
        # This method exists for interface compliance but doesn't need to do anything
        # as message reception is handled by the HTTP server routes
        while self.is_connected:
            await asyncio.sleep(1)

    async def send_to_endpoint(self, url: str, message: MCPMessage) -> MCPMessage:
        """Send message to specific HTTP endpoint and get response."""
        try:
            message_data = json.loads(message.to_json())

            response = await self.client.post(
                url,
                json=message_data,
                timeout=30.0,
            )
            response.raise_for_status()

            response_data = response.json()
            return MCPMessage.from_json(json.dumps(response_data))

        except Exception as e:
            raise TransportError(f"Failed to send to endpoint {url}: {e}")

    async def health_check(self) -> dict[str, Any]:
        """Enhanced health check for HTTP transport."""
        base_health = await super().health_check()
        return {
            **base_health,
            "transport": "http",
            "host": self.host,
            "port": self.port,
            "server_running": self.server is not None and not self.server.should_exit,
        }
