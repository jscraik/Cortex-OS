"""
A2A Bus Implementation for Python with Real A2A Core Integration

Provides A2A message bus functionality for cortex-py with stdio bridge
to communicate with TypeScript A2A core infrastructure.
"""

import asyncio
import logging
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from .models import A2AEnvelope
from .stdio_bridge import A2AStdioBridge, create_a2a_stdio_bridge

logger = logging.getLogger(__name__)


class A2ABusCore:
    """A2A message bus with real A2A core integration via stdio bridge."""

    def __init__(
        self,
        source: str = "urn:cortex:py:mlx",
        bridge: Optional[A2AStdioBridge] = None,
    ):
        """
        Initialize A2A bus with real core integration.

        Args:
            source: Default source URN for published messages
            bridge: Optional custom stdio bridge instance
        """
        self.source = source
        self.handlers: Dict[str, List[Callable[[A2AEnvelope], Any]]] = {}
        self.bridge = bridge or create_a2a_stdio_bridge(source=source)
        self._running = False

    async def __aenter__(self):
        """Async context manager entry."""
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.stop()

    async def start(self):
        """Start the A2A bus with real core integration."""
        if self._running:
            return

        await self.bridge.start()
        self._running = True
        logger.info("A2A bus with real core integration started")

    async def stop(self):
        """Stop the A2A bus."""
        if not self._running:
            return

        await self.bridge.stop()
        self._running = False
        logger.info("A2A bus with real core integration stopped")

    async def publish(self, envelope: A2AEnvelope) -> bool:
        """
        Publish a message to the real A2A core via stdio bridge.

        Args:
            envelope: A2A message envelope

        Returns:
            True if message was successfully published
        """
        if not self._running:
            logger.error("A2A bus not started")
            return False

        try:
            # Ensure envelope has required fields
            if not envelope.source:
                envelope.source = self.source
            if not envelope.time:
                envelope.time = datetime.utcnow().isoformat() + "Z"

            # Publish via stdio bridge to real A2A core
            result = await self.bridge.publish(envelope)

            if result:
                logger.debug(f"Published A2A message via real core: {envelope.type}")

                # Also handle locally if we have handlers (for local subscriptions)
                await self.handle_message(envelope)

            return result

        except Exception as e:
            logger.error(f"Error publishing A2A message: {e}")
            return False

    def subscribe(self, event_type: str, handler: Callable[[A2AEnvelope], Any]):
        """
        Subscribe to messages of a specific type.

        Args:
            event_type: Event type to subscribe to
            handler: Function to call when event is received
        """
        if event_type not in self.handlers:
            self.handlers[event_type] = []
        self.handlers[event_type].append(handler)

        # Also subscribe via the bridge to receive messages from real A2A core
        self.bridge.subscribe(event_type, handler)

        logger.debug(f"Subscribed to event type via real A2A core: {event_type}")

    def unsubscribe(self, event_type: str, handler: Callable[[A2AEnvelope], Any]):
        """
        Unsubscribe from messages of a specific type.

        Args:
            event_type: Event type to unsubscribe from
            handler: Function to remove from handlers
        """
        if event_type in self.handlers:
            try:
                self.handlers[event_type].remove(handler)
                if not self.handlers[event_type]:
                    del self.handlers[event_type]

                # Also unsubscribe from bridge
                self.bridge.unsubscribe(event_type, handler)

                logger.debug(f"Unsubscribed from event type: {event_type}")
            except ValueError:
                logger.warning(f"Handler not found for event type: {event_type}")

    async def handle_message(self, envelope: A2AEnvelope):
        """
        Handle incoming message by calling registered handlers.

        Args:
            envelope: A2A message envelope
        """
        handlers = self.handlers.get(envelope.type, [])

        for handler in handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(envelope)
                else:
                    handler(envelope)
            except Exception as e:
                logger.error(f"Error in event handler for {envelope.type}: {e}")

    async def health_check(self) -> Dict[str, Any]:
        """
        Get health status of the A2A bus.

        Returns:
            Health status dictionary
        """
        bridge_health = await self.bridge.health_check()

        return {
            "bus_type": "real_a2a_core",
            "running": self._running,
            "source": self.source,
            "subscriptions": len(self.handlers),
            "event_types": list(self.handlers.keys()),
            "bridge": bridge_health,
        }

    def get_bridge(self) -> A2AStdioBridge:
        """
        Get access to the underlying stdio bridge.

        Returns:
            The stdio bridge instance
        """
        return self.bridge

    def is_real_a2a_core(self) -> bool:
        """
        Check if this bus uses real A2A core integration.

        Returns:
            Always True for this implementation
        """
        return True


def create_a2a_bus_with_core(
    source: str = "urn:cortex:py:mlx",
    bridge: Optional[A2AStdioBridge] = None,
) -> A2ABusCore:
    """
    Create an A2A bus instance with real A2A core integration.

    Args:
        source: Default source URN for published messages
        bridge: Optional custom stdio bridge instance

    Returns:
        Configured A2A bus instance with real core integration
    """
    return A2ABusCore(source=source, bridge=bridge)


# For backward compatibility, update the main factory function
def create_a2a_bus(
    source: str = "urn:cortex:py:mlx", use_real_core: bool = True, **kwargs
):
    """
    Create an A2A bus instance.

    Args:
        source: Default source URN for published messages
        use_real_core: Whether to use real A2A core integration (default: True)
        **kwargs: Additional arguments (for backward compatibility)

    Returns:
        Configured A2A bus instance
    """
    if use_real_core:
        # Use real A2A core integration
        return create_a2a_bus_with_core(source=source)
    else:
        # Fallback to HTTP transport for legacy support
        from .bus import A2ABus

        logger.warning("Using legacy HTTP transport instead of real A2A core")
        return A2ABus(source=source, **kwargs)
