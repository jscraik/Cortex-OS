import asyncio
import json

import pytest

from mcp_bridge.bridge import MCPBridge, RateConfig


@pytest.mark.asyncio
async def test_bridge_enqueue_and_forward_sleep(monkeypatch):
    # Arrange a fake http client
    posts = []

    class DummyClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url, json=None):
            posts.append((url, json))

    class DummyHTTPX:
        def __init__(self, *_, **__):
            pass

        def __call__(self, *_, **__):
            return self

        def __getattr__(self, _):
            return DummyClient

    # Monkeypatch httpx.AsyncClient used in bridge module
    monkeypatch.setattr("mcp_bridge.bridge.httpx.AsyncClient", DummyClient)

    sleep_calls = {"count": 0}

    async def fake_sleep(_t):
        sleep_calls["count"] += 1
        await asyncio.sleep(0)

    bridge = MCPBridge(
        outbound_url="http://example/ingest",
        rate=RateConfig(messages_per_sec=1.0),
        sleep_func=fake_sleep,
    )

    await bridge.enqueue_stdio(json.dumps({"id": "1"}))
    await bridge.enqueue_stdio(json.dumps({"id": "2"}))

    # Run a few steps of the forward loop
    async def runner():
        await asyncio.wait_for(bridge.forward_loop(), timeout=0.05)

    with pytest.raises(asyncio.TimeoutError):
        await runner()

    assert posts, "Expected at least one forwarded post"
    # With rate=1/sec and 2 items, at least one sleep should occur
    assert sleep_calls["count"] >= 1

