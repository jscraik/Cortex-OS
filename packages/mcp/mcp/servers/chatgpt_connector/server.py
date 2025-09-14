"""
MCP Server for ChatGPT Connector

This server implements the Model Context Protocol (MCP) with search and fetch
capabilities designed to work with ChatGPT's chat and deep research features.

Follows OpenAI's MCP specification for ChatGPT connectors:
https://platform.openai.com/docs/mcp
"""

import logging
import os
from typing import Any

from fastmcp import FastMCP

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Server configuration
CORTEX_API_BASE = os.environ.get("CORTEX_API_BASE", "http://localhost:3001/api")
CORTEX_API_KEY = os.environ.get("CORTEX_API_KEY", "")

# Server instructions for ChatGPT integration
server_instructions = """
This MCP server provides search and document retrieval capabilities
for ChatGPT chat and deep research connectors. Use the search tool to find relevant documents
based on keywords, then use the fetch tool to retrieve complete
document content with citations.
"""


def create_server() -> FastMCP:
    """Create and configure the MCP server with search and fetch tools."""

    # Initialize the FastMCP server
    mcp = FastMCP(name="Cortex-OS ChatGPT Connector", instructions=server_instructions)

    @mcp.tool()
    async def search(query: str) -> dict[str, list[dict[str, Any]]]:
        """
        Search for documents in Cortex-OS knowledge base.

        This tool searches through the Cortex-OS knowledge base to find semantically relevant matches.
        Returns a list of search results with basic information. Use the fetch tool to get
        complete document content.

        Args:
            query: Search query string. Natural language queries work best for semantic search.

        Returns:
            Dictionary with 'results' key containing list of matching documents.
            Each result includes id, title, and URL for citation.
        """
        if not query or not query.strip():
            return {"results": []}

        logger.info(f"Searching Cortex-OS for query: '{query}'")

        try:
            # Mock search results for demo - replace with actual Cortex-OS API calls
            mock_results = [
                {
                    "id": "cortex-doc-1",
                    "title": f"Cortex-OS Documentation: {query}",
                    "url": f"{CORTEX_API_BASE}/docs/search?q={query}",
                },
                {
                    "id": "cortex-doc-2",
                    "title": f"Agent Development Guide: {query}",
                    "url": f"{CORTEX_API_BASE}/docs/agents?q={query}",
                },
                {
                    "id": "cortex-doc-3",
                    "title": f"MCP Integration Guide: {query}",
                    "url": f"{CORTEX_API_BASE}/docs/mcp?q={query}",
                },
            ]

            # Filter results based on query relevance (simple demo logic)
            filtered_results = []
            for result in mock_results[:3]:  # Limit to 3 results
                if any(
                    word.lower() in result["title"].lower() for word in query.split()
                ):
                    filtered_results.append(result)

            if not filtered_results:
                filtered_results = mock_results[:1]  # At least one result

            results = {"results": filtered_results}
            logger.info(f"Search returned {len(filtered_results)} results")

            return results

        except Exception as e:
            logger.error(f"Search error: {e}")
            return {"results": []}

    @mcp.tool()
    async def fetch(id: str) -> dict[str, Any]:
        """
        Retrieve complete document content by ID for detailed analysis and citation.

        This tool fetches the full document content from Cortex-OS knowledge base.
        Use this after finding relevant documents with the search tool to get complete
        information for analysis and proper citation.

        Args:
            id: Document ID from search results (e.g., cortex-doc-1)

        Returns:
            Complete document with id, title, full text content, URL, and metadata
        """
        if not id:
            raise ValueError("Document ID is required")

        logger.info(f"Fetching document: {id}")

        try:
            # Mock document content - replace with actual Cortex-OS API calls
            mock_documents = {
                "cortex-doc-1": {
                    "id": "cortex-doc-1",
                    "title": "Cortex-OS Introduction",
                    "text": """Cortex-OS is an advanced AI operating system that provides a unified platform for AI agents, tools, and integrations. 

Key features:
- Agent orchestration and management
- MCP (Model Context Protocol) integration
- Memory and context management  
- Tool and service integration
- Event-driven architecture with A2A communication

The system uses a modular, event-driven architecture with A2A (Application-to-Application) communication and MCP for external tool integration. This enables seamless coordination between AI agents and external services while maintaining type safety through contract-driven development.""",
                    "url": f"{CORTEX_API_BASE}/docs/introduction",
                    "metadata": {
                        "source": "cortex-docs",
                        "type": "documentation",
                        "last_updated": "2025-09-14",
                    },
                },
                "cortex-doc-2": {
                    "id": "cortex-doc-2",
                    "title": "Agent Development Guide",
                    "text": """This guide covers how to develop agents in Cortex-OS.

Agent Development Process:
1. Define agent capabilities and tools
2. Implement MCP tool interfaces following the TypeScript contracts
3. Configure A2A event handling for inter-agent communication
4. Add memory and context management using the memories package
5. Test and deploy using the provided CI/CD pipelines

Agents in Cortex-OS follow contract-driven development with Zod schemas for type safety and validation. All communication between agents uses CloudEvents through the A2A bus, ensuring loose coupling and scalability.""",
                    "url": f"{CORTEX_API_BASE}/docs/agents",
                    "metadata": {
                        "source": "cortex-docs",
                        "type": "guide",
                        "last_updated": "2025-09-14",
                    },
                },
                "cortex-doc-3": {
                    "id": "cortex-doc-3",
                    "title": "MCP Integration Guide",
                    "text": """This guide explains how to integrate MCP (Model Context Protocol) tools with Cortex-OS.

MCP Integration Steps:
1. Create MCP tool definitions in src/mcp/tools.ts
2. Implement tool handlers following the Zod schemas
3. Export tools in package index.ts
4. Register tools in the central MCP registry
5. Configure ports and service endpoints

All MCP tools in Cortex-OS must follow the contract-driven approach with proper TypeScript types and Zod validation. The system provides automatic tool discovery and registration through the MCP registry service.""",
                    "url": f"{CORTEX_API_BASE}/docs/mcp",
                    "metadata": {
                        "source": "cortex-docs",
                        "type": "guide",
                        "last_updated": "2025-09-14",
                    },
                },
            }

            # Get document or return not found
            if id in mock_documents:
                document = mock_documents[id]
                logger.info(f"Fetched document: {id}")
            else:
                # Return a generic document for unknown IDs
                document = {
                    "id": id,
                    "title": f"Document {id}",
                    "text": f"Content for document {id} - this would be fetched from Cortex-OS knowledge base using the search and retrieval APIs.",
                    "url": f"{CORTEX_API_BASE}/docs/{id}",
                    "metadata": {"source": "cortex-docs", "type": "unknown"},
                }

            return document

        except Exception as e:
            logger.error(f"Fetch error: {e}")
            raise ValueError(f"Failed to fetch document {id}: {e}")

    return mcp


def main() -> None:
    """Main function to start the MCP server."""
    logger.info(f"Using Cortex-OS API base: {CORTEX_API_BASE}")

    # Create the MCP server
    server = create_server()

    # Configure and start the server
    logger.info("Starting Cortex-OS ChatGPT Connector MCP server on 0.0.0.0:3000")
    logger.info("Server will be accessible via SSE transport at /sse/")

    try:
        # Use FastMCP's built-in run method with SSE transport
        # This should be a blocking call that keeps the server running
        server.run(transport="sse", host="0.0.0.0", port=3000)
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        raise


if __name__ == "__main__":
    main()
