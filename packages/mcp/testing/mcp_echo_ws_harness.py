#!/usr/bin/env python3
"""
Minimal MCP WebSocket transport harness:
- Starts WebSocketTransport with an echo handler
- Connects with websockets client and verifies echo
Run:
  uv run --no-sync --with websockets python packages/mcp/testing/mcp_echo_ws_harness.py
"""

import asyncio
import json
import socket
import sys
from pathlib import Path
from typing import Any

# Ensure `packages/` is on sys.path
PKG_PARENT = Path(__file__).resolve().parents[2]
if str(PKG_PARENT) not in sys.path:
    sys.path.insert(0, str(PKG_PARENT))

from mcp.core.protocol import MCPMessage, MessageType  # noqa: E402
from mcp.core.transports.websocket_transport import WebSocketTransport  # noqa: E402


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


async def _echo_handler(message: MCPMessage) -> MCPMessage | None:
    await asyncio.sleep(0)
    if message.type == MessageType.NOTIFICATION:
        return None
    return MCPMessage(
        type=MessageType.RESPONSE,
        id=message.id,
        result={"echo": message.params or {}},
    )


async def main() -> int:
    port = _free_port()
    transport = WebSocketTransport(host="127.0.0.1", port=port)
    transport.set_message_handler(_echo_handler)
    await transport.connect()
    try:
        try:
            import websockets as ws_lib  # type: ignore[import-not-found]
        except Exception as e:  # pragma: no cover - harness
            print("websockets not available:", e)
            return 1

        uri = f"ws://127.0.0.1:{port}"
        # Probe readiness
        for _ in range(50):
            try:
                async with ws_lib.connect(uri):
                    break
            except Exception:
                await asyncio.sleep(0.1)

        async with ws_lib.connect(uri) as ws:
            req = MCPMessage(
                type=MessageType.REQUEST,
                id="w-1",
                method="echo",
                params={"ping": "pong"},
            )
            await ws.send(req.to_json())
            raw = await asyncio.wait_for(ws.recv(), timeout=5)
            data: dict[str, Any] = json.loads(raw)
            assert data.get("result", {}).get("echo", {}).get("ping") == "pong"
            print("MCP WS harness OK:", data)
        return 0
    finally:
        await transport.disconnect()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
