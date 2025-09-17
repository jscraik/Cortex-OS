#!/usr/bin/env python3
"""
A2A Stdio Bridge for cortex-py

This module provides a bridge between Python cortex-py and TypeScript A2A core
using stdin/stdout communication with JSON messages.
"""

import asyncio
import json
import logging
import sys
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from .models import A2AEnvelope

logger = logging.getLogger(__name__)


class A2AStdioBridge:
    """Bridge between Python cortex-py and TypeScript A2A core via stdio."""

    def __init__(self, source: str = "urn:cortex:py:mlx"):
        """
        Initialize A2A stdio bridge.

        Args:
            source: Default source URN for published messages
        """
        self.source = source
        self.handlers: Dict[str, List[Callable[[A2AEnvelope], Any]]] = {}
        self._running = False
        self._stdin_task: Optional[asyncio.Task] = None

    async def start(self):
        """Start the stdio bridge."""
        if self._running:
            return

        self._running = True
        # Start listening for messages from stdin
        self._stdin_task = asyncio.create_task(self._listen_stdin())
        logger.info("A2A stdio bridge started")

    async def stop(self):
        """Stop the stdio bridge."""
        if not self._running:
            return

        self._running = False
        if self._stdin_task:
            self._stdin_task.cancel()
            try:
                await self._stdin_task
            except asyncio.CancelledError:
                pass
        logger.info("A2A stdio bridge stopped")

    async def publish(self, envelope: A2AEnvelope) -> bool:
        """
        Publish a message via stdio to TypeScript A2A core.

        Args:
            envelope: A2A message envelope

        Returns:
            True if message was successfully published
        """
        if not self._running:
            logger.error("A2A stdio bridge not started")
            return False

        try:
            # Ensure envelope has required fields
            if not envelope.source:
                envelope.source = self.source
            if not envelope.time:
                envelope.time = datetime.utcnow().isoformat() + "Z"

            # Send to stdout (TypeScript will read this)
            message = envelope.dict()
            json_message = json.dumps(message)
            print(json_message, flush=True)
            logger.debug(f"Published A2A message via stdio: {envelope.type}")
            return True

        except Exception as e:
            logger.error(f"Error publishing A2A message via stdio: {e}")
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
        logger.debug(f"Subscribed to event type: {event_type}")

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

    async def _listen_stdin(self):
        """Listen for messages from stdin (TypeScript A2A core)."""
        logger.debug("Started listening for stdin messages")

        try:
            while self._running:
                try:
                    # Read line from stdin
                    line = await asyncio.get_event_loop().run_in_executor(
                        None, sys.stdin.readline
                    )

                    if not line:  # EOF
                        logger.info("Received EOF from stdin, stopping bridge")
                        break

                    line = line.strip()
                    if not line:
                        continue

                    # Parse JSON message
                    try:
                        message_data = json.loads(line)
                        envelope = A2AEnvelope(**message_data)

                        # Handle the message
                        await self.handle_message(envelope)

                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse JSON from stdin: {e}")
                    except Exception as e:
                        logger.error(f"Failed to process envelope from stdin: {e}")

                except Exception as e:
                    logger.error(f"Error reading from stdin: {e}")
                    if not self._running:
                        break

        except asyncio.CancelledError:
            logger.debug("Stdin listener cancelled")
        except Exception as e:
            logger.error(f"Unexpected error in stdin listener: {e}")
        finally:
            logger.debug("Stdin listener stopped")

    async def health_check(self) -> Dict[str, Any]:
        """
        Get health status of the stdio bridge.

        Returns:
            Health status dictionary
        """
        return {
            "bridge_type": "stdio",
            "running": self._running,
            "source": self.source,
            "subscriptions": len(self.handlers),
            "event_types": list(self.handlers.keys()),
        }


def create_a2a_stdio_bridge(
    source: str = "urn:cortex:py:mlx",
) -> A2AStdioBridge:
    """
    Create an A2A stdio bridge instance.

    Args:
        source: Default source URN for published messages

    Returns:
        Configured A2A stdio bridge instance
    """
    return A2AStdioBridge(source=source)


# CLI entry point for stdio bridge mode
async def main():
    """Main entry point when running as stdio bridge."""
    bridge = create_a2a_stdio_bridge()

    try:
        await bridge.start()

        # Keep running until stdin is closed
        while bridge._running:
            await asyncio.sleep(0.1)

    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    except Exception as e:
        logger.error(f"Bridge error: {e}")
    finally:
        await bridge.stop()


if __name__ == "__main__":
    # Configure logging for stdio bridge mode
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        stream=sys.stderr,  # Use stderr for logs so stdout is clean for A2A messages
    )

    asyncio.run(main())
