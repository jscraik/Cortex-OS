"""Base transport interface for MCP protocol."""

import asyncio
import logging
from abc import ABC, abstractmethod
from collections.abc import Awaitable, Callable
from enum import Enum
from typing import Any

from ..protocol import MCPMessage

logger = logging.getLogger(__name__)


class ConnectionState(Enum):
    """Connection state enumeration."""

    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTING = "disconnecting"
    ERROR = "error"


class TransportError(Exception):
    """Base transport error."""

    pass


class MCPTransport(ABC):
    """Base transport interface for MCP communication."""

    def __init__(self) -> None:
        self.state = ConnectionState.DISCONNECTED
        # Handler returning an MCPMessage when a message is received
        # May return None for notifications (no response expected)
        self.message_handler: Callable[[MCPMessage], Awaitable[MCPMessage | None]] | None = None
        # Connection event callbacks
        self._connection_callbacks: dict[str, Callable[..., None]] = {}

    @abstractmethod
    async def connect(self, **kwargs: Any) -> None:
        """Establish connection."""
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """Close connection."""
        pass

    @abstractmethod
    async def send_message(self, message: MCPMessage) -> None:
        """Send a message through the transport."""
        pass

    @abstractmethod
    async def receive_messages(self) -> None:
        """Start receiving messages (should run indefinitely)."""
        pass

    def set_message_handler(
        self, handler: Callable[[MCPMessage], Awaitable[MCPMessage | None]]
    ) -> None:
        """Set the message handler callback."""
        self.message_handler = handler

    def add_connection_callback(self, event: str, callback: Callable[..., None]) -> None:
        """Add callback for connection events (connected, disconnected, error)."""
        self._connection_callbacks[event] = callback

    def _notify_connection_event(self, event: str, **kwargs: Any) -> None:
        """Notify connection event callbacks."""
        callback = self._connection_callbacks.get(event)
        if callback:
            try:
                callback(**kwargs)
            except Exception:
                # Log error but don't propagate to avoid breaking transport
                logger.exception("Connection callback error for %s", event)

    @property
    def is_connected(self) -> bool:
        """Check if transport is connected."""
        return self.state == ConnectionState.CONNECTED

    async def health_check(self) -> dict[str, Any]:
        """Perform health check on transport."""
        # Yield control briefly to ensure this async method exercises await
        # in implementations that don't need real async work.
        await asyncio.sleep(0)
        return {
            "state": self.state.value,
            "connected": self.is_connected,
        }
