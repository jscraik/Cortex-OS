#!/usr/bin/env python3
"""
Cortex-OS FastMCP Server v2.0
Compatible with FastMCP 2.0 and ChatGPT MCP integration
"""

import logging
import math
import os
import time
from collections.abc import Callable
from typing import Any
from uuid import uuid4

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

server_instructions = (
    "This MCP server provides search and document retrieval capabilities "
    "for the Cortex-OS knowledge base. Use the search tool to find relevant "
    "information, then use the fetch tool to retrieve complete content."
)


def register_core_tools(mcp: Any) -> None:
    """Register core search/fetch/health tools."""

    @mcp.tool()
    async def search(query: str, max_results: int = 10) -> dict[str, Any]:
        if not query or not query.strip():
            return {"results": []}
        try:
            logger.info("Searching for query: %r", query)
            results: list[dict[str, Any]] = [
                {
                    "id": f"cortex-doc-{i}",
                    "title": f"Search result for: {query}",
                    "text": (
                        "This is a simulated search result for the query: "
                        f"{query}"
                    ),
                    "score": 0.95 - (i * 0.1),
                    "url": f"https://cortex-os.dev/docs/search?q={query}#{i}",
                }
                for i in range(min(max_results, 3))
            ]
            logger.info("Search returned %d results", len(results))
            return {"query": query, "results": results, "total_found": len(results)}
        except Exception as exc:  # pragma: no cover
            logger.error("Search failed: %s", exc)
            return {"error": f"Search failed: {exc!s}", "query": query, "results": [], "total_found": 0}

    @mcp.tool()
    async def fetch(resource_id: str) -> dict[str, Any]:
        if not resource_id:
            raise ValueError("Resource ID is required")
        try:
            logger.info("Fetching resource: %s", resource_id)
            return {
                "id": resource_id,
                "title": f"Resource {resource_id}",
                "text": (
                    "Complete content for resource "
                    f"{resource_id}. This would contain the full document text in a real implementation."
                ),
                "url": f"https://cortex-os.dev/docs/{resource_id}",
                "metadata": {
                    "type": "document",
                    "created": "2024-01-01T00:00:00Z",
                    "updated": "2024-01-01T00:00:00Z",
                    "source": "cortex-knowledge-base",
                },
            }
        except Exception as exc:  # pragma: no cover
            logger.error("Fetch failed: %s", exc)
            raise ValueError(f"Fetch failed: {exc!s}") from exc

    @mcp.tool()
    async def ping(transport: str = "unknown") -> dict[str, Any]:
        return {"status": "ok", "message": "Cortex-OS MCP Server is running", "version": "2.0.0", "transport": transport}

    @mcp.tool()
    async def health_check() -> dict[str, Any]:
        return {"status": "ok", "version": "2.0.0"}

    @mcp.tool()
    async def list_capabilities() -> dict[str, Any]:
        return {
            "tools": [
                "search",
                "fetch",
                "ping",
                "health_check",
                "list_capabilities",
                "generate_embeddings",
                "upload_document",
                "create_task",
                "update_task_status",
                "memories_store",
                "memories_search",
                "memories_get",
                "memories_delete",
            ],
            "resources": [],
            "prompts": [],
            "version": "2.0.0",
        }


def register_embedding_tools(mcp: Any) -> None:
    def _normalize_vector(vec: list[float]) -> list[float]:
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    def _embed_text(t: str) -> list[float]:
        h = sum((i + 1) * ord(c) for i, c in enumerate(t))
        base = [float(((h >> s) & 0xFF) / 255.0) for s in (0, 8, 16, 24, 32, 40, 48, 56)]
        return _normalize_vector(base)

    @mcp.tool()
    async def generate_embeddings(texts: list[str], model: str | None = None) -> dict[str, Any]:
        _ = model
        if not isinstance(texts, list) or not texts:
            return {"embeddings": []}
        return {"embeddings": [_embed_text(t) for t in texts]}


def register_document_tools(mcp: Any) -> None:
    documents: dict[str, dict[str, Any]] = {}

    @mcp.tool()
    async def upload_document(content: str, filename: str, options: dict[str, Any] | None = None) -> dict[str, Any]:
        doc_id = f"doc-{uuid4()}"
        documents[doc_id] = {
            "id": doc_id,
            "filename": filename,
            "content": content,
            "metadata": (options or {}).get("metadata", {}),
            "tags": (options or {}).get("tags", []),
            "createdAt": time.time(),
        }
        return {"documentId": doc_id, "url": f"mcp://documents/{doc_id}"}


