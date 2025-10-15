"""FastMCP server bootstrap for the Cortex MCP OAuth bridge."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any, Callable, Iterable, Mapping, MutableMapping

from fastmcp import FastMCP
from fastmcp.server import dependencies as server_dependencies
from fastmcp.server.http import StarletteWithLifespan
from fastapi import HTTPException, Request, status
from starlette.middleware import Middleware
from starlette.responses import JSONResponse, Response

from cortex_mcp.adapters.memory_adapter import (
    LocalMemoryAdapter,
    MemoryAdapterError,
)
from cortex_mcp.adapters.search_adapter import CortexSearchAdapter, SearchAdapterError
from cortex_mcp.auth.context import IdentityContext
from cortex_mcp.auth.jwt_auth import JWTAuthenticator
from cortex_mcp.auth.oauth import (
    OAuthBridgeConfig,
    OAuthTokenVerifier,
    build_protected_resource_metadata,
    create_prm_response,
)
from cortex_mcp.config import MCPSettings
from cortex_mcp.health.checks import HealthCheckRegistry, OAuthHealthCheck, SystemHealthCheck
from cortex_mcp.middleware.auth import BRANDING, AuthMiddleware, enforce_scopes
from cortex_mcp.middleware.rate_limiter import RateLimiter
from cortex_mcp.resilience.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerError,
    CircuitState,
)
from cortex_mcp.security.input_validation import sanitize_output

logger = logging.getLogger(__name__)

DEFAULT_TRANSPORT = "streamable-http"
MANIFEST_ENDPOINT = "https://cortex-mcp.brainwav.io/mcp"
DEFAULT_OPTIONAL_PATHS = {
    "/health",
    "/health/auth",
    "/.well-known/mcp.json",
    "/.well-known/oauth-protected-resource",
}


class _Adapters:
    def __init__(self, *, search: Any, memory: Any) -> None:
        self.search = search
        self.memory = memory


def _default_search_adapter(settings: MCPSettings) -> CortexSearchAdapter:
    return CortexSearchAdapter(
        search_url=str(settings.cortex_search_url or ""),
        document_url=str(settings.cortex_document_base_url or ""),
        api_key=settings.cortex_search_api_key,
        timeout_seconds=settings.http_timeout_seconds,
        retries=settings.http_retries,
    )


def _default_memory_adapter(settings: MCPSettings) -> LocalMemoryAdapter:
    return LocalMemoryAdapter(
        base_url=str(settings.local_memory_base_url),
        api_key=settings.local_memory_api_key,
        namespace=settings.local_memory_namespace,
        timeout_seconds=settings.http_timeout_seconds,
        retries=settings.http_retries,
    )


def _default_authenticator(
    *,
    oauth_verifier: OAuthTokenVerifier | None,
) -> JWTAuthenticator | None:
    secret = os.getenv("JWT_SECRET_KEY")
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    if not secret and not oauth_verifier:
        return None
    return JWTAuthenticator(secret_key=secret, algorithm=algorithm, oauth_verifier=oauth_verifier)


def _default_rate_limiter() -> RateLimiter:
    rpm = int(os.getenv("MCP_HTTP_RPM", "120"))
    burst = int(os.getenv("MCP_HTTP_BURST", "30"))
    return RateLimiter(rpm=rpm, burst=burst)


def _build_health_registry(
    *,
    oauth_config: OAuthBridgeConfig | None,
    oauth_verifier: OAuthTokenVerifier | None,
) -> HealthCheckRegistry:
    registry = HealthCheckRegistry()
    registry.register(SystemHealthCheck())
    if oauth_config and oauth_verifier:
        async def _probe_jwks() -> dict[str, Any]:
            return await asyncio.to_thread(oauth_verifier._jwks_fetcher, oauth_config.jwks_uri)  # type: ignore[attr-defined]

        registry.register(
            OAuthHealthCheck(
                enabled=oauth_config.enabled,
                metadata_builder=lambda: build_protected_resource_metadata(oauth_config),
                jwks_probe=_probe_jwks,
            )
        )
    else:
        registry.register(
            OAuthHealthCheck(
                enabled=False,
                metadata_builder=None,
                jwks_probe=None,
            )
        )
    return registry


def _manifest_payload(
    *,
    transport: str,
    oauth_config: OAuthBridgeConfig | None,
) -> dict[str, Any]:
    manifest: dict[str, Any] = {
        "branding": BRANDING,
        "servers": [
            {
                "name": "cortex-mcp",
                "endpoint": MANIFEST_ENDPOINT,
                "transport": transport,
                "auth": "oauth" if oauth_config else "bearer",
            }
        ],
        "tools": [
            {
                "name": "memory.store",
                "transport": transport,
                "auth": "oauth" if oauth_config else "bearer",
                "scopes": ["memories:write"],
            },
            {
                "name": "search",
                "transport": transport,
                "auth": "oauth" if oauth_config else "bearer",
                "scopes": ["knowledge:read"],
            },
        ],
    }
    if oauth_config:
        manifest["oauth"] = build_protected_resource_metadata(oauth_config)
    return manifest


def _sanitize_tags(raw: Iterable[Any]) -> list[str]:
    tags: list[str] = []
    for item in raw:
        if not isinstance(item, str):
            continue
        tags.append(item)
    return tags


def _sanitize_metadata(raw: Any) -> dict[str, Any]:
    if isinstance(raw, Mapping):
        return {str(key): value for key, value in raw.items()}
    return {}


def _memory_response(payload: dict[str, Any], status_code: int = 200) -> JSONResponse:
    return JSONResponse({"memory": sanitize_output(payload), "brand": BRANDING}, status_code=status_code)


def _error_response(status_code: int, message: str, code: str) -> JSONResponse:
    return JSONResponse(
        {"error": message, "code": code, "brand": BRANDING},
        status_code=status_code,
    )


def create_server(
    *,
    settings: MCPSettings | None = None,
    adapters: MutableMapping[str, Any] | None = None,
    auth_overrides: MutableMapping[str, Any] | None = None,
    resilience_overrides: MutableMapping[str, Any] | None = None,
) -> FastMCP:
    """Create and configure the FastMCP server."""

    settings = settings or MCPSettings()
    adapters = adapters or {}
    auth_overrides = auth_overrides or {}
    resilience_overrides = resilience_overrides or {}

    oauth_config = OAuthBridgeConfig.from_settings(settings)
    oauth_verifier = None
    if oauth_config:
        try:
            oauth_verifier = OAuthTokenVerifier(oauth_config)
        except ValueError as exc:
            logger.warning("OAuth bridge disabled due to configuration error: %s", exc)
            oauth_config = None

    search_adapter = adapters.get("search") or _default_search_adapter(settings)
    memory_adapter = adapters.get("memory") or _default_memory_adapter(settings)

    search_breaker = resilience_overrides.get("search_breaker") or CircuitBreaker(
        failure_threshold=3,
        recovery_timeout=30.0,
        expected_exception=SearchAdapterError,
        name="search",
    )
    memory_breaker = resilience_overrides.get("memory_breaker") or CircuitBreaker(
        failure_threshold=3,
        recovery_timeout=30.0,
        expected_exception=MemoryAdapterError,
        name="memory",
    )

    authenticator = _default_authenticator(oauth_verifier=oauth_verifier)
    rate_limiter = auth_overrides.get("rate_limiter") or _default_rate_limiter()
    effective_authenticator = auth_overrides.get("authenticator") or authenticator

    instructions = (
        "brAInwav Cortex MCP exposes memory and knowledge tools over the Model Context Protocol.\n"
        "All production requests must include authenticated context and brAInwav-branding compliant logs."
    )
    middleware = [
        Middleware(
            AuthMiddleware,
            authenticator=effective_authenticator,
            oauth_verifier=oauth_verifier,
            rate_limiter=rate_limiter,
            optional_paths=DEFAULT_OPTIONAL_PATHS,
        )
    ]
    server = FastMCP(
        name="cortex-mcp",
        version="2.0.0",
        instructions=instructions,
        middleware=middleware,
    )

    async def _enforce_tool_scopes(scopes: list[str]) -> IdentityContext | None:
        try:
            request = server_dependencies.get_http_request()
        except RuntimeError:
            return None
        try:
            return enforce_scopes(request, scopes, effective_authenticator)
        except HTTPException as exc:
            raise PermissionError(exc.detail) from exc

    @server.tool(name="search", description="Search Cortex knowledge sources.")
    async def search_tool(
        query: str,
        max_results: int = 10,
    ) -> dict[str, Any]:
        normalized_query = (query or "").strip()
        if not normalized_query:
            return {"query": "", "results": [], "total_found": 0}

        try:
            await _enforce_tool_scopes(["knowledge:read"])
        except PermissionError as exc:
            return {"error": "insufficient_scope", "message": str(exc)}

        async def _call() -> dict[str, Any]:
            return await search_adapter.search(normalized_query, limit=max(1, int(max_results or 10)))

        try:
            prior_state = search_breaker.state
            result = await search_breaker.call(_call)
            return sanitize_output(result)
        except SearchAdapterError as exc:
            logger.warning("Search adapter failure: %s", exc)
            if prior_state == CircuitState.CLOSED:
                return {"error": "search_failed"}
            if search_breaker.state == CircuitState.OPEN:
                return {"error": "search_unavailable"}
            return {"error": "search_failed"}
        except CircuitBreakerError:
            return {"error": "search_unavailable"}

    @server.tool(name="health_check", description="Report MCP service health.")
    async def health_check_tool() -> dict[str, Any]:
        resilience = {
            "search_breaker": search_breaker.state.value,
            "memory_breaker": memory_breaker.state.value,
        }
        return {"status": "ok", "resilience": resilience, "brand": BRANDING}

    health_registry = _build_health_registry(
        oauth_config=oauth_config,
        oauth_verifier=oauth_verifier,
    )

    @server.custom_route("/health", methods=["GET"])
    async def health_route(_request: Request) -> Response:
        report = await health_registry.run_all()
        report["resilience"] = {
            "search_breaker": search_breaker.state.value,
            "memory_breaker": memory_breaker.state.value,
        }
        return JSONResponse(report)

    @server.custom_route("/health/auth", methods=["GET"])
    async def auth_health_route(_request: Request) -> Response:
        report = await health_registry.run_all()
        oauth_report = report["checks"].get("oauth", {})
        return JSONResponse(oauth_report)

    @server.custom_route("/.well-known/mcp.json", methods=["GET"])
    async def manifest_route(_request: Request) -> Response:
        payload = _manifest_payload(transport=DEFAULT_TRANSPORT, oauth_config=oauth_config)
        return JSONResponse(payload)

    if oauth_config:
        @server.custom_route("/.well-known/oauth-protected-resource", methods=["GET"])
        async def oauth_prm_route(_request: Request) -> Response:
            return create_prm_response(oauth_config)

    @server.custom_route("/api/memories", methods=["POST"])
    async def create_memory_route(request: Request) -> Response:
        enforce_scopes(request, ["memories:write"], effective_authenticator)
        if rate_limiter:
            rate_limiter.check(request)
        payload = await request.json()
        kind = str(payload.get("kind") or "note")
        text = str(payload.get("text") or "")
        tags = payload.get("tags") or []
        metadata = payload.get("metadata") or {}
        params = {
            "kind": kind,
            "text": text,
            "tags": _sanitize_tags(tags),
            "metadata": _sanitize_metadata(metadata),
        }

        async def _store() -> dict[str, Any]:
            return await memory_adapter.store(**params)

        try:
            prior_state = memory_breaker.state
            record = await memory_breaker.call(_store)
            return _memory_response(record)
        except MemoryAdapterError as exc:
            logger.error("Memory adapter failure: %s", exc)
            if prior_state == CircuitState.CLOSED:
                return _error_response(502, str(exc) or "memory store failed", "memory_store_failed")
            if memory_breaker.state == CircuitState.OPEN:
                return _error_response(503, "memory service unavailable", "memory_unavailable")
            return _error_response(502, str(exc) or "memory store failed", "memory_store_failed")
        except CircuitBreakerError:
            return _error_response(503, "memory service unavailable", "memory_unavailable")

    @server.custom_route("/api/memories", methods=["GET"])
    async def search_memory_route(request: Request) -> Response:
        enforce_scopes(request, ["memories:read"], effective_authenticator)
        if rate_limiter:
            rate_limiter.check(request)
        query = request.query_params.get("query", "").strip()
        try:
            limit = int(request.query_params.get("limit", "10"))
        except ValueError:
            limit = 10
        limit = max(1, min(limit, 100))
        kind = request.query_params.get("kind")
        raw_tags = request.query_params.get("tags", "")
        tags = [tag for tag in raw_tags.split(",") if tag] if raw_tags else []

        async def _search() -> dict[str, Any]:
            return await memory_adapter.search(
                query=query,
                limit=limit,
                kind=kind,
                tags=tags if tags else None,
            )

        try:
            prior_state = memory_breaker.state
            result = await memory_breaker.call(_search)
            sanitized = sanitize_output(result)
            payload = {"brand": BRANDING}
            if isinstance(sanitized, dict):
                payload.update(sanitized)
            else:
                payload.update({"results": sanitized, "total_found": len(sanitized)})
            return JSONResponse(payload)
        except MemoryAdapterError as exc:
            logger.error("Memory search failure: %s", exc)
            if prior_state == CircuitState.CLOSED:
                return _error_response(502, str(exc) or "memory search failed", "memory_search_failed")
            if memory_breaker.state == CircuitState.OPEN:
                return _error_response(503, "memory service unavailable", "memory_unavailable")
            return _error_response(502, str(exc) or "memory search failed", "memory_search_failed")
        except CircuitBreakerError:
            return _error_response(503, "memory service unavailable", "memory_unavailable")

    @server.custom_route("/api/memories/{memory_id}", methods=["GET"])
    async def get_memory_route(request: Request) -> Response:
        memory_id = request.path_params["memory_id"]
        enforce_scopes(request, ["memories:read"], effective_authenticator)
        if rate_limiter:
            rate_limiter.check(request)

        async def _get() -> dict[str, Any] | None:
            return await memory_adapter.get(memory_id)

        try:
            prior_state = memory_breaker.state
            record = await memory_breaker.call(_get)
        except MemoryAdapterError as exc:
            logger.error("Memory get failure: %s", exc)
            if prior_state == CircuitState.CLOSED:
                return _error_response(502, str(exc) or "memory fetch failed", "memory_fetch_failed")
            return _error_response(503, "memory service unavailable", "memory_unavailable")
        except CircuitBreakerError:
            return _error_response(503, "memory service unavailable", "memory_unavailable")

        if not record:
            return _error_response(404, "Memory not found", "memory_not_found")
        return JSONResponse({"memory": sanitize_output(record), "brand": BRANDING})

    @server.custom_route("/api/memories/{memory_id}", methods=["DELETE"])
    async def delete_memory_route(request: Request) -> Response:
        memory_id = request.path_params["memory_id"]
        enforce_scopes(request, ["memories:delete"], effective_authenticator)
        if rate_limiter:
            rate_limiter.check(request)

        async def _delete() -> bool:
            return await memory_adapter.delete(memory_id)

        try:
            prior_state = memory_breaker.state
            deleted = await memory_breaker.call(_delete)
        except MemoryAdapterError as exc:
            logger.error("Memory delete failure: %s", exc)
            if prior_state == CircuitState.CLOSED:
                return _error_response(502, str(exc) or "memory delete failed", "memory_delete_failed")
            return _error_response(503, "memory service unavailable", "memory_unavailable")
        except CircuitBreakerError:
            return _error_response(503, "memory service unavailable", "memory_unavailable")

        return JSONResponse({"deleted": bool(deleted), "brand": BRANDING})

    return server


def get_http_app(server: FastMCP, *, transport: str = "http") -> StarletteWithLifespan:
    """Helper to expose the HTTP app with correct middleware."""
    return server.http_app(transport=transport)
