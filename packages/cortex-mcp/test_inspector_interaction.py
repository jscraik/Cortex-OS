"""Deeper validation simulating inspector interaction by enumerating tools and invoking them."""

import importlib

import pytest


@pytest.mark.asyncio
async def test_tool_round_trip_search_and_fetch():
    mod = importlib.import_module("cortex_fastmcp_server_v2")
    mcp = mod.create_server()

    # Ensure expected tools exist via public API
    tools = await mcp.get_tools()
    for name in ["search", "fetch", "ping", "health_check", "list_capabilities"]:
        assert name in tools

    # Invoke search tool
    search_tool = tools["search"]
    search_res = await search_tool.run({"query": "vector database"})
    import json
    search_payload = json.loads(search_res.content[0].text)
    assert search_payload["results"]
    first_id = search_payload["results"][0]["id"]

    # Invoke fetch tool
    fetch_tool = tools["fetch"]
    fetch_res = await fetch_tool.run({"resource_id": first_id})
    fetch_payload = json.loads(fetch_res.content[0].text)
    assert fetch_payload["id"] == first_id
    assert "Complete content" in fetch_payload["text"]

    # Capabilities
    caps_tool = tools["list_capabilities"]
    caps_res = await caps_tool.run({})
    caps_payload = json.loads(caps_res.content[0].text)
    assert "tools" in caps_payload and len(caps_payload["tools"]) >= 5
