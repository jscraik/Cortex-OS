"""Tests for health_check MCP tool and /health HTTP endpoint."""

import importlib

import pytest

try:
    import httpx  # type: ignore
except ImportError:  # pragma: no cover
    httpx = None  # type: ignore


@pytest.mark.asyncio
async def test_health_tool_and_http_endpoint():
    module = importlib.import_module("cortex_fastmcp_server_v2")
    mcp = module.create_server()

    # Invoke health_check tool directly using FastMCP's public API
    tools = await mcp.get_tools()
    assert "health_check" in tools, "health_check tool should be registered"
    
    # Get the tool function and call it
    health_tool_fn = tools["health_check"]
    tool_result = await health_tool_fn.run({})  # No arguments required for health_check
    
    # Extract JSON content from the ToolResult
    import json
    json_text = tool_result.content[0].text
    result = json.loads(json_text)
    
    assert result["status"] == "ok"
    assert result["version"] == "2.0.0"

    # If FastAPI app is present, test /health route using ASGI transport
    app = getattr(mcp, "app", None)
    if httpx and app:  # pragma: no branch
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:  # type: ignore[arg-type]
            resp = await client.get("/health")
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "ok"
            assert data["version"] == "2.0.0"
