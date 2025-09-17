#!/usr/bin/env python3
"""
Cortex-OS FastMCP Server v2.0
Compatible with FastMCP 2.0 and ChatGPT MCP integration
"""

import logging
import os
from collections.abc import Callable
from typing import Any

try:  # Prefer real FastMCP when available
    from fastmcp import FastMCP  # type: ignore
except Exception:  # pragma: no cover - fallback used in minimal test env

    class FastMCP:  # minimal stub for tests when fastmcp is unavailable
        def __init__(self, name: str, instructions: str):
            self.name = name
            self.instructions = instructions
            self._raw_funcs: dict[str, Callable[..., Any]] = {}
            # Only created by real server; left absent in stub unless .run is called
            self.app = None  # type: ignore[attr-defined]

        def tool(self) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
            def _decorator(func: Callable[..., Any]) -> Callable[..., Any]:
                self._raw_funcs[func.__name__] = func
                return func

            return _decorator

        def run(self, *_args: Any, **_kwargs: Any) -> None:
            # No-op in tests; real server handles transports
            return None


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

server_instructions = """
This MCP server provides search and document retrieval capabilities
for the Cortex-OS knowledge base. Use the search tool to find relevant
information, then use the fetch tool to retrieve complete content.
"""


def create_server():
    """Create and configure the MCP server with search and fetch tools."""

    # Initialize FastMCP server
    mcp = FastMCP(name="Cortex-OS MCP Server", instructions=server_instructions)

    @mcp.tool()
    async def search(query: str, max_results: int = 10) -> dict[str, Any]:
        """
        Search for information in the Cortex-OS knowledge base.

        Args:
            query: Search query string
            max_results: Maximum number of results to return

        Returns:
            Dictionary with search results
        """
        if not query or not query.strip():
            return {"results": []}

        try:
            logger.info(f"Searching for query: '{query}'")
            # Simulate search results for now
            results: list[dict[str, Any]] = [
                {
                    "id": f"cortex-doc-{i}",
                    "title": f"Search result for: {query}",
                    "text": f"This is a simulated search result for the query: {query}",
                    "score": 0.95 - (i * 0.1),
                    "url": f"https://cortex-os.dev/docs/search?q={query}#{i}",
                }
                for i in range(min(max_results, 3))
            ]

            logger.info(f"Search returned {len(results)} results")
            return {"query": query, "results": results, "total_found": len(results)}
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return {
                "error": f"Search failed: {str(e)}",
                "query": query,
                "results": [],
                "total_found": 0,
            }

    @mcp.tool()
    async def fetch(resource_id: str) -> dict[str, Any]:
        """
        Fetch a specific resource by ID for detailed analysis.

        Args:
            resource_id: Resource ID to fetch

        Returns:
            Complete resource with content and metadata
        """
        if not resource_id:
            raise ValueError("Resource ID is required")

        try:
            logger.info(f"Fetching resource: {resource_id}")
            # Simulate fetching a resource
            return {
                "id": resource_id,
                "title": f"Resource {resource_id}",
                "text": f"Complete content for resource {resource_id}. This would contain the full document text in a real implementation.",
                "url": f"https://cortex-os.dev/docs/{resource_id}",
                "metadata": {
                    "type": "document",
                    "created": "2024-01-01T00:00:00Z",
                    "updated": "2024-01-01T00:00:00Z",
                    "source": "cortex-knowledge-base",
                },
            }
        except Exception as e:
            logger.error(f"Fetch failed: {e}")
            raise ValueError(f"Fetch failed: {str(e)}") from e

    @mcp.tool()
    async def ping(transport: str = "unknown") -> dict[str, Any]:
        """Health check endpoint"""
        return {
            "status": "ok",
            "message": "Cortex-OS MCP Server is running",
            "version": "2.0.0",
            "transport": transport,
        }

    @mcp.tool()
    async def health_check() -> dict[str, Any]:
        """Simple health-check tool returning server status and version."""
        return {"status": "ok", "version": "2.0.0"}

    @mcp.tool()
    async def list_capabilities() -> dict[str, Any]:
        """List all available capabilities"""
        return {
            "tools": [
                "search",
                "fetch",
                "ping",
                "health_check",
                "list_capabilities",
            ],
            "resources": [],
            "prompts": [],
            "version": "2.0.0",
        }

    # Optionally expose an HTTP /health route if FastAPI app is available
    app = getattr(mcp, "app", None)
    if app is not None:  # pragma: no cover - depends on FastAPI transport being present
        try:

            @app.get("/health")  # type: ignore[attr-defined]
            async def _health_route() -> dict[str, Any]:
                return {"status": "ok", "version": "2.0.0"}
        except (
            Exception
        ):  # pragma: no cover - be resilient if transport not initialized
            pass

    return mcp


# Create server instance for FastMCP CLI compatibility
mcp = create_server()


def main():
    """Main entry point with enforced port 3024 and fallback to 127.0.0.1:8007."""
    # Environment configuration with enforced defaults
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "3024"))  # Enforce 3024 as primary port
    transport = os.getenv("TRANSPORT", "http").lower()

    # Fallback configuration
    fallback_host = "127.0.0.1"
    fallback_port = 8007

    logger.info("🚀 Starting Cortex-OS FastMCP Server v2.0")
    logger.info(f"📡 {transport.upper()} transport on {host}:{port}")
    logger.info(f"🔗 Server will be available at: http://{host}:{port}/mcp")

    # Transport validation
    valid_transports = ["stdio", "http", "sse", "ws", "streamable-http"]
    if transport not in valid_transports:
        logger.warning(f"⚠️ Unknown transport '{transport}', falling back to 'http'")
        transport = "http"

    # Run server with specified transport
    if transport == "stdio":
        mcp.run(transport="stdio")
    else:
        # Try primary port first, then fallback
        try:
            mcp.run(transport="streamable-http", host=host, port=port)
        except OSError as e:
            if "address already in use" in str(e).lower():
                logger.warning(
                    f"⚠️ Port {port} in use, falling back to {fallback_host}:{fallback_port}"
                )
                mcp.run(
                    transport="streamable-http", host=fallback_host, port=fallback_port
                )
            else:
                raise


if __name__ == "__main__":
    main()
