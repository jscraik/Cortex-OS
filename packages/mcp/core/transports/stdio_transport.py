"""STDIO transport implementation for MCP protocol."""

import asyncio
import json
import logging
import sys
from typing import Any, TextIO

from ..protocol import MCPMessage
from .base import ConnectionState, MCPTransport, TransportError

logger = logging.getLogger(__name__)


class STDIOTransport(MCPTransport):
    """STDIO-based transport for MCP protocol - ideal for CLI integration."""

    def __init__(self, stdin: TextIO | None = None, stdout: TextIO | None = None):
        super().__init__()
        self.stdin = stdin or sys.stdin
        self.stdout = stdout or sys.stdout
        self._receive_task: asyncio.Task | None = None
        self._reader: asyncio.StreamReader | None = None
        self._writer: asyncio.StreamWriter | None = None

    async def connect(self, **kwargs) -> None:
        """Setup STDIO streams for communication."""
        try:
            self.state = ConnectionState.CONNECTING

            # Create async streams from STDIO
            loop = asyncio.get_running_loop()

            # Setup async reader for stdin
            self._reader = asyncio.StreamReader()
            reader_protocol = asyncio.StreamReaderProtocol(self._reader)
            await loop.connect_read_pipe(lambda: reader_protocol, self.stdin)

            # Setup async writer for stdout
            writer_transport, writer_protocol = await loop.connect_write_pipe(
                asyncio.streams.FlowControlMixin, self.stdout
            )
            self._writer = asyncio.StreamWriter(
                writer_transport, writer_protocol, self._reader, loop
            )

            self.state = ConnectionState.CONNECTED
            self._notify_connection_event("connected")
            logger.info("STDIO transport connected")

            # Start receiving messages
            self._receive_task = asyncio.create_task(self.receive_messages())

        except Exception as e:
            self.state = ConnectionState.ERROR
            self._notify_connection_event("error", error=e)
            raise TransportError(f"Failed to setup STDIO transport: {e}")

    async def disconnect(self) -> None:
        """Close STDIO transport."""
        try:
            self.state = ConnectionState.DISCONNECTING

            # Cancel receive task
            if self._receive_task:
                self._receive_task.cancel()
                try:
                    await self._receive_task
                except asyncio.CancelledError:
                    pass

            # Close writer
            if self._writer:
                self._writer.close()
                await self._writer.wait_closed()

            self.state = ConnectionState.DISCONNECTED
            self._notify_connection_event("disconnected")
            logger.info("STDIO transport disconnected")

        except Exception as e:
            self.state = ConnectionState.ERROR
            self._notify_connection_event("error", error=e)
            raise TransportError(f"Failed to close STDIO transport: {e}")

    async def send_message(self, message: MCPMessage) -> None:
        """Send message to STDOUT."""
        if not self.is_connected:
            raise TransportError("Transport not connected")

        if not self._writer:
            raise TransportError("Writer not available")

        try:
            message_json = message.to_json()
            self._writer.write(f"{message_json}\n".encode())
            await self._writer.drain()

        except Exception as e:
            raise TransportError(f"Failed to send STDIO message: {e}")

    async def receive_messages(self) -> None:
        """Receive messages from STDIN."""
        if not self._reader:
            raise TransportError("Reader not available")

        try:
            while self.is_connected:
                # Read line from stdin
                line_bytes = await self._reader.readline()
                if not line_bytes:
                    # EOF reached
                    logger.info("STDIN EOF reached, disconnecting")
                    break

                line = line_bytes.decode("utf-8").strip()
                if not line:
                    continue

                try:
                    # Parse message
                    message = MCPMessage.from_json(line)

                    if self.message_handler:
                        # Process message and send response
                        response_message = await self.message_handler(message)
                        await self.send_message(response_message)
                    else:
                        logger.warning("No message handler configured")

                except json.JSONDecodeError:
                    logger.error(f"Received invalid JSON: {line}")
                    error_message = MCPMessage(
                        type=MessageType.ERROR,
                        id="unknown",
                        error={"code": -32700, "message": "Parse error"},
                    )
                    await self.send_message(error_message)
                except Exception as e:
                    logger.error(f"Error processing STDIO message: {e}")
                    error_message = MCPMessage(
                        type=MessageType.ERROR,
                        id="unknown",
                        error={"code": -32603, "message": "Internal error"},
                    )
                    await self.send_message(error_message)

        except asyncio.CancelledError:
            logger.info("STDIO receive task cancelled")
        except Exception as e:
            logger.error(f"Error in STDIO receive loop: {e}")
            self.state = ConnectionState.ERROR
            self._notify_connection_event("error", error=e)

    async def send_interactive_message(self, message: str) -> None:
        """Send a human-readable message (not MCP protocol)."""
        if not self.is_connected or not self._writer:
            raise TransportError("Transport not connected")

        try:
            self._writer.write(f"{message}\n".encode())
            await self._writer.drain()
        except Exception as e:
            raise TransportError(f"Failed to send interactive message: {e}")

    async def read_interactive_input(self) -> str:
        """Read a line of interactive input."""
        if not self.is_connected or not self._reader:
            raise TransportError("Transport not connected")

        try:
            line_bytes = await self._reader.readline()
            return line_bytes.decode("utf-8").strip()
        except Exception as e:
            raise TransportError(f"Failed to read interactive input: {e}")

    async def health_check(self) -> dict[str, Any]:
        """Enhanced health check for STDIO transport."""
        base_health = await super().health_check()
        return {
            **base_health,
            "transport": "stdio",
            "reader_available": self._reader is not None,
            "writer_available": self._writer is not None,
            "receive_task_running": self._receive_task is not None
            and not self._receive_task.done(),
        }
