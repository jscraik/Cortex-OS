"""
Sample MCP Server for ChatGPT Integration

This server implements the Model Context Protocol (MCP) with search and fetch
capabilities designed to work with ChatGPT's chat and deep research features.
"""

import logging
import os
from typing import Any

from fastmcp import FastMCP
from openai import OpenAI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# OpenAI configuration
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
VECTOR_STORE_ID = os.environ.get("VECTOR_STORE_ID", "")

# Initialize OpenAI client
openai_client = OpenAI() if OPENAI_API_KEY else None

server_instructions = """
This MCP server provides search and document retrieval capabilities
for chat and deep research connectors. Use the search tool to find relevant documents
based on keywords, then use the fetch tool to retrieve complete
document content with citations.
"""


def create_server():
    """Create and configure the MCP server with search and fetch tools."""

    # Initialize the FastMCP server
    mcp = FastMCP(name="ChatGPT Connector Server", instructions=server_instructions)

    @mcp.tool()
    async def search(query: str) -> dict[str, list[dict[str, Any]]]:
        """
        Search for documents using OpenAI Vector Store search.

        This tool searches through the vector store to find semantically relevant matches.
        Returns a list of search results with basic information. Use the fetch tool to get
        complete document content.

        Args:
            query: Search query string. Natural language queries work best for semantic search.

        Returns:
            Dictionary with 'results' key containing list of matching documents.
            Each result includes id, title, text snippet, and optional URL.
        """
        if not query or not query.strip():
            return {"results": []}

        if not openai_client:
            logger.error("OpenAI client not initialized - API key missing")
            raise ValueError("OpenAI API key is required for vector store search")

        # Search the vector store using OpenAI API
        logger.info(f"Searching {VECTOR_STORE_ID} for query: '{query}'")

        try:
            response = openai_client.beta.vector_stores.file_search(
                vector_store_id=VECTOR_STORE_ID, query=query
            )

            results = []

            # Process the vector store search results
            if hasattr(response, "data") and response.data:
                for i, item in enumerate(response.data[:10]):  # Limit to 10 results
                    # Extract file_id and create result
                    item_id = getattr(item, "file_id", f"vs_{i}")

                    # Get file info for title
                    try:
                        file_info = openai_client.files.retrieve(item_id)
                        item_filename = getattr(
                            file_info, "filename", f"Document {i + 1}"
                        )
                    except Exception:
                        item_filename = f"Document {i + 1}"

                    result = {
                        "id": item_id,
                        "title": item_filename,
                        "url": f"https://platform.openai.com/storage/files/{item_id}",
                    }

                    results.append(result)

            logger.info(f"Vector store search returned {len(results)} results")
            return {"results": results}
        except Exception as e:
            logger.error(f"Error during vector store search: {e}")
            return {"results": []}

    @mcp.tool()
    async def fetch(id: str) -> dict[str, Any]:
        """
        Retrieve complete document content by ID for detailed
        analysis and citation. This tool fetches the full document
        content from OpenAI Vector Store. Use this after finding
        relevant documents with the search tool to get complete
        information for analysis and proper citation.

        Args:
            id: File ID from vector store (file-xxx) or local document ID

        Returns:
            Complete document with id, title, full text content,
            optional URL, and metadata

        Raises:
            ValueError: If the specified ID is not found
        """
        if not id:
            raise ValueError("Document ID is required")

        if not openai_client:
            logger.error("OpenAI client not initialized - API key missing")
            raise ValueError(
                "OpenAI API key is required for vector store file retrieval"
            )

        logger.info(f"Fetching content from vector store for file ID: {id}")

        try:
            # Get file info for title
            file_info = openai_client.files.retrieve(id)
            filename = getattr(file_info, "filename", f"Document {id}")

            # Fetch file content
            content_response = openai_client.files.content(id)

            # Extract text content
            if hasattr(content_response, "text"):
                file_content = content_response.text
            elif hasattr(content_response, "content"):
                # Handle binary content
                file_content = (
                    content_response.content.decode("utf-8")
                    if isinstance(content_response.content, bytes)
                    else str(content_response.content)
                )
            else:
                file_content = "No content available"

            result = {
                "id": id,
                "title": filename,
                "text": file_content,
                "url": f"https://platform.openai.com/storage/files/{id}",
                "metadata": {"file_id": id},
            }

            logger.info(f"Fetched vector store file: {id}")
            return result
        except Exception as e:
            logger.error(f"Error fetching file {id}: {e}")
            raise ValueError(f"Failed to fetch document with ID {id}")

    return mcp


def main():
    """Main function to start the MCP server."""
    # Verify OpenAI client is initialized
    if not openai_client:
        logger.error(
            "OpenAI API key not found. Please set OPENAI_API_KEY environment variable."
        )
        raise ValueError("OpenAI API key is required")

    logger.info(f"Using vector store: {VECTOR_STORE_ID}")

    # Create the MCP server
    server = create_server()

    # Configure and start the server
    logger.info("Starting MCP server on 0.0.0.0:8000")
    logger.info("Server will be accessible via SSE transport")

    try:
        # Use FastMCP's built-in run method with SSE transport
        server.run(transport="sse", host="0.0.0.0", port=8000)
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        raise


if __name__ == "__main__":
    main()
