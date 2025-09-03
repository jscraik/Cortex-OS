"""Example of creating a simple plugin."""

from typing import Any

from mcp.core.protocol import Tool
from mcp.plugins.base import BasePlugin


class MyPlugin(BasePlugin):
    async def initialize(self) -> None:
        self.initialized = True

    async def cleanup(self) -> None:
        self.initialized = False

    def get_tools(self) -> list[Tool]:
        return [
            Tool(
                name="hello",
                description="Say hello",
                parameters={
                    "type": "object",
                    "properties": {"name": {"type": "string"}},
                },
            )
        ]

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> Any:
        if tool_name == "hello":
            return f"Hello, {arguments.get('name', 'World')}!"
        raise ValueError("Unknown tool")