def register_task_tools(mcp: Any) -> None:
    tasks: dict[str, dict[str, Any]] = {}

    @mcp.tool()
    async def create_task(title: str, description: str, options: dict[str, Any] | None = None) -> dict[str, Any]:
        task_id = f"task-{uuid4()}"
        tasks[task_id] = {
            "id": task_id,
            "title": title,
            "description": description,
            "status": (options or {}).get("status", "queued"),
            "notes": [],
            "createdAt": time.time(),
        }
        return {"taskId": task_id, "url": f"mcp://tasks/{task_id}"}

    @mcp.tool()
    async def update_task_status(task_id: str, status: str, notes: str | None = None) -> dict[str, Any]:
        task = tasks.get(task_id)
        if not task:
            return {"updated": False, "error": "task not found"}
        task["status"] = status
        if notes:
            task.setdefault("notes", []).append(notes)
        task["updatedAt"] = time.time()
        return {"updated": True}


def register_memory_tools(mcp: Any) -> None:
    memories: dict[str, dict[str, Any]] = {}

    def _mem_item(kind: str, text: str, tags: list[str] | None, metadata: dict[str, Any] | None) -> dict[str, Any]:
        mem_id = f"mem-{uuid4()}"
        return {
            "id": mem_id,
            "kind": kind,
            "text": text,
            "tags": tags or [],
            "metadata": metadata or {},
            "createdAt": time.time(),
            "updatedAt": time.time(),
        }

    @mcp.tool()
    async def memories_store(kind: str, text: str, tags: list[str] | None = None, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
        item = _mem_item(kind, text, tags, metadata)
        memories[item["id"]] = item
        return {"stored": True, "id": item["id"], "kind": item["kind"], "tags": item["tags"], "textLength": len(item["text"])}

    @mcp.tool()
    async def memories_search(query: str, limit: int = 10, kind: str | None = None, tags: list[str] | None = None) -> dict[str, Any]:
        q = (query or "").lower()
        results = []
        for m in memories.values():
            if kind and m.get("kind") != kind:
                continue
            if tags and not set(tags).issubset(set(m.get("tags", []))):
                continue
            if q and q not in (m.get("text", "").lower()):
                continue
            results.append({
                "id": m["id"],
                "kind": m.get("kind"),
                "text": m.get("text"),
                "tags": m.get("tags", []),
                "score": 0.9,
                "createdAt": m.get("createdAt"),
            })
        return {"query": query, "results": results[: max(1, limit)]}

    @mcp.tool()
    async def memories_get(id: str) -> dict[str, Any]:
        item = memories.get(id)
        if not item:
            return {"found": False, "id": id}
        return {"found": True, "memory": item}

    @mcp.tool()
    async def memories_delete(id: str) -> dict[str, Any]:
        existed = id in memories
        memories.pop(id, None)
        return {"deleted": existed, "id": id}


def register_rest_routes(mcp: Any) -> None:
    app = getattr(mcp, "app", None)
    if app is None:  # pragma: no cover
        return
    try:
        @app.get("/health")  # type: ignore[attr-defined]
        async def _health_route() -> dict[str, Any]:
            return {"status": "ok", "version": "2.0.0"}

        # Memory REST endpoints
        @app.post("/api/memories")  # type: ignore[attr-defined]
        async def _mem_store(payload: dict[str, Any]) -> dict[str, Any]:
            # Delegate to tool for consistency
            return await mcp._raw_funcs["memories_store"](  # type: ignore[attr-defined]
                kind=payload.get("kind", "note"),
                text=payload.get("text", ""),
                tags=payload.get("tags"),
                metadata=payload.get("metadata"),
            )

        @app.get("/api/memories")  # type: ignore[attr-defined]
        async def _mem_search(query: str = "", limit: int = 10) -> dict[str, Any]:
            return await mcp._raw_funcs["memories_search"](query=query, limit=limit)  # type: ignore[attr-defined]

        @app.get("/api/memories/{mem_id}")  # type: ignore[attr-defined]
        async def _mem_get(mem_id: str) -> dict[str, Any]:
            return await mcp._raw_funcs["memories_get"](mem_id)  # type: ignore[attr-defined]

        @app.delete("/api/memories/{mem_id}")  # type: ignore[attr-defined]
        async def _mem_delete(mem_id: str) -> dict[str, Any]:
            return await mcp._raw_funcs["memories_delete"](mem_id)  # type: ignore[attr-defined]
    except Exception as exc:  # pragma: no cover
        logger.debug("Optional FastAPI routes not initialized", exc_info=exc)


def create_server():
    """Create and configure the MCP server with tools and optional REST routes."""
    mcp = FastMCP(name="Cortex-OS MCP Server", instructions=server_instructions)
    register_core_tools(mcp)
    register_embedding_tools(mcp)
    register_document_tools(mcp)
    register_task_tools(mcp)
    register_memory_tools(mcp)
    register_rest_routes(mcp)
    return mcp


# Create server instance for FastMCP CLI compatibility
mcp = create_server()


def main():
    """Main entry point with enforced port 3024 and fallback to 127.0.0.1:8007."""
    # Environment configuration with enforced defaults
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "3024"))  # Enforce 3024 as primary port
    transport = os.getenv("TRANSPORT", "http").lower()

    # Fallback configuration
    fallback_host = "127.0.0.1"
    fallback_port = 8007

    logger.info("🚀 Starting Cortex-OS FastMCP Server v2.0")
    logger.info("📡 %s transport on %s:%s", transport.upper(), host, port)
    logger.info("🔗 Server will be available at: http://%s:%s/mcp", host, port)

    valid_transports = ["stdio", "http", "sse", "ws", "streamable-http"]
    if transport not in valid_transports:
        logger.warning("⚠️ Unknown transport '%s', falling back to 'http'", transport)
        transport = "http"

    if transport == "stdio":
        mcp.run(transport="stdio")
    else:
        try:
            mcp.run(transport="streamable-http", host=host, port=port)
        except OSError as exc:
            if "address already in use" in str(exc).lower():
                logger.warning("⚠️ Port %s in use, falling back to %s:%s", port, fallback_host, fallback_port)
                mcp.run(transport="streamable-http", host=fallback_host, port=fallback_port)
            else:
                raise


