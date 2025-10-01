"""MCP package."""

from importlib.metadata import PackageNotFoundError, version
from typing import Final
import warnings

try:
    __version__: Final[str] = version("cortex-mcp")
except PackageNotFoundError:  # editable/dev checkouts without installed dist
    __version__ = "0.0.0+local"

_DEPRECATION_MESSAGE = (
    "cortex-mcp (Python) is now deprecated. Configure clients to call the "
    "@cortex-os/memory-core HTTP endpoint via LOCAL_MEMORY_BASE_URL and migrate "
    "automations to the Node MCP server. This package will be removed after Phase 8."
)

warnings.filterwarnings("default", category=DeprecationWarning, module=__name__)
warnings.warn(_DEPRECATION_MESSAGE, DeprecationWarning, stacklevel=2)

__all__ = ["__version__"]
