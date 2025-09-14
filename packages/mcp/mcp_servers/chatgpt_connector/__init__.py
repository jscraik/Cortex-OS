"""ChatGPT Connector MCP Server for Cortex-OS."""

from importlib.metadata import PackageNotFoundError, version
from typing import Final

try:
    __version__: Final[str] = version("cortex-mcp-chatgpt-connector")
except PackageNotFoundError:
    __version__ = "0.0.0+local"

__all__ = ["__version__"]