if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Cortex-OS FastMCP Server v2.0
Compatible with FastMCP 2.0 and ChatGPT MCP integration
"""

import logging
import math
import os
import time
from collections.abc import Callable
from typing import Any
from uuid import uuid4

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

server_instructions = (
    "This MCP server provides search and document retrieval capabilities "
    "for the Cortex-OS knowledge base. Use the search tool to find relevant "
    "information, then use the fetch tool to retrieve complete content."
)


def register_core_tools(mcp: Any) -> None:
    """Register core search/fetch/health tools."""

    @mcp.tool()
    async def search(query: str, max_results: int = 10) -> dict[str, Any]:
        if not query or not query.strip():
            return {"results": []}
        try:
            logger.info("Searching for query: %r", query)
            results: list[dict[str, Any]] = [
                {
                    "id": f"cortex-doc-{i}",
                    "title": f"Search result for: {query}",
                    "text": (
                        "This is a simulated search result for the query: "
                        f"{query}"
                    ),
                    "score": 0.95 - (i * 0.1),
                    "url": f"https://cortex-os.dev/docs/search?q={query}#{i}",
                }
                for i in range(min(max_results, 3))
            ]
            logger.info("Search returned %d results", len(results))
            return {"query": query, "results": results, "total_found": len(results)}
        except Exception as exc:  # pragma: no cover
            logger.error("Search failed: %s", exc)
            return {"error": f"Search failed: {exc!s}", "query": query, "results": [], "total_found": 0}

    @mcp.tool()
    async def fetch(resource_id: str) -> dict[str, Any]:
        if not resource_id:
            raise ValueError("Resource ID is required")
        try:
            logger.info("Fetching resource: %s", resource_id)
            return {
                "id": resource_id,
                "title": f"Resource {resource_id}",
                "text": (
                    "Complete content for resource "
                    f"{resource_id}. This would contain the full document text in a real implementation."
                ),
                "url": f"https://cortex-os.dev/docs/{resource_id}",
                "metadata": {
                    "type": "document",
                    "created": "2024-01-01T00:00:00Z",
                    "updated": "2024-01-01T00:00:00Z",
                    "source": "cortex-knowledge-base",
                },
            }
        except Exception as exc:  # pragma: no cover
            logger.error("Fetch failed: %s", exc)
            raise ValueError(f"Fetch failed: {exc!s}") from exc

    @mcp.tool()
    async def ping(transport: str = "unknown") -> dict[str, Any]:
        return {"status": "ok", "message": "Cortex-OS MCP Server is running", "version": "2.0.0", "transport": transport}

    @mcp.tool()
    async def health_check() -> dict[str, Any]:
        return {"status": "ok", "version": "2.0.0"}

    @mcp.tool()
    async def list_capabilities() -> dict[str, Any]:
        return {
            "tools": [
                "search",
                "fetch",
                "ping",
                "health_check",
                "list_capabilities",
                "generate_embeddings",
                "upload_document",
                "create_task",
                "update_task_status",
                "memories_store",
                "memories_search",
                "memories_get",
                "memories_delete",
            ],
            "resources": [],
            "prompts": [],
            "version": "2.0.0",
        }


def register_embedding_tools(mcp: Any) -> None:
    def _normalize_vector(vec: list[float]) -> list[float]:
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    def _embed_text(t: str) -> list[float]:
        h = sum((i + 1) * ord(c) for i, c in enumerate(t))
        base = [float(((h >> s) & 0xFF) / 255.0) for s in (0, 8, 16, 24, 32, 40, 48, 56)]
        return _normalize_vector(base)

    @mcp.tool()
    async def generate_embeddings(texts: list[str], model: str | None = None) -> dict[str, Any]:
        _ = model
        if not isinstance(texts, list) or not texts:
            return {"embeddings": []}
        return {"embeddings": [_embed_text(t) for t in texts]}


def register_document_tools(mcp: Any) -> None:
    documents: dict[str, dict[str, Any]] = {}

    @mcp.tool()
    async def upload_document(content: str, filename: str, options: dict[str, Any] | None = None) -> dict[str, Any]:
        doc_id = f"doc-{uuid4()}"
        documents[doc_id] = {
            "id": doc_id,
            "filename": filename,
            "content": content,
            "metadata": (options or {}).get("metadata", {}),
            "tags": (options or {}).get("tags", []),
            "createdAt": time.time(),
        }
        return {"documentId": doc_id, "url": f"mcp://documents/{doc_id}"}


def register_task_tools(mcp: Any) -> None:
    tasks: dict[str, dict[str, Any]] = {}

    @mcp.tool()
    async def create_task(title: str, description: str, options: dict[str, Any] | None = None) -> dict[str, Any]:
        task_id = f"task-{uuid4()}"
        tasks[task_id] = {
            "id": task_id,
            "title": title,
            "description": description,
            "status": (options or {}).get("status", "queued"),
            "notes": [],
            "createdAt": time.time(),
        }
        return {"taskId": task_id, "url": f"mcp://tasks/{task_id}"}

    @mcp.tool()
    async def update_task_status(task_id: str, status: str, notes: str | None = None) -> dict[str, Any]:
        task = tasks.get(task_id)
        if not task:
            return {"updated": False, "error": "task not found"}
        task["status"] = status
        if notes:
            task.setdefault("notes", []).append(notes)
        task["updatedAt"] = time.time()
        return {"updated": True}


def register_memory_tools(mcp: Any) -> None:
    memories: dict[str, dict[str, Any]] = {}

    def _mem_item(kind: str, text: str, tags: list[str] | None, metadata: dict[str, Any] | None) -> dict[str, Any]:
        mem_id = f"mem-{uuid4()}"
        return {
            "id": mem_id,
            "kind": kind,
            "text": text,
            "tags": tags or [],
            "metadata": metadata or {},
            "createdAt": time.time(),
            "updatedAt": time.time(),
        }

    @mcp.tool()
    async def memories_store(kind: str, text: str, tags: list[str] | None = None, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
        item = _mem_item(kind, text, tags, metadata)
        memories[item["id"]] = item
        return {"stored": True, "id": item["id"], "kind": item["kind"], "tags": item["tags"], "textLength": len(item["text"])}

    @mcp.tool()
    async def memories_search(query: str, limit: int = 10, kind: str | None = None, tags: list[str] | None = None) -> dict[str, Any]:
        q = (query or "").lower()
        results = []
        for m in memories.values():
            if kind and m.get("kind") != kind:
                continue
            if tags and not set(tags).issubset(set(m.get("tags", []))):
                continue
            if q and q not in (m.get("text", "").lower()):
                continue
            results.append({
                "id": m["id"],
                "kind": m.get("kind"),
                "text": m.get("text"),
                "tags": m.get("tags", []),
                "score": 0.9,
                "createdAt": m.get("createdAt"),
            })
        return {"query": query, "results": results[: max(1, limit)]}

    @mcp.tool()
    async def memories_get(id: str) -> dict[str, Any]:
        item = memories.get(id)
        if not item:
            return {"found": False, "id": id}
        return {"found": True, "memory": item}

    @mcp.tool()
    async def memories_delete(id: str) -> dict[str, Any]:
        existed = id in memories
        memories.pop(id, None)
        return {"deleted": existed, "id": id}


def register_rest_routes(mcp: Any) -> None:
    app = getattr(mcp, "app", None)
    if app is None:  # pragma: no cover
        return
    try:
        @app.get("/health")  # type: ignore[attr-defined]
        async def _health_route() -> dict[str, Any]:
            return {"status": "ok", "version": "2.0.0"}

        # Memory REST endpoints
        @app.post("/api/memories")  # type: ignore[attr-defined]
        async def _mem_store(payload: dict[str, Any]) -> dict[str, Any]:
            # Delegate to tool for consistency
            return await mcp._raw_funcs["memories_store"](  # type: ignore[attr-defined]
                kind=payload.get("kind", "note"),
                text=payload.get("text", ""),
                tags=payload.get("tags"),
                metadata=payload.get("metadata"),
            )

        @app.get("/api/memories")  # type: ignore[attr-defined]
        async def _mem_search(query: str = "", limit: int = 10) -> dict[str, Any]:
            return await mcp._raw_funcs["memories_search"](query=query, limit=limit)  # type: ignore[attr-defined]

        @app.get("/api/memories/{mem_id}")  # type: ignore[attr-defined]
        async def _mem_get(mem_id: str) -> dict[str, Any]:
            return await mcp._raw_funcs["memories_get"](mem_id)  # type: ignore[attr-defined]

        @app.delete("/api/memories/{mem_id}")  # type: ignore[attr-defined]
        async def _mem_delete(mem_id: str) -> dict[str, Any]:
            return await mcp._raw_funcs["memories_delete"](mem_id)  # type: ignore[attr-defined]
    except Exception as exc:  # pragma: no cover
        logger.debug("Optional FastAPI routes not initialized", exc_info=exc)


def create_server():
    """Create and configure the MCP server with tools and optional REST routes."""
    mcp = FastMCP(name="Cortex-OS MCP Server", instructions=server_instructions)
    register_core_tools(mcp)
    register_embedding_tools(mcp)
    register_document_tools(mcp)
    register_task_tools(mcp)
    register_memory_tools(mcp)
    register_rest_routes(mcp)
    return mcp


# Create server instance for FastMCP CLI compatibility
mcp = create_server()


def main():
    """Main entry point with enforced port 3024 and fallback to 127.0.0.1:8007."""
    # Environment configuration with enforced defaults
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "3024"))  # Enforce 3024 as primary port
    transport = os.getenv("TRANSPORT", "http").lower()

    # Fallback configuration
    fallback_host = "127.0.0.1"
    fallback_port = 8007

    logger.info("🚀 Starting Cortex-OS FastMCP Server v2.0")
    logger.info("📡 %s transport on %s:%s", transport.upper(), host, port)
    logger.info("🔗 Server will be available at: http://%s:%s/mcp", host, port)

    valid_transports = ["stdio", "http", "sse", "ws", "streamable-http"]
    if transport not in valid_transports:
        logger.warning("⚠️ Unknown transport '%s', falling back to 'http'", transport)
        transport = "http"

    if transport == "stdio":
        mcp.run(transport="stdio")
    else:
        try:
            mcp.run(transport="streamable-http", host=host, port=port)
        except OSError as exc:
            if "address already in use" in str(exc).lower():
                logger.warning("⚠️ Port %s in use, falling back to %s:%s", port, fallback_host, fallback_port)
                mcp.run(transport="streamable-http", host=fallback_host, port=fallback_port)
            else:
                raise


if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Cortex-OS FastMCP Server v2.0
Compatible with FastMCP 2.0 and ChatGPT MCP integration
"""

