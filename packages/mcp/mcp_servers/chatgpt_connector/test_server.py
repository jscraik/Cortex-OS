"""
Tests for the ChatGPT Connector MCP Server.
"""

import pytest


@pytest.mark.asyncio
async def test_search_tool() -> None:
    """Test the search tool functionality."""
    from .server import ChatGPTConnectorServer

    server = ChatGPTConnectorServer()

    # Test with a sample query
    params = {"query": "test query"}
    result = await server._handle_search(params)

    # Check that results are returned in the correct format
    assert "results" in result
    assert isinstance(result["results"], list)

    # Check that each result has the required fields
    if result["results"]:
        for item in result["results"]:
            assert "id" in item
            assert "title" in item
            assert "url" in item


@pytest.mark.asyncio
async def test_fetch_tool() -> None:
    """Test the fetch tool functionality."""
    from .server import ChatGPTConnectorServer

    server = ChatGPTConnectorServer()

    # Test fetching a known document
    params = {"id": "doc-1"}
    result = await server._handle_fetch(params)

    # Check that the result has the required fields
    assert "id" in result
    assert "title" in result
    assert "text" in result
    assert "url" in result
    assert "metadata" in result

    # Check that the ID matches
    assert result["id"] == "doc-1"


@pytest.mark.asyncio
async def test_fetch_unknown_document() -> None:
    """Test fetching an unknown document."""
    from .server import ChatGPTConnectorServer

    server = ChatGPTConnectorServer()

    # Test fetching an unknown document
    params = {"id": "unknown-doc"}
    result = await server._handle_fetch(params)

    # Check that the result still has the required fields
    assert "id" in result
    assert "title" in result
    assert "text" in result
    assert "url" in result
    assert "metadata" in result

    # Check that the ID matches
    assert result["id"] == "unknown-doc"


@pytest.mark.asyncio
async def test_get_documents_batch() -> None:
    """Test batch retrieval via adapter's get_documents using sample docs."""
    from .server import ChatGPTConnectorServer

    server = ChatGPTConnectorServer()
    vs = await server._get_vector_store()
    # Batch fetch two known docs loaded during init
    docs = await vs.get_documents(["doc-1", "doc-2"])
    # Validate shape and content presence
    assert isinstance(docs, list)
    assert len(docs) == 2
    ids = {d["id"] for d in docs}
    assert {"doc-1", "doc-2"}.issubset(ids)
    for d in docs:
        assert "metadata" in d
        assert isinstance(d.get("content", ""), str)


def test_server_initialization() -> None:
    """Test that the server initializes correctly."""
    from .server import ChatGPTConnectorServer

    server = ChatGPTConnectorServer()

    # Check that the protocol handler is initialized
    assert server.protocol_handler is not None

    # Check that handlers are registered
    assert "search" in server.protocol_handler.message_handlers
    assert "fetch" in server.protocol_handler.message_handlers


@pytest.mark.asyncio
async def test_vector_store_initialization() -> None:
    """Test that the server lazily initializes a MemoryBridge-backed vector store."""
    from .server import ChatGPTConnectorServer

    server = ChatGPTConnectorServer()
    # Trigger lazy initialization
    vs = await server._get_vector_store()
    assert vs is not None
    # Adapter exposes async get_statistics via bridge
    stats = await vs.get_statistics()
    assert isinstance(stats, dict)
