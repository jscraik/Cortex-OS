#!/usr/bin/env python3
"""
Cortex-OS FastMCP Server v2.0
Compatible with FastMCP 2.0 and ChatGPT MCP integration
"""

import logging
import os
from typing import Any

from fastmcp import FastMCP

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
    async def list_capabilities() -> dict[str, Any]:
        """List all available capabilities"""
        return {
            "tools": ["search", "fetch", "ping", "list_capabilities"],
            "resources": [],
            "prompts": [],
            "version": "2.0.0",
        }

    return mcp


# Create server instance for FastMCP CLI compatibility
mcp = create_server()


def main() -> None:
    """Main function to start the MCP server."""
    # Get configuration from environment
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "3024"))  # Cloudflare tunnel requires port 3024
    transport_str = os.getenv("TRANSPORT", "http")  # Default to HTTP (recommended)

    logger.info("🚀 Starting Cortex-OS FastMCP Server v2.0")
    logger.info(f"📡 {transport_str.upper()} transport on {host}:{port}")
    logger.info(f"🔗 Server will be available at: http://{host}:{port}/mcp")

    # Create the MCP server
    server = create_server()

    try:
        # Run with specified transport
        if transport_str == "stdio":
            server.run(transport="stdio")
        elif transport_str == "http":
            server.run(transport="http", host=host, port=port)
        elif transport_str == "sse":
            server.run(transport="sse", host=host, port=port)
        elif transport_str == "streamable-http":
            server.run(transport="streamable-http", host=host, port=port)
        else:
            raise ValueError(f"Unsupported transport: {transport_str}")
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        raise


if __name__ == "__main__":
    main()
