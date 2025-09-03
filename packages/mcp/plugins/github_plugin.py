from typing import Any

from ..core.protocol import Tool
from .base import BasePlugin


class GitHubPlugin(BasePlugin):
    async def initialize(self) -> None:
        self.initialized = True

    async def cleanup(self) -> None:
        self.initialized = False

    def get_tools(self) -> list[Tool]:
        return []

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> Any:
        raise NotImplementedError
