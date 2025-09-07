import json
from unittest.mock import MagicMock

import pytest

from mcp.core.transports.sse_transport import SSETransport


@pytest.mark.asyncio
async def test_sse_transport_receives_valid_message(monkeypatch):
    message = {"id": "1", "type": "request", "jsonrpc": "2.0"}

    class DummyStream:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def aiter_lines(self):
            yield f"data: {json.dumps(message)}"

    def fake_stream(self, method, url):
        return DummyStream()

    monkeypatch.setattr(
        "mcp.core.transports.sse_transport.httpx.AsyncClient.stream", fake_stream
    )

    received: list = []

    async def handler(msg):
        received.append(msg)
        return None

    tracer = MagicMock()
    monkeypatch.setattr(
        "mcp.core.transports.sse_transport.trace.get_tracer", lambda _: tracer
    )

    transport = SSETransport("http://test")
    transport.set_message_handler(handler)
    await transport.connect()
    await transport.receive_messages()

    assert received and received[0].id == "1"
    tracer.start_as_current_span.assert_called_with("sse.receive")
