"""MCP package."""

from importlib.metadata import PackageNotFoundError, version
from typing import Final

try:
    __version__: Final[str] = version("cortex-mcp")
except PackageNotFoundError:  # editable/dev checkouts without installed dist
    __version__ = "0.0.0+local"

__all__ = ["__version__"]
