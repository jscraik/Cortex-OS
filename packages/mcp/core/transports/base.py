"""Base transport interface for MCP protocol."""

import asyncio
from abc import ABC, abstractmethod
from collections.abc import Callable
from enum import Enum
from typing import Any

from ..protocol import MCPMessage


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

    def __init__(self):
        self.state = ConnectionState.DISCONNECTED
        self.message_handler: Callable[[MCPMessage], asyncio.Task] | None = None
        self._connection_callbacks: dict[str, Callable] = {}

    @abstractmethod
    async def connect(self, **kwargs) -> None:
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
        self, handler: Callable[[MCPMessage], asyncio.Task]
    ) -> None:
        """Set the message handler callback."""
        self.message_handler = handler

    def add_connection_callback(self, event: str, callback: Callable) -> None:
        """Add callback for connection events (connected, disconnected, error)."""
        self._connection_callbacks[event] = callback

    def _notify_connection_event(self, event: str, **kwargs) -> None:
        """Notify connection event callbacks."""
        callback = self._connection_callbacks.get(event)
        if callback:
            try:
                callback(**kwargs)
            except Exception as e:
                # Log error but don't propagate to avoid breaking transport
                print(f"Connection callback error for {event}: {e}")

    @property
    def is_connected(self) -> bool:
        """Check if transport is connected."""
        return self.state == ConnectionState.CONNECTED

    async def health_check(self) -> dict[str, Any]:
        """Perform health check on transport."""
        return {
            "state": self.state.value,
            "connected": self.is_connected,
        }