"""
import logging
def _register_core_tools(mcp: Any) -> None:
    """Register core search/fetch/health tools."""
from uuid import uuid4

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


# Note: This function aggregates tool registrations; complexity warning can be suppressed for clarity in a glue file.
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
                        return {
                            "tools": [
                                "search",
                                "fetch",
                                "ping",
                                "health_check",
                                "list_capabilities",
                                "generate_embeddings",
                                "upload_document",
                                "create_task",
                                "update_task_status",
                                "memories_store",
                                "memories_search",
                                "memories_get",
                                "memories_delete",
                            ],
                            "resources": [],
                            "prompts": [],
                            "version": "2.0.0",
                        }
                    "score": 0.95 - (i * 0.1),
                def _register_embedding_tools(mcp: Any) -> None:
                    # Embeddings (simple stub)
                    "url": f"https://cortex-os.dev/docs/search?q={query}#{i}",
                }
                for i in range(min(max_results, 3))
            ]

def _register_document_tools(mcp: Any) -> None:
    # Document Upload (simple registry)
            logger.info(f"Search returned {len(results)} results")
            return {"query": query, "results": results, "total_found": len(results)}
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return {
                "error": f"Search failed: {e!s}",
                "query": query,
                "results": [],
                "total_found": 0,
            }

def _register_task_tools(mcp: Any) -> None:
    # Task Orchestration
    @mcp.tool()
    async def fetch(resource_id: str) -> dict[str, Any]:
        """
        Fetch a specific resource by ID for detailed analysis.

