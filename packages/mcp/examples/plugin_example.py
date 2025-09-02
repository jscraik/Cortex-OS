"""Example of creating a simple plugin."""

from mcp.plugins.base import BasePlugin
from mcp.core.protocol import Tool
from typing import Dict, Any, List


class MyPlugin(BasePlugin):
    async def initialize(self) -> None:
        self.initialized = True

    async def cleanup(self) -> None:
        self.initialized = False

    def get_tools(self) -> List[Tool]:
        return [
            Tool(
                name="hello",
                description="Say hello",
                parameters={"type": "object", "properties": {"name": {"type": "string"}}},
            )
        ]

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        if tool_name == "hello":
            return f"Hello, {arguments.get('name', 'World')}!"
        raise ValueError("Unknown tool")
