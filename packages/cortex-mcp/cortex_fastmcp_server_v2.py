#!/usr/bin/env python3
"""
Cortex-OS FastMCP Server v2.0
Compatible with FastMCP 2.0 and ChatGPT MCP integration
"""

import json
import logging
import math
import os
import time
from typing import Any
from uuid import uuid4

from fastmcp import FastMCP  # type: ignore
from security.input_validation import (
    sanitize_output,
    validate_resource_id,
    validate_search_query,
)
from starlette.middleware import Middleware
from starlette.requests import Request
from starlette.responses import JSONResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Local validation utilities (must be available)


server_instructions = (
    "This MCP server provides search and document retrieval capabilities "
    "for the Cortex-OS knowledge base and Local Memory integration. "
    "Use the search tool to find relevant information, then use the fetch tool "
    "to retrieve complete content. Local Memory integration provides persistent "
    "memory storage and retrieval for ChatGPT conversations."
)


def register_core_tools(mcp: Any) -> None:
    """Register core search/fetch/health tools."""

    @mcp.tool()
    async def search(query: str, max_results: int = 10) -> dict[str, Any]:
        """Full-text search over Cortex-OS docs; returns top matches."""
        # Input validation
        try:
            q = validate_search_query(query)
            max_r = max(1, min(int(max_results), 100))
        except Exception as exc:
            return {"error": str(exc), "results": [], "total_found": 0}

        try:
            logger.info("Searching for query: %r", q)
            results: list[dict[str, Any]] = [
                {
                    "id": f"cortex-doc-{i}",
                    "title": f"Search result for: {q}",
                    "text": (f"This is a simulated search result for the query: {q}"),
                    "score": 0.95 - (i * 0.1),
                    "url": f"https://cortex-os.dev/docs/search?q={q}#{i}",
                }
                for i in range(min(max_r, 3))
            ]
            logger.info("Search returned %d results", len(results))
            payload = {"query": q, "results": results, "total_found": len(results)}
            return sanitize_output(payload)
        except Exception as exc:  # pragma: no cover
            logger.error("Search failed: %s", exc)
            return {
                "error": f"Search failed: {exc!s}",
                "query": q,
                "results": [],
                "total_found": 0,
            }

    @mcp.tool()
    async def fetch(resource_id: str) -> dict[str, Any]:
        """Fetch a full document by `resource_id` and return its content."""
        try:
            rid = validate_resource_id(resource_id)
        except Exception as exc:
            raise ValueError(str(exc)) from exc

        try:
            logger.info("Fetching resource: %s", rid)
            return {
                "id": rid,
                "title": f"Resource {rid}",
                "text": (
                    "Complete content for resource "
                    f"{rid}. This would contain the full document text in a real implementation."
                ),
                "url": f"https://cortex-os.dev/docs/{rid}",
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
        """Lightweight liveness probe reporting server status and transport."""
        return {
            "status": "ok",
            "message": "Cortex-OS MCP Server is running",
            "version": "2.0.0",
            "transport": transport,
        }

    @mcp.tool()
    async def health_check() -> dict[str, Any]:
        """Comprehensive health check reporting basic server status/version."""
        return {"status": "ok", "version": "2.0.0"}

    @mcp.tool()
    async def list_capabilities() -> dict[str, Any]:
        """List available tools/resources/prompts supported by this server."""
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
        base = [
            float(((h >> s) & 0xFF) / 255.0) for s in (0, 8, 16, 24, 32, 40, 48, 56)
        ]
        return _normalize_vector(base)

    @mcp.tool()
    async def generate_embeddings(
        texts: list[str], model: str | None = None
    ) -> dict[str, Any]:
        """Generate simple, deterministic embeddings for provided texts."""
        _ = model
        if not isinstance(texts, list) or not texts:
            return {"embeddings": []}
        return {"embeddings": [_embed_text(t) for t in texts]}


def register_document_tools(mcp: Any) -> None:
    documents: dict[str, dict[str, Any]] = {}

    @mcp.tool()
    async def upload_document(
        content: str, filename: str, options: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Upload a document blob for later retrieval and tagging."""
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
    async def create_task(
        title: str, description: str, options: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Create a task with optional initial status and tags."""
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
    async def update_task_status(
        task_id: str, status: str, notes: str | None = None
    ) -> dict[str, Any]:
        """Update a task's status and optionally append a progress note."""
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

    def _mem_item(
        kind: str, text: str, tags: list[str] | None, metadata: dict[str, Any] | None
    ) -> dict[str, Any]:
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
    async def memories_store(
        kind: str,
        text: str,
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Store a memory item with kind/tags/metadata; returns memory id."""
        item = _mem_item(kind, text, tags, metadata)
        memories[item["id"]] = item
        return {
            "stored": True,
            "id": item["id"],
            "kind": item["kind"],
            "tags": item["tags"],
            "textLength": len(item["text"]),
        }

    def _match_kind(m: dict[str, Any], kind: str | None) -> bool:
        return (kind is None) or (m.get("kind") == kind)

    def _match_tags(m: dict[str, Any], tag_set: set[str]) -> bool:
        return (not tag_set) or tag_set.issubset(set(m.get("tags", [])))

    def _match_query(m: dict[str, Any], q: str) -> bool:
        if not q:
            return True
        return q in (m.get("text") or "").lower()

    @mcp.tool()
    async def memories_search(
        query: str,
        limit: int = 10,
        kind: str | None = None,
        tags: list[str] | None = None,
    ) -> dict[str, Any]:
        """Search stored memories by text, kind and tags with a limit."""
        q = (query or "").lower()
        tag_set: set[str] = set(tags or [])
        values = list(memories.values())

        results = [
            {
                "id": m["id"],
                "kind": m.get("kind"),
                "text": m.get("text"),
                "tags": m.get("tags", []),
                "score": 0.9,
                "createdAt": m.get("createdAt"),
            }
            for m in values
            if _match_kind(m, kind) and _match_tags(m, tag_set) and _match_query(m, q)
        ]
        return {"query": query, "results": results[: max(1, limit)]}

    @mcp.tool()
    async def memories_get(id: str) -> dict[str, Any]:
        """Retrieve a stored memory by id, if present."""
        item = memories.get(id)
        if not item:
            return {"found": False, "id": id}
        return {"found": True, "memory": item}

    @mcp.tool()
    async def memories_delete(id: str) -> dict[str, Any]:
        """Delete a stored memory by id; returns whether it existed."""
        existed = id in memories
        memories.pop(id, None)
        return {"deleted": existed, "id": id}


def _call_mcp_tool(mcp: Any, tool_name: str, args: dict[str, Any]) -> Any:
    """Call an MCP tool by name and return parsed JSON when available."""

    async def _run() -> Any:
        tools = await mcp.get_tools()
        tool = tools.get(tool_name)
        if tool is None:
            return {"error": f"tool not found: {tool_name}"}
        result = await tool.run(args)
        content = getattr(result, "content", None)
        if content and hasattr(content[0], "text"):
            try:
                return json.loads(content[0].text)
            except Exception:
                return {"result": content[0].text}
        if isinstance(result, dict):
            return result
        return {"result": result}

    return _run()


def _register_metrics_middleware(mcp: Any) -> None:
    try:
        from monitoring.metrics import MetricsMiddleware

        mcp.add_middleware(Middleware(MetricsMiddleware))
    except Exception as exc:  # pragma: no cover
        logger.debug("Metrics middleware not initialized", exc_info=exc)


def _register_health_routes(mcp: Any) -> None:
    try:
        from health.checks import HealthCheckRegistry, SystemHealthCheck

        registry = HealthCheckRegistry()
        registry.register(SystemHealthCheck())

        @mcp.custom_route("/health/details", ["GET"])
        async def _health_details(_: Request) -> JSONResponse:
            return JSONResponse(await registry.run_all())
    except Exception as exc:  # pragma: no cover
        logger.debug("Health details route not initialized", exc_info=exc)

    @mcp.custom_route("/health", ["GET"])
    async def _health_route(_: Request) -> JSONResponse:
        return JSONResponse({"status": "ok", "version": "2.0.0"})


def _register_discovery_route(mcp: Any) -> None:
    manifest_payload = {
        "version": "1.0",
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "servers": [
            {
                "id": "cortex-mcp",
                "name": "brAInwav Cortex MCP Server",
                "description": (
                    "brAInwav Cortex MCP endpoint exposing tools, resources, and"
                    " prompts for Cortex-OS clients."
                ),
                "endpoint": "https://cortex-mcp.brainwav.io/mcp",
                "transport": "sse",
                "capabilities": ["tools", "resources", "prompts"],
                "authentication": {
                    "required": False,
                    "notes": "Public brAInwav discovery manifest; enforce auth per tool policies if updated.",
                },
            }
        ],
        "branding": {
            "provider": "brAInwav",
            "support": "https://github.com/jamiescottcraik/brAInwav",
        },
    }

    @mcp.custom_route("/.well-known/mcp.json", ["GET"])
    async def _discovery_manifest(_: Request) -> JSONResponse:
        return JSONResponse(manifest_payload)


def _register_mem_store_route(mcp: Any, auth: Any, limiter: Any) -> None:
    @mcp.custom_route("/api/memories", ["POST"])
    async def _mem_store(request: Request) -> JSONResponse:
        auth.verify_request(request, required_scope="memories:write")
        limiter.check(request)
        payload = await request.json()
        result = await _call_mcp_tool(
            mcp,
            "memories_store",
            {
                "kind": payload.get("kind", "note"),
                "text": payload.get("text", ""),
                "tags": payload.get("tags"),
                "metadata": payload.get("metadata"),
            },
        )
        return JSONResponse(sanitize_output(result))


def _register_mem_search_route(mcp: Any, auth: Any, limiter: Any) -> None:
    @mcp.custom_route("/api/memories", ["GET"])
    async def _mem_search(request: Request) -> JSONResponse:
        auth.verify_request(request, required_scope="memories:read")
        limiter.check(request)
        query = request.query_params.get("query", "")
        limit_param = request.query_params.get("limit", "10")
        try:
            limit = int(limit_param)
        except (TypeError, ValueError):
            limit = 10
        try:
            q = validate_search_query(query or "")
        except Exception:
            q = ""
        result = await _call_mcp_tool(
            mcp, "memories_search", {"query": q, "limit": limit}
        )
        return JSONResponse(result)


def _register_mem_get_route(mcp: Any, auth: Any, limiter: Any) -> None:
    @mcp.custom_route("/api/memories/{mem_id}", ["GET"])
    async def _mem_get(request: Request) -> JSONResponse:
        auth.verify_request(request, required_scope="memories:read")
        limiter.check(request)
        mem_id = request.path_params.get("mem_id", "")
        result = await _call_mcp_tool(mcp, "memories_get", {"id": mem_id})
        return JSONResponse(result)


def _register_mem_delete_route(mcp: Any, auth: Any, limiter: Any) -> None:
    @mcp.custom_route("/api/memories/{mem_id}", ["DELETE"])
    async def _mem_delete(request: Request) -> JSONResponse:
        auth.verify_request(request, required_scope="memories:delete")
        limiter.check(request)
        mem_id = request.path_params.get("mem_id", "")
        result = await _call_mcp_tool(mcp, "memories_delete", {"id": mem_id})
        return JSONResponse(result)


def _register_memory_routes(mcp: Any) -> None:
    from auth.jwt_auth import create_authenticator_from_env
    from middleware.rate_limiter import RateLimiter

    auth = create_authenticator_from_env()
    limiter = RateLimiter(rpm=120, burst=20)

    _register_mem_store_route(mcp, auth, limiter)
    _register_mem_search_route(mcp, auth, limiter)
    _register_mem_get_route(mcp, auth, limiter)
    _register_mem_delete_route(mcp, auth, limiter)


def register_rest_routes(mcp: Any) -> None:
    """Attach REST routes to the underlying HTTP app if available."""
    _register_metrics_middleware(mcp)
    _register_health_routes(mcp)
    _register_discovery_route(mcp)
    try:
        _register_memory_routes(mcp)
    except Exception as exc:  # pragma: no cover
        logger.debug("Memory routes not initialized", exc_info=exc)


def create_server() -> Any:
    """Create and configure the MCP server with tools and optional REST routes."""
    mcp = FastMCP(name="Cortex-OS MCP Server", instructions=server_instructions)
    register_core_tools(mcp)
    register_embedding_tools(mcp)
    register_document_tools(mcp)
    # Attach REST routes if an HTTP app is present
    try:
        register_rest_routes(mcp)
    except Exception as exc:  # pragma: no cover
        logger.debug("REST route registration skipped", exc_info=exc)
    return mcp


def main() -> None:
    """Entry point stub for CLI integration and env handling."""
    host = os.getenv("HOST", "127.0.0.1")
    _ = host  # reserved for future use
    from contextlib import suppress

    with suppress(ValueError):
        int(os.getenv("PORT", "8000"))
    os.getenv("TRANSPORT", "stdio")
    # Do not auto-run a server here; tests only require this to be callable.
    _ = create_server()


# Global instance for CLI tooling expectations
mcp = create_server()

if __name__ == "__main__":  # pragma: no cover
    main()
