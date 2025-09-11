import json

import pytest
import httpx

from cortex_mlx.mcp_client import MCPClient


@pytest.mark.asyncio
async def test_calls_json_rpc():
    async def handler(request: httpx.Request) -> httpx.Response:
        data = json.loads(request.content.decode())
        assert data["method"] == "ping"
        return httpx.Response(200, json={"jsonrpc": "2.0", "id": data["id"], "result": "pong"})

    transport = httpx.MockTransport(handler)
    client = MCPClient("http://test")
    client._client = httpx.AsyncClient(transport=transport, base_url="http://test")

    result = await client.call("ping")
    assert result == "pong"
    await client.aclose()
