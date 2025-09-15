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

    # Invoke health_check tool directly (FastMCP registers tools as attributes on mcp.tools list)
    # We call underlying coroutine via tool function reference in registry
    # FastMCP internally stores tools in _tools (implementation detail)
    raw_funcs = getattr(mcp, "_raw_funcs", {})
    assert "health_check" in raw_funcs
    result = await raw_funcs["health_check"]()
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
