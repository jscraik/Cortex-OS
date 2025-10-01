#!/usr/bin/env python3
"""brAInwav Cortex MCP FastMCP server entrypoint."""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from importlib.metadata import version as pkg_version
from typing import Any

import uvicorn
from fastapi import status
from fastmcp import FastMCP
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from .adapters.memory_adapter import LocalMemoryAdapter, MemoryAdapterError
from .adapters.search_adapter import CortexSearchAdapter, SearchAdapterError
from .auth.jwt_auth import JWTAuthenticator, create_authenticator_from_env
from .config import MCPSettings
from .middleware.rate_limiter import RateLimiter
from .monitoring.metrics import MetricsMiddleware
from .resilience.circuit_breaker import CircuitBreaker, CircuitBreakerError
from .security.input_validation import (
    sanitize_output,
    validate_resource_id,
    validate_search_query,
)

BRANDING = {
    "provider": "brAInwav",
    "product": "Cortex MCP",
    "docs": "https://docs.cortex-os.ai/mcp",
}
DEFAULT_PUBLIC_ENDPOINT = os.getenv(
    "CORTEX_MCP_PUBLIC_ENDPOINT", "https://cortex-mcp.brainwav.io/mcp"
)
DEFAULT_TRANSPORT = os.getenv("CORTEX_MCP_TRANSPORT", "streamable-http")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [info] %(message)s")
logger = logging.getLogger("cortex-mcp")


@dataclass
class AdapterBundle:
    search: CortexSearchAdapter | None
    memory: LocalMemoryAdapter | None


@dataclass
class AuthBundle:
    authenticator: JWTAuthenticator | None
    rate_limiter: RateLimiter | None


@dataclass
class ResilienceBundle:
    search_breaker: CircuitBreaker
    memory_breaker: CircuitBreaker


@dataclass
class ToolCatalog:
    entries: list[dict[str, Any]]

    def add(self, *, name: str, description: str, enabled: bool = True) -> None:
        self.entries.append(
            {
                "name": name,
                "description": description,
                "enabled": enabled,
            }
        )

    def list(self) -> list[dict[str, Any]]:
        return [dict(entry) for entry in self.entries]

    def manifest(self) -> list[dict[str, Any]]:
        return [
            {
                "name": entry["name"],
                "description": entry.get("description", ""),
                "transport": DEFAULT_TRANSPORT,
            }
            for entry in self.entries
            if entry.get("enabled", True)
        ]


def _resolve_adapters(
    settings: MCPSettings, overrides: dict[str, Any] | None
) -> AdapterBundle:
    overrides = overrides or {}
    search = overrides.get("search")
    if search is None and settings.cortex_search_url:  # pragma: no cover - runtime HTTP wiring
        search = CortexSearchAdapter(
            search_url=str(settings.cortex_search_url),
            document_url=(
                str(settings.cortex_document_base_url)
                if settings.cortex_document_base_url
                else None
            ),
            api_key=settings.cortex_search_api_key,
            timeout_seconds=settings.http_timeout_seconds,
            retries=settings.http_retries,
        )
    memory = _build_memory_adapter(settings=settings, overrides=overrides)
    return AdapterBundle(search=search, memory=memory)


def _build_memory_adapter(
    *, settings: MCPSettings, overrides: dict[str, Any]
) -> LocalMemoryAdapter | None:
    override = overrides.get("memory")
    if override is not None:
        return override

    if not settings.local_memory_base_url:
        raise RuntimeError(
            "LOCAL_MEMORY_BASE_URL is required for cortex-mcp. Configure the "
            "@cortex-os/memory-core HTTP endpoint."
        )

    return LocalMemoryAdapter(
        base_url=str(settings.local_memory_base_url),
        api_key=settings.local_memory_api_key,
        namespace=settings.local_memory_namespace,
        timeout_seconds=settings.http_timeout_seconds,
        retries=settings.http_retries,
    )


