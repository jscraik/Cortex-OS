"""
A2A Bus Implementation for Python

Provides A2A message bus functionality for cortex-py with HTTP transport
to communicate with TypeScript A2A infrastructure.
"""

import asyncio
import logging
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

import httpx
from asyncio_throttle import Throttler

from .models import A2AEnvelope

logger = logging.getLogger(__name__)


class A2ABus:
    """A2A message bus with HTTP transport for cross-language communication."""

    def __init__(
        self,
        source: str = "urn:cortex:py:mlx",
        a2a_endpoint: str = "http://localhost:3001/a2a",
        rate_limit: int = 100,  # messages per minute
        timeout: float = 30.0,
    ):
        """
        Initialize A2A bus.

        Args:
            source: Default source URN for published messages
            a2a_endpoint: HTTP endpoint for A2A message delivery
            rate_limit: Maximum messages per minute
            timeout: HTTP request timeout in seconds
        """
        self.source = source
        self.a2a_endpoint = a2a_endpoint
        self.timeout = timeout
        self.handlers: Dict[str, List[Callable[[A2AEnvelope], Any]]] = {}
        self.throttler = Throttler(rate_limit, 60)  # rate_limit per 60 seconds
        self._client: Optional[httpx.AsyncClient] = None
        self._running = False

    async def __aenter__(self):
        """Async context manager entry."""
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.stop()

    async def start(self):
        """Start the A2A bus."""
        if self._running:
            return

        self._client = httpx.AsyncClient(timeout=self.timeout)
        self._running = True
        logger.info(f"A2A bus started with endpoint: {self.a2a_endpoint}")

    async def stop(self):
        """Stop the A2A bus."""
        if not self._running:
            return

        if self._client:
            await self._client.aclose()
            self._client = None
        self._running = False
        logger.info("A2A bus stopped")

    async def publish(self, envelope: A2AEnvelope) -> bool:
        """
        Publish a message to the A2A bus.

        Args:
            envelope: A2A message envelope

        Returns:
            True if message was successfully published
        """
        if not self._running or not self._client:
            logger.error("A2A bus not started")
            return False

        try:
            # Apply rate limiting
            async with self.throttler:
                # Ensure envelope has required fields
                if not envelope.source:
                    envelope.source = self.source
                if not envelope.time:
                    envelope.time = datetime.utcnow().isoformat() + "Z"

                # Send to A2A endpoint
                response = await self._client.post(
                    f"{self.a2a_endpoint}/publish",
                    json=envelope.dict(),
                    headers={"Content-Type": "application/json"},
                )

                if response.status_code == 200:
                    logger.debug(f"Published A2A message: {envelope.type}")
                    return True
                else:
                    logger.error(
                        f"Failed to publish A2A message: {response.status_code} - {response.text}"
                    )
                    return False

        except Exception as e:
            logger.error(f"Error publishing A2A message: {e}")
            return False

    def subscribe(self, event_type: str, handler: Callable[[A2AEnvelope], Any]):
        """
        Subscribe to messages of a specific type.

        Args:
            event_type: Event type to subscribe to
            handler: Function to handle received messages
        """
        if event_type not in self.handlers:
            self.handlers[event_type] = []
        self.handlers[event_type].append(handler)
        logger.info(f"Subscribed to A2A event type: {event_type}")

    def unsubscribe(self, event_type: str, handler: Callable[[A2AEnvelope], Any]):
        """
        Unsubscribe from messages of a specific type.

        Args:
            event_type: Event type to unsubscribe from
            handler: Handler function to remove
        """
        if event_type in self.handlers:
            try:
                self.handlers[event_type].remove(handler)
                if not self.handlers[event_type]:
                    del self.handlers[event_type]
                logger.info(f"Unsubscribed from A2A event type: {event_type}")
            except ValueError:
                logger.warning(f"Handler not found for event type: {event_type}")

    async def handle_message(self, envelope: A2AEnvelope):
        """
        Handle an incoming A2A message.

        Args:
            envelope: Received A2A message envelope
        """
        handlers = self.handlers.get(envelope.type, [])
        if not handlers:
            logger.debug(f"No handlers for A2A event type: {envelope.type}")
            return

        # Execute handlers concurrently
        tasks = []
        for handler in handlers:
            if asyncio.iscoroutinefunction(handler):
                tasks.append(handler(envelope))
            else:
                # Run sync handlers in thread pool
                tasks.append(
                    asyncio.get_event_loop().run_in_executor(None, handler, envelope)
                )

        if tasks:
            try:
                await asyncio.gather(*tasks, return_exceptions=True)
                logger.debug(f"Handled A2A message: {envelope.type}")
            except Exception as e:
                logger.error(f"Error handling A2A message: {e}")

    async def health_check(self) -> Dict[str, Any]:
        """
        Check the health of the A2A bus.

        Returns:
            Health status information
        """
        status = {
            "running": self._running,
            "endpoint": self.a2a_endpoint,
            "subscriptions": len(self.handlers),
            "event_types": list(self.handlers.keys()),
        }

        if self._running and self._client:
            try:
                response = await self._client.get(f"{self.a2a_endpoint}/health")
                status["endpoint_healthy"] = response.status_code == 200
                status["endpoint_response_time"] = response.elapsed.total_seconds()
            except Exception as e:
                status["endpoint_healthy"] = False
                status["endpoint_error"] = str(e)
        else:
            status["endpoint_healthy"] = None

        return status


def create_a2a_bus(
    source: str = "urn:cortex:py:mlx",
    a2a_endpoint: Optional[str] = None,
    rate_limit: int = 100,
    timeout: float = 30.0,
) -> A2ABus:
    """
    Create an A2A bus instance.

    Args:
        source: Default source URN for published messages
        a2a_endpoint: HTTP endpoint for A2A message delivery (defaults to localhost:3001)
        rate_limit: Maximum messages per minute
        timeout: HTTP request timeout in seconds

    Returns:
        Configured A2A bus instance
    """
    if a2a_endpoint is None:
        # Try to connect to cortex-os A2A endpoint
        a2a_endpoint = "http://localhost:3001/a2a"

    return A2ABus(
        source=source,
        a2a_endpoint=a2a_endpoint,
        rate_limit=rate_limit,
        timeout=timeout,
    )
