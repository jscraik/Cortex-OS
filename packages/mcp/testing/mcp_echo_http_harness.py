#!/usr/bin/env python3
"""
Minimal MCP HTTP transport harness:
- Starts HTTPTransport with an echo handler
- Sends a real HTTP POST via httpx to /mcp/message
- Prints result and exits 0 on success

Run with ephemeral deps using uv:
  uv run --no-sync --with httpx --with fastapi --with uvicorn python packages/mcp/testing/mcp_echo_http_harness.py
"""

import asyncio
import json
import socket
import sys
from pathlib import Path
from typing import Any

# Ensure the directory that contains the `mcp` package (packages/) is on sys.path
PKG_PARENT = Path(__file__).resolve().parents[2]
if str(PKG_PARENT) not in sys.path:
    sys.path.insert(0, str(PKG_PARENT))

from mcp.core.protocol import MCPMessage, MessageType  # noqa: E402
from mcp.core.transports.http_transport import HTTPTransport  # noqa: E402


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


async def _echo_handler(message: MCPMessage) -> MCPMessage | None:
    # keep function asynchronous for linters
    await asyncio.sleep(0)
    # No response for notifications
    if message.type == MessageType.NOTIFICATION:
        return None
    return MCPMessage(
        type=MessageType.RESPONSE,
        id=message.id,
        result={"echo": message.params or {}},
    )


async def main() -> int:
    port = _free_port()
    transport = HTTPTransport(host="127.0.0.1", port=port)
    transport.set_message_handler(_echo_handler)
    await transport.connect()
    try:
        import httpx

        # Probe readiness
        async with httpx.AsyncClient() as probe:
            for _ in range(50):
                try:
                    r = await probe.get(f"http://127.0.0.1:{port}/mcp/health", timeout=1.0)
                    if r.status_code == 200:
                        break
                except Exception:
                    await asyncio.sleep(0.1)

        # Send request
        req = MCPMessage(
            type=MessageType.REQUEST,
            id="h-1",
            method="echo",
            params={"hello": "world"},
        )
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"http://127.0.0.1:{port}/mcp/message",
                json=json.loads(req.to_json()),
                timeout=10.0,
            )
            resp.raise_for_status()
            data: dict[str, Any] = resp.json()
            assert data.get("result", {}).get("echo", {}).get("hello") == "world"
            print("MCP HTTP harness OK:", data)
        return 0
    finally:
        await transport.disconnect()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
