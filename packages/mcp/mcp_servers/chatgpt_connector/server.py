"""
ChatGPT Connector MCP Server for Cortex-OS

This server implements the Model Context Protocol (MCP) with search and fetch
capabilities designed to work with ChatGPT's chat and deep research features.
It integrates with Cortex-OS as a second brain and centralized hub for frontier models.
"""

import json
import logging
import os
import sys
from typing import Any

# Add the parent directory to the path so we can import the mcp module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
# Add the current directory to the path for local imports
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException
from memory_bridge_adapter import MemoryBridgeVectorAdapter
from pydantic import BaseModel

from core.protocol import MCPProtocolHandler

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Configuration
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")


class SearchRequest(BaseModel):
    query: str


class FetchRequest(BaseModel):
    id: str


class ChatGPTConnectorServer:
    """MCP Server implementation for ChatGPT integration with Cortex-OS."""

    def __init__(self) -> None:
        self.protocol_handler = MCPProtocolHandler()
        # Lazy async initialization
        self.vector_store: MemoryBridgeVectorAdapter | None = None
        self._initialize_tools()
        logger.info("ChatGPT Connector Server initialized")

    async def _get_vector_store(self) -> MemoryBridgeVectorAdapter:
        """Lazy initialization of vector store (async)."""
        if self.vector_store is None:
            logger.info("Initializing vector store (MemoryBridge adapter)...")
            self.vector_store = MemoryBridgeVectorAdapter(model_name="all-MiniLM-L6-v2")
            await self.vector_store.initialize()
            await self._load_sample_data()
        return self.vector_store

    def _initialize_tools(self) -> None:
        """Initialize the MCP tools for search and fetch operations."""
        # Register search tool
        self.protocol_handler.register_handler("search", self._handle_search)

        # Register fetch tool
        self.protocol_handler.register_handler("fetch", self._handle_fetch)

        logger.info("MCP tools registered: search, fetch")

    async def _load_sample_data(self) -> None:
        """Load sample data into the vector store for demonstration purposes."""
        # Add some sample documents
        sample_documents = [
            {
                "id": "doc-1",
                "content": "This is a sample document about artificial intelligence and machine learning. It covers the basics of neural networks, deep learning, and AI applications.",
                "metadata": {
                    "title": "AI and ML Introduction",
                    "url": "https://example.com/ai-ml",
                    "category": "technology",
                },
            },
            {
                "id": "doc-2",
                "content": "Python is a popular programming language used for web development, data science, and automation. It has a simple syntax and extensive libraries.",
                "metadata": {
                    "title": "Python Programming",
                    "url": "https://example.com/python",
                    "category": "programming",
                },
            },
            {
                "id": "doc-3",
                "content": "The Model Context Protocol (MCP) is a standard for connecting AI models with applications and tools. It enables seamless integration between different AI services.",
                "metadata": {
                    "title": "Model Context Protocol",
                    "url": "https://example.com/mcp",
                    "category": "ai-standards",
                },
            },
            {
                "id": "doc-4",
                "content": "Cortex-OS is an advanced AI operating system that serves as a second brain. It integrates multiple AI models and provides a centralized hub for frontier models.",
                "metadata": {
                    "title": "Cortex-OS Overview",
                    "url": "https://example.com/cortex-os",
                    "category": "ai-os",
                },
            },
        ]

        vs = await self._get_vector_store()
        for doc in sample_documents:
            await vs.add_document(
                content=doc["content"], metadata=doc["metadata"], doc_id=doc["id"]
            )

        logger.info(
            f"Loaded {len(sample_documents)} sample documents into vector store"
        )

    async def _handle_search(self, params: dict[str, Any] | None) -> dict[str, Any]:
        """
        Handle search requests from ChatGPT.

        Args:
            params: Dictionary containing the search query

        Returns:
            Dictionary with search results
        """
        query = params.get("query", "") if params else ""
        logger.info(f"Handling search request for query: '{query}'")

        # Get vector store (lazy initialization)
        vs = await self._get_vector_store()

        # Search the vector store (returns SearchResult models)
        search_results = await vs.search(query, top_k=5)

        # Normalize to plain dicts
        results = [
            {
                "id": r.id,
                "title": r.title,
                "url": r.url or "",
                "similarity": r.similarity,
                "metadata": r.metadata,
                "content_preview": r.content_preview,
            }
            for r in search_results
        ]

        response_data = {"results": results}
        return response_data

    async def _handle_fetch(self, params: dict[str, Any] | None) -> dict[str, Any]:
        """
        Handle fetch requests from ChatGPT.

        Args:
            params: Dictionary containing the document ID

        Returns:
            Dictionary with document content
        """
        doc_id = params.get("id", "") if params else ""
        logger.info(f"Handling fetch request for document ID: '{doc_id}'")

        # Get vector store (lazy initialization)
        vs = await self._get_vector_store()

        # Fetch document from vector store
        doc = await vs.get_document(doc_id)

        if doc:
            content = {
                "id": doc_id,
                "title": doc.get("metadata", {}).get("title", doc_id),
                "text": doc.get("content", ""),
                "url": doc.get("metadata", {}).get("url", "") or "",
                "metadata": doc.get("metadata", {}),
            }
        else:
            content = {
                "id": doc_id,
                "title": f"Document {doc_id}",
                "text": f"Content for document {doc_id} not found.",
                "url": f"https://example.com/{doc_id}",
                "metadata": {"type": "text"},
            }

        return content


# Create FastAPI app
app = FastAPI(
    title="Cortex-OS ChatGPT Connector MCP Server",
    description="MCP server for integrating ChatGPT with Cortex-OS as a second brain",
    version="1.0.0",
)

# Initialize the server
server = ChatGPTConnectorServer()


@app.get("/")
async def root() -> dict[str, str]:
    """Health check endpoint."""
    return {"message": "Cortex-OS ChatGPT Connector MCP Server is running"}


@app.post("/mcp/search")
async def search(request: SearchRequest) -> dict[str, list[dict[str, str]]]:
    """MCP search endpoint."""
    try:
        params = {"query": request.query}
        result = await server._handle_search(params)
        return {"content": [{"type": "text", "text": json.dumps(result)}]}
    except Exception as e:
        logger.error(f"Error in search: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/mcp/fetch")
async def fetch(request: FetchRequest) -> dict[str, list[dict[str, str]]]:
    """MCP fetch endpoint."""
    try:
        params = {"id": request.id}
        result = await server._handle_fetch(params)
        return {"content": [{"type": "text", "text": json.dumps(result)}]}
    except Exception as e:
        logger.error(f"Error in fetch: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def main() -> None:
    """Main entry point for the server."""
    import uvicorn

    logger.info("Starting Cortex-OS ChatGPT Connector MCP Server")
    # Use the local module reference instead of the full path
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8007,
        reload=True,
    )


if __name__ == "__main__":
    main()
