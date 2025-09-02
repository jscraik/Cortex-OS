from .base import BasePlugin
from ..core.protocol import Tool
from typing import Dict, Any, List


class GitPlugin(BasePlugin):
    async def initialize(self) -> None:
        self.initialized = True

    async def cleanup(self) -> None:
        self.initialized = False

    def get_tools(self) -> List[Tool]:
        return []

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        raise NotImplementedError
