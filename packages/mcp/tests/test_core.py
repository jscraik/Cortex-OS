"""Tests for core components."""

import pytest

from mcp.core.protocol import MCPProtocolHandler, MessageType


@pytest.mark.asyncio
async def test_request_response_cycle():
    handler = MCPProtocolHandler()

    async def echo(params):
        return params

    handler.register_handler("echo", echo)
    request = handler.create_request("echo", {"msg": "hi"})
    response = await handler.handle_message(request)
    assert response.type == MessageType.RESPONSE
    assert response.result == {"msg": "hi"}
