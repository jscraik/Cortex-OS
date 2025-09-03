"""CLI module for MCP management and operations."""

from .auth import auth_commands
from .main import cli
from .plugins import plugin_commands
from .server import server_commands
from .tasks import task_commands
from .tools import tool_commands

__all__ = [
    "cli",
    "server_commands",
    "tool_commands",
    "plugin_commands",
    "task_commands",
    "auth_commands",
]