def _register_memory_tools(mcp: Any) -> None:
    # In-Memory Memories
        Args:
            resource_id: Resource ID to fetch

def _register_rest_routes(mcp: Any) -> None:
    # Optionally expose an HTTP /health route if FastAPI app is available
    app = getattr(mcp, "app", None)
        Returns:
            Complete resource with content and metadata
        """
        if not resource_id:
            raise ValueError("Resource ID is required")

def create_server():
    """Create and configure the MCP server with tools and optional REST routes."""
    mcp = FastMCP(name="Cortex-OS MCP Server", instructions=server_instructions)
    _register_core_tools(mcp)
    _register_embedding_tools(mcp)
    _register_document_tools(mcp)
    _register_task_tools(mcp)
    _register_memory_tools(mcp)
    _register_rest_routes(mcp)
    return mcp
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
            raise ValueError(f"Fetch failed: {e!s}") from e

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
                "generate_embeddings",
                "upload_document",
                "create_task",
                "update_task_status",
                "memories_store",
                "memories_search",
                "memories_get",
                "memories_delete",
            ],
            "resources": [],
            "prompts": [],
            "version": "2.0.0",
        }

    # ---------------------------
    # Embeddings (simple stub)
    # ---------------------------
    def _normalize_vector(vec: list[float]) -> list[float]:
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    def _embed_text(t: str) -> list[float]:
        # Very simple stable hash to vector stub
        h = sum((i + 1) * ord(c) for i, c in enumerate(t))
        base = [float(((h >> s) & 0xFF) / 255.0) for s in (0, 8, 16, 24, 32, 40, 48, 56)]
        return _normalize_vector(base)

    @mcp.tool()
    async def generate_embeddings(texts: list[str], model: str | None = None) -> dict[str, Any]:
        """
        Generate embeddings for provided texts (stubbed, deterministic).
        """
        _ = model  # unused
        if not isinstance(texts, list) or not texts:
            return {"embeddings": []}
        return {"embeddings": [_embed_text(t) for t in texts]}

    # ---------------------------------
    # Document Upload (simple registry)
    # ---------------------------------
    _documents: dict[str, dict[str, Any]] = {}

    @mcp.tool()
    async def upload_document(
        content: str,
        filename: str,
        options: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        doc_id = f"doc-{uuid4()}"
        _documents[doc_id] = {
            "id": doc_id,
            "filename": filename,
            "content": content,
            "metadata": (options or {}).get("metadata", {}),
            "tags": (options or {}).get("tags", []),
            "createdAt": time.time(),
        }
        return {"documentId": doc_id, "url": f"mcp://documents/{doc_id}"}

    # ----------------------
    # Task Orchestration
    # ----------------------
    _tasks: dict[str, dict[str, Any]] = {}

    @mcp.tool()
    async def create_task(title: str, description: str, options: dict[str, Any] | None = None) -> dict[str, Any]:
        task_id = f"task-{uuid4()}"
        _tasks[task_id] = {
            "id": task_id,
            "title": title,
            "description": description,
            "status": (options or {}).get("status", "queued"),
            "notes": [],
            "createdAt": time.time(),
        }
        return {"taskId": task_id, "url": f"mcp://tasks/{task_id}"}

    @mcp.tool()
    async def update_task_status(task_id: str, status: str, notes: str | None = None) -> dict[str, Any]:
        task = _tasks.get(task_id)
        if not task:
            return {"updated": False, "error": "task not found"}
        task["status"] = status
        if notes:
            task.setdefault("notes", []).append(notes)
        task["updatedAt"] = time.time()
        return {"updated": True}

    # ----------------------
    # In-Memory Memories
    # ----------------------
    _memories: dict[str, dict[str, Any]] = {}

    def _mem_item(kind: str, text: str, tags: list[str] | None, metadata: dict[str, Any] | None) -> dict[str, Any]:
        mem_id = f"mem-{uuid4()}"
        return {
            "id": mem_id,
            "kind": kind,
            "text": text,
            "tags": tags or [],
            "metadata": metadata or {},
            "createdAt": time.time(),
            "updatedAt": time.time(),
        }

    @mcp.tool()
    async def memories_store(kind: str, text: str, tags: list[str] | None = None, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
        item = _mem_item(kind, text, tags, metadata)
        _memories[item["id"]] = item
        return {"stored": True, "id": item["id"], "kind": item["kind"], "tags": item["tags"], "textLength": len(item["text"])}

    @mcp.tool()
    async def memories_search(query: str, limit: int = 10, kind: str | None = None, tags: list[str] | None = None) -> dict[str, Any]:
        q = (query or "").lower()
        results = []
        for m in _memories.values():
            if kind and m.get("kind") != kind:
                continue
            if tags and not set(tags).issubset(set(m.get("tags", []))):
                continue
            if q and q not in (m.get("text", "").lower()):
                continue
            results.append({
                "id": m["id"],
                "kind": m.get("kind"),
                "text": m.get("text"),
                "tags": m.get("tags", []),
                "score": 0.9,
                "createdAt": m.get("createdAt"),
            })
        return {"query": query, "results": results[: max(1, limit)]}

    @mcp.tool()
    async def memories_get(id: str) -> dict[str, Any]:
        item = _memories.get(id)
        if not item:
            return {"found": False, "id": id}
        return {"found": True, "memory": item}

    @mcp.tool()
    async def memories_delete(id: str) -> dict[str, Any]:
        existed = id in _memories
        _memories.pop(id, None)
        return {"deleted": existed, "id": id}

    # Optionally expose an HTTP /health route if FastAPI app is available
    app = getattr(mcp, "app", None)
    if app is not None:  # pragma: no cover - depends on FastAPI transport being present
        try:

            @app.get("/health")  # type: ignore[attr-defined]
            async def _health_route() -> dict[str, Any]:
                return {"status": "ok", "version": "2.0.0"}
            # Simple REST routes for memories
            @app.post("/api/memories")  # type: ignore[attr-defined]
            async def _mem_store(payload: dict[str, Any]) -> dict[str, Any]:
                return await memories_store(
                    kind=payload.get("kind", "note"),
                    text=payload.get("text", ""),
                    tags=payload.get("tags"),
                    metadata=payload.get("metadata"),
                )

            @app.get("/api/memories")  # type: ignore[attr-defined]
            async def _mem_search(query: str = "", limit: int = 10) -> dict[str, Any]:
                return await memories_search(query=query, limit=limit)

            @app.get("/api/memories/{mem_id}")  # type: ignore[attr-defined]
            async def _mem_get(mem_id: str) -> dict[str, Any]:
                return await memories_get(mem_id)

            @app.delete("/api/memories/{mem_id}")  # type: ignore[attr-defined]
            async def _mem_delete(mem_id: str) -> dict[str, Any]:
                return await memories_delete(mem_id)
        except Exception as exc:  # pragma: no cover - be resilient if transport not initialized
            logger.debug("Optional FastAPI routes not initialized", exc_info=exc)

    return mcp


# Create server instance for FastMCP CLI compatibility
mcp = create_server()


def main():
    """Main entry point with enforced port 3024 and fallback to 127.0.0.1:8007."""
    # Environment configuration with enforced defaults
    host = os.getenv("HOST", "127.0.0.1")
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
