import asyncio
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from ..core.protocol import Tool


class BasePlugin(ABC):
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.name = self.__class__.__name__.lower().replace("plugin", "")
        self.version = "1.0.0"
        self.initialized = False

    @abstractmethod
    async def initialize(self) -> None:
        """Initialize the plugin."""

    @abstractmethod
    async def cleanup(self) -> None:
        """Clean up the plugin resources."""

    @abstractmethod
    def get_tools(self) -> List[Tool]:
        """Return the list of tools provided by this plugin."""

    @abstractmethod
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Call a tool by name with the given arguments."""

    def get_config(self, key: str, default: Any = None) -> Any:
        """Get a configuration value."""
        return self.config.get(key, default)

    def set_config(self, key: str, value: Any) -> None:
        """Set a configuration value."""
        self.config[key] = value