def _resolve_auth_bundle(overrides: dict[str, Any] | None) -> AuthBundle:
    overrides = overrides or {}
    authenticator = overrides.get("authenticator")
    if authenticator is None:
        try:
            authenticator = create_authenticator_from_env()
        except RuntimeError:
            authenticator = None
    rate_limiter = overrides.get("rate_limiter")
    if rate_limiter is None:
        rpm = int(os.getenv("CORTEX_MCP_RATE_LIMIT_RPM", "120"))
        burst = int(os.getenv("CORTEX_MCP_RATE_LIMIT_BURST", "20"))
        rate_limiter = RateLimiter(rpm=rpm, burst=burst)
    return AuthBundle(authenticator=authenticator, rate_limiter=rate_limiter)


def _resolve_resilience(overrides: dict[str, Any] | None = None) -> ResilienceBundle:
    overrides = overrides or {}
    search_breaker = overrides.get("search_breaker")
    if search_breaker is None:
        failures = int(os.getenv("CORTEX_MCP_SEARCH_BREAKER_FAILURES", "5"))
        timeout = float(os.getenv("CORTEX_MCP_SEARCH_BREAKER_TIMEOUT_SECONDS", "30"))
        search_breaker = CircuitBreaker(
            failure_threshold=failures,
            recovery_timeout=timeout,
            expected_exception=SearchAdapterError,
            name="cortex-search",
        )
    memory_breaker = overrides.get("memory_breaker")
    if memory_breaker is None:
        failures = int(os.getenv("CORTEX_MCP_MEMORY_BREAKER_FAILURES", "5"))
        timeout = float(os.getenv("CORTEX_MCP_MEMORY_BREAKER_TIMEOUT_SECONDS", "15"))
        memory_breaker = CircuitBreaker(
            failure_threshold=failures,
            recovery_timeout=timeout,
            expected_exception=MemoryAdapterError,
            name="local-memory",
        )
    return ResilienceBundle(search_breaker=search_breaker, memory_breaker=memory_breaker)


def _register_search_tool(
    server: FastMCP,
    adapters: AdapterBundle,
    resilience: ResilienceBundle,
    catalog: ToolCatalog,
) -> None:
    if adapters.search is None:
        return

    @server.tool("search", description="Search Cortex-OS knowledge base.")
    async def search_tool(query: str, max_results: int = 10) -> str:
        cleaned = validate_search_query(query)
        limit = max(1, min(int(max_results or 10), 25))
        async def _call_search() -> dict[str, Any]:
            return await adapters.search.search(query=cleaned, limit=limit)

        try:
            payload = await resilience.search_breaker.call(_call_search)
        except CircuitBreakerError as exc:
            logger.error("cortex search circuit open: %s", exc)
            return json.dumps({"error": "search_unavailable"})
        except SearchAdapterError as exc:
            logger.error("brAInwav search adapter failure: %s", exc)
            return json.dumps({"error": "search_failed"})
        sanitized = sanitize_output(payload)
        return json.dumps(sanitized)

    catalog.add(name="search", description="Search Cortex-OS knowledge base.")


def _register_fetch_tool(
    server: FastMCP,
    adapters: AdapterBundle,
    resilience: ResilienceBundle,
    catalog: ToolCatalog,
) -> None:
    if adapters.search is None:
        return

    @server.tool("fetch", description="Fetch Cortex document details by ID.")
    async def fetch_tool(resource_id: str) -> str:
        rid = validate_resource_id(resource_id)
        async def _call_fetch() -> dict[str, Any]:
            return await adapters.search.fetch(resource_id=rid)

        try:
            document = await resilience.search_breaker.call(_call_fetch)
        except CircuitBreakerError as exc:
            logger.error("cortex fetch circuit open: %s", exc)
            return json.dumps({"error": "fetch_unavailable"})
        except SearchAdapterError as exc:
            logger.error("brAInwav fetch adapter failure: %s", exc)
            return json.dumps({"error": "fetch_failed"})
        sanitized = sanitize_output(document)
        return json.dumps(sanitized)

    catalog.add(name="fetch", description="Fetch Cortex document details by ID.")


