from __future__ import annotations

from typing import AsyncGenerator

import pytest_asyncio

from cortex_mlx.testing import MCPTestFixture, create_fixture


@pytest_asyncio.fixture
async def mcp_test_fixture() -> AsyncGenerator[MCPTestFixture, None]:
    fixture = create_fixture()
    try:
        yield fixture
    finally:
        await fixture.aclose()


@pytest_asyncio.fixture
async def mock_mcp_server(mcp_test_fixture: MCPTestFixture):
    return mcp_test_fixture.server


@pytest_asyncio.fixture
async def mcp_test_client(mcp_test_fixture: MCPTestFixture):
    return mcp_test_fixture.client
