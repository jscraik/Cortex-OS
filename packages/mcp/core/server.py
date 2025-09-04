import logging
from typing import Any

from ..config.config_manager import ConfigManager
from ..plugins.hot_reloader import PluginHotReloader
from .protocol import MCPMessage, MCPProtocolHandler, MessageType


class MCPServer:
    def __init__(self, config: dict[str, Any]):
        self.config = config
        self.protocol_handler = MCPProtocolHandler()
        self.plugin_reloader = PluginHotReloader(
            plugin_dir=config.get("plugin_dir", "plugins"),
            auto_reload=config.get("auto_reload", True),
        )
        self.logger = logging.getLogger(__name__)
        self.running = False

    async def initialize(self):
        """Initialize the server."""
        self.logger.info("Initializing MCP Server")

        # Load configuration
        self.config_manager = ConfigManager(
            config_dir=self.config.get("config_dir", "config")
        )

        # Initialize plugins
        await self.plugin_reloader.initialize()

        # Register server handlers
        self.protocol_handler.register_handler("tools/list", self._handle_tools_list)
        self.protocol_handler.register_handler("tools/call", self._handle_tools_call)

        # Register plugin handlers
        for plugin_name in self.plugin_reloader.list_plugins():
            plugin = self.plugin_reloader.get_plugin(plugin_name)
            for tool in plugin.get_tools():
                self.protocol_handler.register_handler(
                    f"{plugin_name}.{tool.name}",
                    self._create_plugin_handler(plugin, tool.name),
                )

        self.logger.info("MCP Server initialized successfully")

    async def start(self):
        """Start the server."""
        self.running = True
        self.logger.info("MCP Server started")

        # Start plugin hot-reloader
        await self.plugin_reloader.start()

    async def stop(self):
        """Stop the server."""
        self.running = False
        await self.plugin_reloader.stop()
        self.logger.info("MCP Server stopped")

    async def handle_message(self, message: MCPMessage) -> MCPMessage:
        """Handle an incoming MCP message."""
        response = await self.protocol_handler.handle_message(message)
        if response is None:
            # Normalize notifications into an empty response for callers expecting a message
            return MCPMessage(type=MessageType.RESPONSE, id=message.id, result={})
        return response

    async def _handle_tools_list(
        self, _params: dict[str, Any] | None
    ) -> dict[str, Any]:
        """Handle tools/list request."""
        tools = []

        # Get server tools
        tools.extend(
            [
                {
                    "name": "server_info",
                    "description": "Get server information",
                    "parameters": {},
                }
            ]
        )

        # Get plugin tools
        for plugin_name in self.plugin_reloader.list_plugins():
            plugin = self.plugin_reloader.get_plugin(plugin_name)
            for tool in plugin.get_tools():
                tools.append(
                    {
                        "name": f"{plugin_name}.{tool.name}",
                        "description": tool.description,
                        "parameters": tool.parameters,
                    }
                )

        return {"tools": tools}

    async def _handle_tools_call(self, params: dict[str, Any] | None) -> dict[str, Any]:
        """Handle tools/call request."""
        params = params or {}
        tool_name = params.get("name")
        arguments = params.get("parameters", {})

        # Split plugin and tool name
        if tool_name and "." in tool_name:
            plugin_name, actual_tool_name = tool_name.split(".", 1)
            plugin = self.plugin_reloader.get_plugin(plugin_name)
            return await plugin.call_tool(actual_tool_name, arguments)
        # Handle server tools
        if tool_name == "server_info":
            return {
                "name": "MCP Server",
                "version": "1.0.0",
                "plugins": self.plugin_reloader.list_plugins(),
                "status": "running" if self.running else "stopped",
            }
        raise ValueError(f"Unknown server tool: {tool_name}")

    def _create_plugin_handler(self, plugin: Any, tool_name: str) -> Any:
        """Create a handler for a plugin tool."""

        async def handler(params: dict[str, Any] | None) -> Any:
            return await plugin.call_tool(tool_name, params)

        return handler
