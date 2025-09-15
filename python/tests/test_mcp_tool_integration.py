"""Integration tests for MCP tools with the existing MCP client."""

from __future__ import annotations

import json

import httpx
import pytest

from cortex_mlx.mcp import EchoTool, ToolRegistry
from cortex_mlx.mcp_client import MCPClient


@pytest.mark.asyncio
async def test_echo_tool_integration_with_mcp_client() -> None:
    registry = ToolRegistry()
    registry.register(EchoTool())

    async def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content.decode())
        if payload["method"] == "tools/list":
            return httpx.Response(
                200,
                json={
                    "jsonrpc": "2.0",
                    "id": payload["id"],
                    "result": {"tools": registry.list_definitions()},
                },
            )
        if payload["method"] == "tools/call":
            params = payload.get("params", {})
            result = await registry.call_tool(params["name"], params.get("arguments", {}))
            return httpx.Response(
                200,
                json={"jsonrpc": "2.0", "id": payload["id"], "result": result},
            )

        return httpx.Response(
            200,
            json={
                "jsonrpc": "2.0",
                "id": payload["id"],
                "error": {"code": -32601, "message": "Method not found"},
            },
        )

    transport = httpx.MockTransport(handler)
    client = MCPClient("http://test")
    client._client = httpx.AsyncClient(transport=transport, base_url="http://test")

    tools = await client.list_tools()
    assert tools and tools[0]["name"] == "echo"

    response = await client.call_tool("echo", {"message": "Hello", "uppercase": True})
    assert response["content"][0]["text"] == "HELLO"

    await client.aclose()