def _register_ping_tool(server: FastMCP, catalog: ToolCatalog) -> None:
    @server.tool("ping", description="Return basic server heartbeat info.")
    async def ping_tool(transport: str | None = None) -> str:
        payload = {
            "status": "ok",
            "transport": transport or "unknown",
            "branding": BRANDING,
        }
        return json.dumps(payload)

    catalog.add(name="ping", description="Return basic server heartbeat info.")


def _register_health_tool(
    server: FastMCP,
    adapters: AdapterBundle,
    resilience: ResilienceBundle,
    catalog: ToolCatalog,
) -> None:
    @server.tool("health_check", description="Detailed MCP health probe.")
    async def health_tool() -> str:
        payload = {
            "status": "ok",
            "branding": BRANDING,
            "adapters": {
                "search": adapters.search is not None,
                "memory": adapters.memory is not None,
            },
            "resilience": {
                "search_breaker": resilience.search_breaker.state.value,
                "memory_breaker": resilience.memory_breaker.state.value,
            },
        }
        return json.dumps(payload)

    catalog.add(name="health_check", description="Detailed MCP health probe.")


def _register_capabilities_tool(server: FastMCP, catalog: ToolCatalog) -> None:
    @server.tool(
        "list_capabilities",
        description="List registered MCP tools and metadata.",
    )
    async def list_capabilities() -> str:
        tools = sanitize_output(catalog.list())
        return json.dumps({"tools": tools})

    catalog.add(
        name="list_capabilities",
        description="List registered MCP tools and metadata.",
    )


def _package_version() -> str:
    try:
        return pkg_version("cortex-mcp")
    except Exception:
        return "1.0.0"


def _manifest_payload(catalog: ToolCatalog, version: str) -> dict[str, Any]:
    return {
        "version": version,
        "branding": BRANDING,
        "servers": [
            {
                "transport": DEFAULT_TRANSPORT,
                "endpoint": DEFAULT_PUBLIC_ENDPOINT,
                "priority": 1,
            }
        ],
        "tools": sanitize_output(catalog.manifest()),
    }


def _enforce_security(request: Request, bundle: AuthBundle, scope: str | None) -> None:
    if bundle.rate_limiter:
        bundle.rate_limiter.check(request)
    if bundle.authenticator and scope:
        bundle.authenticator.verify_request(request, required_scope=scope)


