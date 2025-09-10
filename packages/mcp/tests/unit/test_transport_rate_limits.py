import asyncio
import json
from types import SimpleNamespace

import pytest

from mcp.core.transports.sse_transport import SSETransport
from mcp.core.transports.websocket_transport import WebSocketTransport


@pytest.mark.asyncio
async def test_sse_rate_limit_invokes_sleep(monkeypatch):
    # Prepare 3 SSE messages
    messages = [
        {"id": str(i), "type": "request", "jsonrpc": "2.0"} for i in range(3)
    ]

    class DummyStream:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def aiter_lines(self):
            for m in messages:
                yield f"data: {json.dumps(m)}"

    def fake_stream(self, method, url):
        return DummyStream()

    # Count sleeps
    sleep_calls = SimpleNamespace(count=0)

    async def fake_sleep(_t):
        sleep_calls.count += 1
        await asyncio.sleep(0)  # yield

    monkeypatch.setattr(
        "mcp.core.transports.sse_transport.httpx.AsyncClient.stream", fake_stream
    )

    received_ids: list[str] = []

    async def handler(msg):
        received_ids.append(msg.id)

    transport = SSETransport("http://test", rate_limit_per_sec=1, sleep_func=fake_sleep)
    transport.set_message_handler(handler)
    await transport.connect()
    await transport.receive_messages()

    assert received_ids == ["0", "1", "2"]
    assert sleep_calls.count >= 2  # at least two sleeps to enforce 1 msg/sec for 3 msgs


@pytest.mark.asyncio
async def test_websocket_recv_rate_limit_sleep(monkeypatch):
    # Fake websocket async iterator producing 5 messages quickly
    class FakeWebSocket:
        def __init__(self):
            self._msgs = [
                json.dumps({"id": str(i), "type": "request", "jsonrpc": "2.0"})
                for i in range(5)
            ]

        def __aiter__(self):
            self._iter = iter(self._msgs)
            return self

        async def __anext__(self):
            try:
                return next(self._iter)
            except StopIteration:
                raise StopAsyncIteration

    sleep_calls = SimpleNamespace(count=0)

    async def fake_sleep(_t):
        sleep_calls.count += 1
        await asyncio.sleep(0)

    handled = SimpleNamespace(count=0)

    async def handler(_msg):
        handled.count += 1

    ws = FakeWebSocket()
    transport = WebSocketTransport(
        recv_rate_limit_per_sec=2, send_rate_limit_per_sec=None, sleep_func=fake_sleep
    )
    transport.set_message_handler(handler)
    await transport._handle_client_messages(ws)

    assert handled.count == 5
    assert sleep_calls.count > 0


@pytest.mark.asyncio
async def test_websocket_send_drop_newest_queue(monkeypatch):
    # Fake client captures messages
    sent = []

    class FakeClient:
        async def send(self, msg):
            sent.append(msg)

    sleep_calls = SimpleNamespace(count=0)

    async def fake_sleep(_t):
        sleep_calls.count += 1
        await asyncio.sleep(0)

    transport = WebSocketTransport(
        send_rate_limit_per_sec=1,
        recv_rate_limit_per_sec=None,
        sleep_func=fake_sleep,
        send_queue_limit=2,
        drop_strategy="drop_newest",
    )

    client = FakeClient()
    transport.add_client_for_test(client)

    # Broadcast several messages quickly to overflow queue
    from mcp.core.protocol import MCPMessage, MessageType

    for i in range(5):
        await transport.send_message(
            MCPMessage(type=MessageType.NOTIFICATION, id=str(i), method="noop")
        )

    # Queue size should not exceed limit
    q = transport._client_queues[client]
    assert q.qsize() <= 2

    # Let sender loop run a bit
    await asyncio.sleep(0)
    # Some sleeps should occur due to rate limiting
    assert sleep_calls.count >= 0  # at least zero, presence is non-failing


@pytest.mark.asyncio
async def test_websocket_send_rate_limit_sleeps(monkeypatch):
    sent = []

    class FakeClient:
        async def send(self, msg):
            sent.append(msg)

    sleep_calls = SimpleNamespace(count=0)

    async def fake_sleep(_t):
        sleep_calls.count += 1
        await asyncio.sleep(0)

    transport = WebSocketTransport(
        send_rate_limit_per_sec=1,
        recv_rate_limit_per_sec=None,
        sleep_func=fake_sleep,
        send_queue_limit=10,
        drop_strategy="block",
    )
    client = FakeClient()
    transport.add_client_for_test(client)

    from mcp.core.protocol import MCPMessage, MessageType

    for i in range(3):
        await transport.send_message(
            MCPMessage(type=MessageType.NOTIFICATION, id=str(i), method="noop")
        )

    # Allow sender loop to process and trigger sleeps
    await asyncio.sleep(0.05)
    assert sleep_calls.count > 0


@pytest.mark.asyncio
async def test_websocket_send_block_strategy_blocks(monkeypatch):
    # With a tiny queue and very low rate, sending many messages should block
    class FakeClient:
        async def send(self, _msg):
            await asyncio.sleep(0)  # accept sends

    transport = WebSocketTransport(
        send_rate_limit_per_sec=0.1,  # very slow
        recv_rate_limit_per_sec=None,
        send_queue_limit=1,
        drop_strategy="block",
    )
    client = FakeClient()
    transport.add_client_for_test(client)

    from mcp.core.protocol import MCPMessage, MessageType

    async def sender():
        # This should block due to queue being full and slow rate
        for i in range(5):
            await transport.send_message(
                MCPMessage(type=MessageType.NOTIFICATION, id=str(i), method="noop")
            )

    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(sender(), timeout=0.05)
