"""Integration modules for connecting MCP with Cortex-OS ecosystem.

This package intentionally avoids importing heavy optional dependencies at
module import time. Import submodules directly when needed, e.g.:

    from mcp.integrations.a2a_bridge import A2ABridge
    from mcp.integrations.memory_bridge import MemoryBridge

This keeps test collection fast and avoids ImportError when optional backends
like Neo4j or Qdrant are not installed.
"""

from .a2a_bridge import A2ABridge, A2AEventHandler  # lightweight
# Do NOT import memory_bridge here to prevent hard dep on neo4j/qdrant
from .orchestration_bridge import OrchestrationBridge  # lightweight

__all__ = [
    "A2ABridge",
    "A2AEventHandler",
    # MemoryBridge and ContextStore are available via submodule import
    "OrchestrationBridge",
]