def _memory_tags(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    return [str(tag) for tag in raw if isinstance(tag, (str, int))]


def _memory_metadata(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return {str(k): v for k, v in raw.items()}
    return {}


def _register_health_routes(
    server: FastMCP,
    manifest: dict[str, Any],
    settings: MCPSettings,
    adapters: AdapterBundle,
    resilience: ResilienceBundle,
) -> None:
    @server.custom_route("/health", methods=["GET"], name="health")
    async def health_route(_request: Request) -> Response:
        payload = {
            "status": "ok",
            "branding": BRANDING,
            "adapters": {
                "search": adapters.search is not None,
                "memory": adapters.memory is not None,
            },
            "resilience": {
                "search_breaker": resilience.search_breaker.state.value,
                "memory_breaker": resilience.memory_breaker.state.value,
            },
        }
        return JSONResponse(payload)

    @server.custom_route("/health/details", methods=["GET"], name="health_details")
    async def health_details(_request: Request) -> Response:
        payload = {
            "status": "ok",
            "branding": BRANDING,
            "config": settings.dict_for_logging(),
            "resilience": {
                "search_breaker": resilience.search_breaker.state.value,
                "memory_breaker": resilience.memory_breaker.state.value,
            },
        }
        return JSONResponse(payload)

    @server.custom_route("/.well-known/mcp.json", methods=["GET"], name="mcp_manifest")
    async def manifest_route(_request: Request) -> Response:
        return JSONResponse(manifest)


def _register_memory_routes(
    server: FastMCP,
    adapters: AdapterBundle,
    auth_bundle: AuthBundle,
    resilience: ResilienceBundle,
) -> None:
    if adapters.memory is None:
        logger.warning("Memory adapter not configured; REST routes disabled")
        return

    memory = adapters.memory
    _register_memory_store_route(server, memory, auth_bundle, resilience)
    _register_memory_search_route(server, memory, auth_bundle, resilience)
    _register_memory_get_route(server, memory, auth_bundle, resilience)
    _register_memory_delete_route(server, memory, auth_bundle, resilience)


def _register_memory_store_route(
    server: FastMCP,
    memory: LocalMemoryAdapter,
    auth_bundle: AuthBundle,
    resilience: ResilienceBundle,
) -> None:
    @server.custom_route("/api/memories", methods=["POST"], name="memories_store")
    async def store_memory(request: Request) -> Response:
        _enforce_security(request, auth_bundle, "memories:write")
        try:
            payload = await request.json()
        except ValueError:
            return JSONResponse(
                {"error": "invalid JSON payload"},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        kind = str(payload.get("kind") or "note").strip() or "note"
        text = str(payload.get("text") or "").strip()
        tags = _memory_tags(payload.get("tags"))
        metadata = _memory_metadata(payload.get("metadata"))
        async def _store() -> dict[str, Any]:
            return await memory.store(
                kind=kind, text=text, tags=tags, metadata=metadata
            )

        try:
            record = await resilience.memory_breaker.call(_store)
        except CircuitBreakerError as exc:
            logger.error("local memory circuit open: %s", exc)
            return JSONResponse(
                {"error": "memory service unavailable"},
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except MemoryAdapterError as exc:  # pragma: no cover - exercised separately
            logger.error("brAInwav memory store failed: %s", exc)
            return JSONResponse(
                {"error": "memory store failed"},
                status_code=status.HTTP_502_BAD_GATEWAY,
            )
        sanitized = sanitize_output(record)
        return JSONResponse({"memory": sanitized})


def _register_memory_search_route(
    server: FastMCP,
    memory: LocalMemoryAdapter,
    auth_bundle: AuthBundle,
    resilience: ResilienceBundle,
) -> None:
    @server.custom_route("/api/memories", methods=["GET"], name="memories_search")
    async def search_memories(request: Request) -> Response:
        _enforce_security(request, auth_bundle, "memories:read")
        params = request.query_params
        query = params.get("query") or params.get("q") or ""
        try:
            limit = int(params.get("limit", "10"))
        except ValueError:
            limit = 10
        limit = max(1, min(limit, 50))
        kind = params.get("kind")
        tags = params.get("tags")
        tag_list = tags.split(",") if tags else None
        async def _search() -> dict[str, Any]:
            return await memory.search(
                query=query,
                limit=limit,
                kind=kind,
                tags=tag_list,
            )

        try:
            result = await resilience.memory_breaker.call(_search)
        except CircuitBreakerError as exc:
            logger.error("local memory search circuit open: %s", exc)
            return JSONResponse(
                {"error": "memory service unavailable"},
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        sanitized = sanitize_output(result)
        return JSONResponse(sanitized)


def _register_memory_get_route(
    server: FastMCP,
    memory: LocalMemoryAdapter,
    auth_bundle: AuthBundle,
    resilience: ResilienceBundle,
) -> None:
    @server.custom_route(
        "/api/memories/{memory_id}", methods=["GET"], name="memories_get"
    )
    async def get_memory(request: Request) -> Response:
        _enforce_security(request, auth_bundle, "memories:read")
        memory_id = request.path_params["memory_id"]
        async def _get() -> dict[str, Any] | None:
            return await memory.get(memory_id)

        try:
            record = await resilience.memory_breaker.call(_get)
        except CircuitBreakerError as exc:
            logger.error("local memory get circuit open: %s", exc)
            return JSONResponse(
                {"error": "memory service unavailable"},
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if record is None:
            return JSONResponse(
                {"error": "memory not found"}, status_code=status.HTTP_404_NOT_FOUND
            )
        sanitized = sanitize_output(record)
        return JSONResponse({"memory": sanitized})


def _register_memory_delete_route(
    server: FastMCP,
    memory: LocalMemoryAdapter,
    auth_bundle: AuthBundle,
    resilience: ResilienceBundle,
) -> None:
    @server.custom_route(
        "/api/memories/{memory_id}", methods=["DELETE"], name="memories_delete"
    )
    async def delete_memory(request: Request) -> Response:
        _enforce_security(request, auth_bundle, "memories:delete")
        memory_id = request.path_params["memory_id"]
        async def _delete() -> bool:
            return await memory.delete(memory_id)

        try:
            deleted = await resilience.memory_breaker.call(_delete)
        except CircuitBreakerError as exc:
            logger.error("local memory delete circuit open: %s", exc)
            return JSONResponse(
                {"error": "memory service unavailable"},
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        status_code = status.HTTP_200_OK if deleted else status.HTTP_404_NOT_FOUND
        body = {"deleted": deleted}
        if not deleted:
            body["error"] = "memory not found"
        return JSONResponse(body, status_code=status_code)


def create_server(
    *,
    adapters: dict[str, Any] | None = None,
    auth_overrides: dict[str, Any] | None = None,
    resilience_overrides: dict[str, Any] | None = None,
    settings: MCPSettings | None = None,
) -> FastMCP:
    cfg = settings or MCPSettings()
    adapter_bundle = _resolve_adapters(cfg, adapters)
    auth_bundle = _resolve_auth_bundle(auth_overrides)
    resilience_bundle = _resolve_resilience(resilience_overrides)

    version = _package_version()
    server = FastMCP(
        name="Cortex-OS MCP Server",
        version=version,
    )

    catalog = ToolCatalog(entries=[])
    _register_search_tool(server, adapter_bundle, resilience_bundle, catalog)
    _register_fetch_tool(server, adapter_bundle, resilience_bundle, catalog)
    _register_ping_tool(server, catalog)
    _register_health_tool(server, adapter_bundle, resilience_bundle, catalog)
    _register_capabilities_tool(server, catalog)

    manifest = _manifest_payload(catalog, version)
    _register_health_routes(server, manifest, cfg, adapter_bundle, resilience_bundle)
    _register_memory_routes(server, adapter_bundle, auth_bundle, resilience_bundle)

    logger.info(
        "brAInwav Cortex MCP server configured",
        extra={
            "branding": BRANDING,
            "config": cfg.dict_for_logging(),
        },
    )

    return server


def build_application(server: FastMCP) -> Any:
    # Expose the FastMCP streamable HTTP transport under /mcp so connectors can
    # establish a session and upgrade to SSE using the discovery manifest endpoint.
    app = server.http_app(transport="streamable-http", path="/mcp")
    metrics_middleware = MetricsMiddleware()

    @app.middleware("http")
    async def _metrics(request: Request, call_next: Any) -> Any:
        return await metrics_middleware(request, call_next)

    return app


def main() -> None:
    port = int(os.getenv("PORT", "3024"))
    server = create_server()
    app = build_application(server)
    config = uvicorn.Config(app=app, host="0.0.0.0", port=port, log_level="info")
    uvicorn.Server(config).run()


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
    main()


# FastMCP CLI entrypoint
server = create_server()  # pragma: no cover - FastMCP CLI defaults
app = build_application(server)  # pragma: no cover - FastMCP CLI defaults
