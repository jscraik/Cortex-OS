#!/usr/bin/env python3
"""brAInwav Cortex-OS FastMCP Server v2.x."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any, Callable

from fastmcp import FastMCP  # type: ignore
from starlette.middleware import Middleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from adapters.memory_adapter import LocalMemoryAdapter
from adapters.search_adapter import CortexSearchAdapter, SearchAdapterError
from auth.jwt_auth import JWTAuthenticator, create_authenticator_from_env
from config import MCPSettings
from health.checks import HealthCheckRegistry, SystemHealthCheck
from middleware.rate_limiter import RateLimiter
from monitoring.metrics import MetricsMiddleware
from resilience.circuit_breaker import CircuitBreaker, CircuitBreakerError
from security.input_validation import (
    sanitize_output,
    validate_resource_id,
    validate_search_query,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - brAInwav Cortex MCP - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

server_instructions = (
    "This brAInwav Cortex MCP server exposes knowledge search, document fetch, and "
    "Local Memory tooling. Use the search tool to locate Cortex-OS documentation, "
    "fetch to retrieve full content, and the memories_* tools to persist context via "
    "Local Memory."
)


@dataclass
class ServerAdapters:
    search: CortexSearchAdapter
    memory: LocalMemoryAdapter


@dataclass
class AuthComponents:
    authenticator: JWTAuthenticator
    rate_limiter: RateLimiter


def _build_adapters(settings: MCPSettings) -> ServerAdapters:
    search_adapter = CortexSearchAdapter(
        search_url=str(settings.cortex_search_url or ""),
        document_url=str(settings.cortex_document_base_url or ""),
        api_key=settings.cortex_search_api_key,
        timeout_seconds=settings.http_timeout_seconds,
        retries=settings.http_retries,
    )
    memory_adapter = LocalMemoryAdapter(
        base_url=str(settings.local_memory_base_url),
        api_key=settings.local_memory_api_key,
        namespace=settings.local_memory_namespace,
        timeout_seconds=settings.http_timeout_seconds,
        retries=settings.http_retries,
    )
    return ServerAdapters(search=search_adapter, memory=memory_adapter)


def _build_auth(overrides: dict[str, Any] | None = None) -> AuthComponents:
    if overrides and "authenticator" in overrides:
        authenticator = overrides["authenticator"]
    else:
        authenticator = create_authenticator_from_env()
    if overrides and "rate_limiter" in overrides:
        limiter = overrides["rate_limiter"]
    else:
        limiter = RateLimiter(rpm=120, burst=20)
    return AuthComponents(authenticator=authenticator, rate_limiter=limiter)


def _register_search_tool(mcp: FastMCP, adapters: ServerAdapters) -> None:
    circuit = CircuitBreaker(name="cortex-search", failure_threshold=5, recovery_timeout=30)

    @mcp.tool()
    async def search(query: str, max_results: int = 10) -> dict[str, Any]:
        try:
            clean_query = validate_search_query(query)
        except ValueError as exc:
            return sanitize_output({"error": str(exc), "results": [], "total_found": 0})
        limit = max(1, min(int(max_results), 100))
        try:
            payload = await circuit.call(adapters.search.search, clean_query, limit=limit)
            if isinstance(payload, dict):
                payload.setdefault("query", clean_query)
                results = payload.get("results", [])
                if isinstance(results, list):
                    payload.setdefault("total_found", len(results))
            return sanitize_output(payload)
        except (SearchAdapterError, CircuitBreakerError) as exc:
            logger.error("brAInwav search failed: %s", exc)
            return sanitize_output({"error": str(exc), "results": [], "total_found": 0})


def _register_fetch_tool(mcp: FastMCP, adapters: ServerAdapters) -> None:
    @mcp.tool()
    async def fetch(resource_id: str) -> dict[str, Any]:
        try:
            rid = validate_resource_id(resource_id)
        except ValueError as exc:
            return sanitize_output({"error": str(exc)})
        try:
            if rid.startswith("mem-"):
                memory = await adapters.memory.get(rid)
                if not memory:
                    return sanitize_output({"error": "memory not found", "id": rid})
                return sanitize_output({"id": rid, "source": "local-memory", "data": memory})
            document = await adapters.search.fetch(rid)
            return sanitize_output({"id": rid, "source": "cortex-docs", "data": document})
        except SearchAdapterError as exc:
            logger.error("brAInwav fetch failed: %s", exc)
            return sanitize_output({"error": str(exc), "id": rid})


def _register_capabilities_tool(mcp: FastMCP) -> None:
    @mcp.tool()
    async def list_capabilities() -> dict[str, Any]:
        return sanitize_output(
            {
                "tools": [
                    "search",
                    "fetch",
                    "ping",
                    "health_check",
                    "memories_store",
                    "memories_search",
                    "memories_get",
                    "memories_delete",
                ],
                "resources": [],
                "prompts": [],
                "version": "2.1.0",
            }
        )


def _register_ping_tool(mcp: FastMCP) -> None:
    @mcp.tool()
    async def ping(transport: str = "unknown") -> dict[str, Any]:
        return sanitize_output(
            {
                "status": "ok",
                "message": "brAInwav Cortex MCP is operational",
                "transport": transport,
                "version": "2.1.0",
            }
        )


def _register_health_tool(mcp: FastMCP) -> None:
    @mcp.tool()
    async def health_check() -> dict[str, Any]:
        return sanitize_output({"status": "ok", "version": "2.1.0"})


def _register_memory_tools(mcp: FastMCP, adapters: ServerAdapters) -> None:
    @mcp.tool()
    async def memories_store(
        kind: str,
        text: str,
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        record = await adapters.memory.store(
            kind=kind,
            text=text,
            tags=tags,
            metadata=metadata,
        )
        return sanitize_output({"stored": True, "memory": record})

    @mcp.tool()
    async def memories_search(
        query: str,
        limit: int = 10,
        kind: str | None = None,
        tags: list[str] | None = None,
    ) -> dict[str, Any]:
        return await adapters.memory.search(
            query=query or "",
            limit=max(1, min(int(limit), 100)),
            kind=kind,
            tags=tags,
        )

    @mcp.tool()
    async def memories_get(id: str) -> dict[str, Any]:
        record = await adapters.memory.get(id)
        if not record:
            return sanitize_output({"found": False, "id": id})
        return sanitize_output({"found": True, "memory": record})

    @mcp.tool()
    async def memories_delete(id: str) -> dict[str, Any]:
        deleted = await adapters.memory.delete(id)
        return sanitize_output({"deleted": deleted, "id": id})


def _register_metrics(mcp: FastMCP) -> None:
    mcp.add_middleware(Middleware(MetricsMiddleware))


def _register_health_routes(mcp: FastMCP, adapters: ServerAdapters) -> None:
    registry = HealthCheckRegistry()
    registry.register(SystemHealthCheck())

    @mcp.custom_route("/health", ["GET"])
    async def _health(_: Request) -> JSONResponse:
        return JSONResponse({"status": "ok", "version": "2.1.0"})

    @mcp.custom_route("/health/details", ["GET"])
    async def _health_details(_: Request) -> JSONResponse:
        summary = await registry.run_all()
        summary["adapters"] = {
            "search": adapters.search.search_url != "",
            "memory": bool(adapters.memory.base_url),
        }
        return JSONResponse(sanitize_output(summary))


def _register_discovery_route(mcp: FastMCP) -> None:
    manifest_payload = {
        "version": "1.0",
        "generatedAt": os.getenv("MCP_MANIFEST_GENERATED_AT", ""),
        "servers": [
            {
                "id": "cortex-mcp",
                "name": "brAInwav Cortex MCP Server",
                "description": "Cortex-OS MCP endpoint exposing knowledge tools and Local Memory integration.",
                "endpoint": os.getenv("CORTEX_MCP_PUBLIC_ENDPOINT", "https://cortex-mcp.brainwav.io/mcp"),
                "transport": "sse",
                "capabilities": ["tools", "resources", "prompts"],
                "authentication": {
                    "required": True,
                    "notes": "JWT authentication enforced on REST endpoints.",
                },
            }
        ],
        "branding": {
            "provider": "brAInwav",
            "support": "https://github.com/jamiescottcraik/brAInwav",
        },
    }

    @mcp.custom_route("/.well-known/mcp.json", ["GET"])
    async def _manifest(_: Request) -> JSONResponse:
        return JSONResponse(sanitize_output(manifest_payload))


async def _authorized_response(
    request: Request,
    scope: str,
    auth: AuthComponents,
    handler: Callable[[], Any],
) -> JSONResponse:
    auth.authenticator.verify_request(request, required_scope=scope)
    auth.rate_limiter.check(request)
    payload = await handler()
    return JSONResponse(sanitize_output(payload))


def _register_memory_store_route(
    mcp: FastMCP,
    adapters: ServerAdapters,
    auth: AuthComponents,
) -> None:
    @mcp.custom_route("/api/memories", ["POST"])
    async def _mem_store(request: Request) -> JSONResponse:
        body = await request.json()

        async def _store() -> dict[str, Any]:
            record = await adapters.memory.store(
                kind=body.get("kind", "note"),
                text=body.get("text", ""),
                tags=body.get("tags"),
                metadata=body.get("metadata"),
            )
            return {"stored": True, "memory": record}

        return await _authorized_response(request, "memories:write", auth, _store)


def _register_memory_search_route(
    mcp: FastMCP,
    adapters: ServerAdapters,
    auth: AuthComponents,
) -> None:
    @mcp.custom_route("/api/memories", ["GET"])
    async def _mem_search(request: Request) -> JSONResponse:
        params = request.query_params

        async def _search() -> dict[str, Any]:
            tags_param: list[str] | None = None
            if hasattr(params, "getlist"):
                tags_param = params.getlist("tags")
            return await adapters.memory.search(
                query=params.get("query", ""),
                limit=int(params.get("limit", "10")),
                kind=params.get("kind"),
                tags=tags_param,
            )

        return await _authorized_response(request, "memories:read", auth, _search)


def _register_memory_get_route(
    mcp: FastMCP,
    adapters: ServerAdapters,
    auth: AuthComponents,
) -> None:
    @mcp.custom_route("/api/memories/{mem_id}", ["GET"])
    async def _mem_get(request: Request) -> JSONResponse:
        mem_id = request.path_params.get("mem_id", "")

        async def _get() -> dict[str, Any]:
            record = await adapters.memory.get(mem_id)
            if not record:
                return {"found": False, "id": mem_id}
            return {"found": True, "memory": record}

        return await _authorized_response(request, "memories:read", auth, _get)


def _register_memory_delete_route(
    mcp: FastMCP,
    adapters: ServerAdapters,
    auth: AuthComponents,
) -> None:
    @mcp.custom_route("/api/memories/{mem_id}", ["DELETE"])
    async def _mem_delete(request: Request) -> JSONResponse:
        mem_id = request.path_params.get("mem_id", "")

        async def _delete() -> dict[str, Any]:
            deleted = await adapters.memory.delete(mem_id)
            return {"deleted": deleted, "id": mem_id}

        return await _authorized_response(request, "memories:delete", auth, _delete)


def _register_memory_routes(
    mcp: FastMCP,
    adapters: ServerAdapters,
    auth: AuthComponents,
) -> None:
    _register_memory_store_route(mcp, adapters, auth)
    _register_memory_search_route(mcp, adapters, auth)
    _register_memory_get_route(mcp, adapters, auth)
    _register_memory_delete_route(mcp, adapters, auth)


def register_rest_routes(mcp: FastMCP, adapters: ServerAdapters, auth: AuthComponents) -> None:
    _register_metrics(mcp)
    _register_health_routes(mcp, adapters)
    _register_discovery_route(mcp)
    _register_memory_routes(mcp, adapters, auth)


def create_server(
    *,
    adapters: dict[str, Any] | None = None,
    auth_overrides: dict[str, Any] | None = None,
    settings: MCPSettings | None = None,
) -> FastMCP:
    resolved_settings = settings or MCPSettings()
    logger.info("brAInwav MCP settings: %s", resolved_settings.dict_for_logging())

    if adapters:
        search_adapter = adapters.get("search")
        memory_adapter = adapters.get("memory")
        if search_adapter is None or memory_adapter is None:
            raise ValueError("Both search and memory adapters are required")
        resolved_adapters = ServerAdapters(
            search=search_adapter,
            memory=memory_adapter,
        )
    else:
        resolved_adapters = _build_adapters(resolved_settings)

    auth_components = _build_auth(auth_overrides)

    mcp = FastMCP(name="brAInwav Cortex MCP", instructions=server_instructions)
    _register_search_tool(mcp, resolved_adapters)
    _register_fetch_tool(mcp, resolved_adapters)
    _register_capabilities_tool(mcp)
    _register_ping_tool(mcp)
    _register_health_tool(mcp)
    _register_memory_tools(mcp, resolved_adapters)
    register_rest_routes(mcp, resolved_adapters, auth_components)
    return mcp


def main() -> None:
    host = os.getenv("HOST", "127.0.0.1")
    os.getenv("PORT", "8000")
    logger.info("brAInwav MCP entrypoint invoked on %s", host)
    _ = create_server()


mcp = create_server()

if __name__ == "__main__":  # pragma: no cover
    main()
