from __future__ import annotations

import pytest

from cortex_mlx.testing import (
    MockMCPError,
    assert_response_contains,
    assert_tool_called,
    structured_content,
    text_content,
)


@pytest.mark.asyncio
async def test_mock_server_returns_registered_response(mock_mcp_server, mcp_test_client):
    mock_mcp_server.register_tool(
        "echo",
        lambda args: text_content(f"echo:{args.get('message', '')}"),
    )

    result = await mcp_test_client.call_tool("echo", {"message": "hello"})

    assert_response_contains(result, text="echo:hello")
    calls = await assert_tool_called(mock_mcp_server, "echo", times=1)
    assert calls[0].arguments["message"] == "hello"


@pytest.mark.asyncio
async def test_assert_tool_called_with_predicate(mock_mcp_server, mcp_test_client):
    mock_mcp_server.register_tool("echo", lambda args: text_content(args.get("message", "")))

    await mcp_test_client.call_tool("echo", {"message": "alpha"})
    await mcp_test_client.call_tool("echo", {"message": "beta"})

    calls = await assert_tool_called(
        mock_mcp_server,
        "echo",
        times=1,
        where=lambda call: call.arguments.get("message") == "beta",
    )
    assert calls[0].arguments["message"] == "beta"


@pytest.mark.asyncio
async def test_structured_response_helper(mock_mcp_server, mcp_test_client):
    async def add(args: dict[str, int]):
        a = int(args.get("a", 0))
        b = int(args.get("b", 0))
        return structured_content({"sum": a + b})

    mock_mcp_server.register_tool("add", add)

    result = await mcp_test_client.call_tool("add", {"a": 2, "b": 3})
    assert_response_contains(result, structured={"sum": 5})

    await mcp_test_client.ping()
    assert mock_mcp_server.ping_count == 1

    await mcp_test_client.close()
    with pytest.raises(MockMCPError):
        await mcp_test_client.call_tool("add", {})
