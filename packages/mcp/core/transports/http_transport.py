"""HTTP transport implementation for MCP protocol."""

import asyncio
import json
from typing import Any, cast

from ..protocol import MCPMessage
from .base import ConnectionState, MCPTransport, TransportError


class HTTPTransport(MCPTransport):
    """HTTP-based transport for MCP protocol."""

    def __init__(self, host: str = "127.0.0.1", port: int = 8000):
        super().__init__()
        self.host = host
        self.port = port
        # Defer FastAPI import and app creation until connect()
        self.app: Any | None = None
        self.server: Any | None = None  # set in connect()
        self.client: Any | None = None  # set in connect()

    def _setup_routes(self) -> None:
        """Setup FastAPI routes for MCP protocol."""
        # Import FastAPI types only when setting up routes
        from fastapi import HTTPException, Request, Response

        async def handle_message(request: Request) -> Any:
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

                # Return response as JSON if provided (requests); else 204 No Content
                if response_message is None:
                    return Response(status_code=204)
                response_dict = json.loads(response_message.to_json())
                return cast(dict[str, Any], response_dict)

            except json.JSONDecodeError as e:  # invalid request body JSON
                raise HTTPException(status_code=400, detail="Invalid JSON") from e
            except Exception as e:  # noqa: BLE001
                raise HTTPException(status_code=500, detail=str(e)) from e

        async def health_check_endpoint() -> dict[str, Any]:
            """Health check endpoint."""
            return await self.health_check()

        def server_info() -> dict[str, Any]:
            """Server information endpoint."""
            return {
                "transport": "http",
                "host": self.host,
                "port": self.port,
                "state": self.state.value,
            }

        # Register routes
        assert (
            self.app is not None
        ), "FastAPI app must be initialized before setting up routes"
        self.app.add_api_route("/mcp/message", handle_message, methods=["POST"])
        self.app.add_api_route("/mcp/health", health_check_endpoint, methods=["GET"])
        self.app.add_api_route("/mcp/info", server_info, methods=["GET"])

    async def connect(self, **_kwargs: Any) -> None:
        """Start HTTP server."""
        try:
            self.state = ConnectionState.CONNECTING

            # Lazy import optional dependencies
            try:
                from fastapi import FastAPI
            except Exception as e:  # noqa: BLE001
                raise TransportError(
                    "FastAPI is required for HTTPTransport. Please install 'fastapi'."
                ) from e
            try:
                import uvicorn
            except Exception as e:  # noqa: BLE001
                raise TransportError(
                    "uvicorn is required for HTTPTransport. Please install 'uvicorn'."
                ) from e
            try:
                import httpx
            except Exception as e:  # noqa: BLE001
                raise TransportError(
                    "httpx is required for HTTPTransport. Please install 'httpx'."
                ) from e

            # Initialize FastAPI app and routes lazily now that deps are present
            self.app = FastAPI(title="MCP HTTP Transport", version="1.0.0")
            self._setup_routes()

            config = uvicorn.Config(
                app=self.app,
                host=self.host,
                port=self.port,
                log_level="info",
                access_log=True,
            )
            self.server = uvicorn.Server(config)
            self.client = httpx.AsyncClient()

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
            raise TransportError(f"Failed to start HTTP server: {e}") from e

    async def disconnect(self) -> None:
        """Stop HTTP server."""
        try:
            self.state = ConnectionState.DISCONNECTING

            if self.server:
                self.server.should_exit = True
                await self.server.shutdown()

            if self.client:
                await self.client.aclose()

            self.state = ConnectionState.DISCONNECTED
            self._notify_connection_event("disconnected")

        except Exception as e:
            self.state = ConnectionState.ERROR
            self._notify_connection_event("error", error=e)
            raise TransportError(f"Failed to stop HTTP server: {e}") from e

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
            remote_url = getattr(self, "remote_url", None)
            if remote_url:
                if not self.client:
                    raise TransportError("HTTP client not initialized")
                response = await self.client.post(
                    f"{remote_url}/mcp/message",
                    json=message_data,
                    timeout=30.0,
                )
                response.raise_for_status()
            else:
                # For local testing only - normally would fail in production
                raise TransportError("No remote URL configured for message sending")

        except Exception as e:
            raise TransportError(f"Failed to send HTTP message: {e}") from e

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
            if not self.client:
                raise TransportError("HTTP client not initialized")
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
            raise TransportError(f"Failed to send to endpoint {url}: {e}") from e

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
