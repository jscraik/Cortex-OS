"""Deeper validation simulating inspector interaction by enumerating tools and invoking them."""

import importlib

import pytest


@pytest.mark.asyncio
async def test_tool_round_trip_search_and_fetch():
    mod = importlib.import_module("cortex_fastmcp_server_v2")
    mcp = mod.create_server()

    # Ensure expected tools exist
    tool_funcs = getattr(mcp, "_raw_funcs", {})
    tool_names = set(tool_funcs.keys())
    assert {"search", "fetch", "ping", "health_check", "list_capabilities"}.issubset(
        tool_names
    )

    # Invoke search tool
    search_result = await tool_funcs["search"]("vector database")  # type: ignore[attr-defined]
    assert search_result["results"]
    first_id = search_result["results"][0]["id"]

    # Invoke fetch tool
    fetch_result = await tool_funcs["fetch"](first_id)  # type: ignore[attr-defined]
    assert fetch_result["id"] == first_id
    assert "Complete content" in fetch_result["text"]

    # Capabilities
    caps = await tool_funcs["list_capabilities"]()  # type: ignore[attr-defined]
    assert "tools" in caps and len(caps["tools"]) >= 5
