# pyright: reportUnknownMemberType=false, reportUnknownVariableType=false, reportUnknownArgumentType=false, reportMissingImports=false
# ruff: noqa: I001,ASYNC101
import asyncio
import importlib.util
import json
import socket
from typing import Any

import pytest

from mcp.core.protocol import MCPMessage, MessageType
from mcp.core.transports.http_transport import HTTPTransport
from mcp.core.transports.websocket_transport import WebSocketTransport
from mcp.core.transports.stdio_transport import STDIOTransport


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    return int(port)


async def _echo_handler(message: MCPMessage) -> MCPMessage | None:
    # ensure function is truly async for linters
    await asyncio.sleep(0)
    # For notifications, return no response
    if message.type == MessageType.NOTIFICATION:
        return None
    return MCPMessage(
        type=MessageType.RESPONSE,
        id=message.id,
        result={"echo": message.params or {}},
    )


@pytest.mark.integration
@pytest.mark.asyncio
async def test_http_transport_smoke() -> None:
    # Skip if optional deps are missing
    if (
        importlib.util.find_spec("httpx") is None
        or importlib.util.find_spec("uvicorn") is None
        or importlib.util.find_spec("fastapi") is None
    ):
        pytest.skip("fastapi/uvicorn/httpx not installed")

    port = _find_free_port()
    transport = HTTPTransport(host="127.0.0.1", port=port)
    transport.set_message_handler(_echo_handler)
    await transport.connect()
    try:
        import httpx
        # Wait for server readiness
        async with httpx.AsyncClient() as probe:
            for _ in range(50):
                try:
                    r = await probe.get(f"http://127.0.0.1:{port}/mcp/health", timeout=1.0)
                    if r.status_code == 200:
                        break
                except Exception:
                    pass
                await asyncio.sleep(0.1)

        # Request should return 200 with response
        async with httpx.AsyncClient() as client:
            req = MCPMessage(
                type=MessageType.REQUEST,
                id="1",
                method="echo",
                params={"foo": "bar"},
            )
            resp = await client.post(
                f"http://127.0.0.1:{port}/mcp/message",
                json=json.loads(req.to_json()),
                timeout=10.0,
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data.get("result", {}).get("echo", {}).get("foo") == "bar"

            # Notification should return 204
            note = MCPMessage(
                type=MessageType.NOTIFICATION,
                id="2",
                method="notify",
                params={"poke": True},
            )
            resp2 = await client.post(
                f"http://127.0.0.1:{port}/mcp/message",
                json=json.loads(note.to_json()),
                timeout=10.0,
            )
            assert resp2.status_code == 204

            # Health/info endpoints
            health = await client.get(f"http://127.0.0.1:{port}/mcp/health")
            assert health.status_code == 200
            info = await client.get(f"http://127.0.0.1:{port}/mcp/info")
            assert info.status_code == 200
            assert info.json().get("transport") == "http"
    finally:
        await transport.disconnect()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_websocket_transport_smoke() -> None:
    # Skip if websockets is missing
    if importlib.util.find_spec("websockets") is None:
        pytest.skip("websockets not installed")

    port = _find_free_port()
    transport = WebSocketTransport(host="127.0.0.1", port=port)
    transport.set_message_handler(_echo_handler)
    await transport.connect()
    try:
        uri = f"ws://127.0.0.1:{port}"
        import websockets as ws_lib  # type: ignore[import-not-found]

        # Wait for server readiness
        for _ in range(50):
            try:
                async with ws_lib.connect(uri):
                    break
            except Exception:
                await asyncio.sleep(0.1)

        async with ws_lib.connect(uri) as ws_obj:
            ws: Any = ws_obj
            # Request should receive a response
            req = MCPMessage(
                type=MessageType.REQUEST,
                id="10",
                method="echo",
                params={"x": 1},
            )
            await ws.send(req.to_json())
            raw = await asyncio.wait_for(ws.recv(), timeout=5)
            data = json.loads(raw)
            assert data.get("result", {}).get("echo", {}).get("x") == 1

            # Notification should not receive a response
            note = MCPMessage(
                type=MessageType.NOTIFICATION,
                id="11",
                method="notify",
                params={"signal": True},
            )
            await ws.send(note.to_json())

            # Wait briefly and ensure no message arrives
            with pytest.raises(asyncio.TimeoutError):
                await asyncio.wait_for(ws.recv(), timeout=0.5)

        # Health check
        health = await transport.health_check()
        assert health.get("transport") == "websocket"
    finally:
        await transport.disconnect()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_stdio_transport_smoke() -> None:
    # Fake stdout that captures writes
    class FakeStdout:
        def __init__(self) -> None:
            self.buffer: list[str] = []

        def write(self, text: str) -> None:  # pragma: no cover - trivial
            self.buffer.append(text)

        def flush(self) -> None:  # pragma: no cover - trivial
            pass

        def get_lines(self) -> list[str]:
            # Return complete lines captured so far
            out = "".join(self.buffer)
            return [ln for ln in out.splitlines() if ln]

    fake_out = FakeStdout()
    transport = STDIOTransport(stdin=None, stdout=fake_out)  # type: ignore[arg-type]
    transport.set_message_handler(_echo_handler)
    # Emulate connected state without starting IO tasks
    from mcp.core.transports.base import ConnectionState

    transport.state = ConnectionState.CONNECTED

    # Send a request by invoking the internal line processor
    req_msg = MCPMessage(
        type=MessageType.REQUEST,
        id="100",
        method="echo",
        params={"a": 42},
    )
    await transport._process_incoming_line(req_msg.to_json())  # noqa: SLF001

    lines = fake_out.get_lines()
    assert len(lines) >= 1
    payload = json.loads(lines[-1])
    assert payload.get("result", {}).get("echo", {}).get("a") == 42

    # Send a notification; no new line should be emitted
    before = len(lines)
    note_msg = MCPMessage(
        type=MessageType.NOTIFICATION,
        id="101",
        method="notify",
        params={"n": True},
    )
    await transport._process_incoming_line(note_msg.to_json())  # noqa: SLF001
    after_lines = fake_out.get_lines()
    assert len(after_lines) == before

    # Health check should reflect stdio
    health = await transport.health_check()
    assert health.get("transport") == "stdio"
