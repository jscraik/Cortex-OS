"""Tests for plugin infrastructure."""

from typing import Any

import pytest

from mcp.core.protocol import Tool
from mcp.plugins.base import BasePlugin


class DummyPlugin(BasePlugin):
    async def initialize(self) -> None:
        self.initialized = True

    async def cleanup(self) -> None:
        self.initialized = False

    def get_tools(self) -> list[Tool]:
        return []

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> Any:
        raise NotImplementedError


@pytest.mark.asyncio
async def test_plugin_lifecycle():
    plugin = DummyPlugin({})
    await plugin.initialize()
    assert plugin.initialized
    await plugin.cleanup()
    assert not plugin.initialized
