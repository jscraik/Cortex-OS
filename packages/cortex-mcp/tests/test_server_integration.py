"""Integration tests for the refactored Cortex MCP server."""

from __future__ import annotations

import json
import os
import sys
import types
from dataclasses import dataclass, field
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from cortex_mcp.adapters.memory_adapter import MemoryAdapterError
from cortex_mcp.adapters.search_adapter import SearchAdapterError
from cortex_mcp.resilience.circuit_breaker import CircuitBreaker

if "jwt" not in sys.modules:
    jwt_stub = types.SimpleNamespace(
        InvalidTokenError=Exception,
        decode=lambda token, secret, algorithms=None, options=None: {
            "sub": "stub-user",
            "scopes": ["*"] if token else [],
        },
    )
    sys.modules["jwt"] = jwt_stub

if "prometheus_client" not in sys.modules:

    class _CounterStub:
        def __init__(self, *_: Any, **__: Any) -> None:
            pass

        def labels(self, **_: Any) -> _CounterStub:
            return self

        def inc(self, *_: Any, **__: Any) -> None:
            return None

    class _HistogramStub(_CounterStub):
        def observe(self, *_: Any, **__: Any) -> None:
            return None

    sys.modules["prometheus_client"] = types.SimpleNamespace(
        Counter=_CounterStub,
        Histogram=_HistogramStub,
    )

os.environ.setdefault("JWT_SECRET_KEY", "stub-secret")
os.environ.setdefault("JWT_ALGORITHM", "HS256")

from cortex_mcp.cortex_fastmcp_server_v2 import create_server


@dataclass
class StubSearchAdapter:
    calls: list[dict[str, Any]] = field(default_factory=list)

    async def search(self, query: str, *, limit: int) -> dict[str, Any]:
        cleaned = query.strip()
        self.calls.append({"query": cleaned, "limit": limit})
        return {
            "query": cleaned,
            "results": [
                {
                    "id": "doc-1",
                    "title": "Vector DB Deep Dive",
                    "snippet": "<script>alert('xss')</script>Vector databases explained",
                    "score": 0.91,
                    "url": "https://cortex-os.ai/docs/vector-db",
                    "source": "cortex-docs",
                }
            ],
            "total_found": 1,
        }


@dataclass
class FailingSearchAdapter(StubSearchAdapter):
    async def search(self, query: str, *, limit: int) -> dict[str, Any]:
        raise SearchAdapterError("boom")


@dataclass
class StubMemoryAdapter:
    store_calls: list[dict[str, Any]] = field(default_factory=list)
    items: dict[str, dict[str, Any]] = field(default_factory=dict)

    async def store(
        self,
        *,
        kind: str,
        text: str,
        tags: list[str] | None,
        metadata: dict[str, Any] | None,
    ) -> dict[str, Any]:
        mem_id = f"mem-{len(self.items) + 1}"
        record = {
            "id": mem_id,
            "kind": kind,
            "text": text,
            "tags": tags or [],
            "metadata": metadata or {},
        }
        self.items[mem_id] = record
        self.store_calls.append(record)
        return record

    async def search(
        self,
        *,
        query: str,
        limit: int,
        kind: str | None,
        tags: list[str] | None,
    ) -> dict[str, Any]:
        results: list[dict[str, Any]] = []
        for record in self.items.values():
            if query and query.lower() not in record["text"].lower():
                continue
            results.append(
                {
                    "id": record["id"],
                    "kind": record["kind"],
                    "text": record["text"],
                    "tags": record["tags"],
                    "score": 0.88,
                }
            )
        return {"query": query, "results": results[:limit], "total_found": len(results)}

    async def get(self, memory_id: str) -> dict[str, Any] | None:
        return self.items.get(memory_id)

    async def delete(self, memory_id: str) -> bool:
        return self.items.pop(memory_id, None) is not None


@dataclass
class ErrorMemoryAdapter(StubMemoryAdapter):
    async def store(
        self,
        *,
        kind: str,
        text: str,
        tags: list[str] | None,
        metadata: dict[str, Any] | None,
    ) -> dict[str, Any]:
        raise MemoryAdapterError("store failed")


@dataclass
class StubTokenData:
    user_id: str
    scopes: list[str]


@dataclass
class StubAuthenticator:
    required_scopes: list[str | None] = field(default_factory=list)

    def verify_request(
        self, request: Any, required_scope: str | None = None
    ) -> StubTokenData:
        self.required_scopes.append(required_scope)
        request.state.user_id = "user-123"  # type: ignore[attr-defined]
        request.state.scopes = ["*"]  # type: ignore[attr-defined]
        return StubTokenData(user_id="user-123", scopes=["*"])


@dataclass
class StubRateLimiter:
    hits: int = 0

    def check(self, _request: Any) -> None:
        self.hits += 1


@pytest.mark.asyncio
async def test_search_tool_uses_adapter_and_sanitizes_output() -> None:
    search_adapter = StubSearchAdapter()
    memory_adapter = StubMemoryAdapter()
    server = create_server(
        adapters={
            "search": search_adapter,
            "memory": memory_adapter,
        },
        auth_overrides={
            "authenticator": StubAuthenticator(),
            "rate_limiter": StubRateLimiter(),
        },
    )

    tools = await server.get_tools()
    search_tool = tools["search"]
    result = await search_tool.run({"query": "  vector database  ", "max_results": 5})
    payload = json.loads(result.content[0].text)

    assert payload["query"] == "vector database"
    assert payload["total_found"] == 1
    snippet = payload["results"][0]["snippet"]
    assert "<" not in snippet
    assert search_adapter.calls[0]["limit"] == 5

    health_tool = tools["health_check"]
    health_payload = json.loads((await health_tool.run({})).content[0].text)
    assert health_payload["resilience"]["search_breaker"] == "closed"


@pytest.mark.asyncio
async def test_memory_routes_delegate_to_adapter_and_enforce_auth() -> None:
    search_adapter = StubSearchAdapter()
    memory_adapter = StubMemoryAdapter()
    authenticator = StubAuthenticator()
    limiter = StubRateLimiter()

    server = create_server(
        adapters={
            "search": search_adapter,
            "memory": memory_adapter,
        },
        auth_overrides={
            "authenticator": authenticator,
            "rate_limiter": limiter,
        },
    )

    app = server.http_app(transport="http")

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/memories",
            json={
                "kind": "note",
                "text": "<b>Hello</b> Cortex",
                "tags": ["alpha", 2],
                "metadata": {"origin": "integration"},
            },
            headers={"Authorization": "Bearer test"},
        )
        assert response.status_code == 200
        stored = response.json()["memory"]
        assert "<" not in stored["text"]
        mem_id = stored["id"]

        search_resp = await client.get(
            "/api/memories",
            params={"query": "cortex", "limit": 5, "tags": "alpha,beta", "kind": "note"},
            headers={"Authorization": "Bearer test"},
        )
        assert search_resp.status_code == 200
        search_payload = search_resp.json()
        assert search_payload["results"]

        invalid_limit_resp = await client.get(
            "/api/memories",
            params={"query": "cortex", "limit": "not-a-number"},
            headers={"Authorization": "Bearer test"},
        )
        assert invalid_limit_resp.status_code == 200

        get_resp = await client.get(
            f"/api/memories/{mem_id}", headers={"Authorization": "Bearer test"}
        )
        assert get_resp.json()["memory"]["id"] == mem_id

        delete_resp = await client.delete(
            f"/api/memories/{mem_id}", headers={"Authorization": "Bearer test"}
        )
        assert delete_resp.json()["deleted"] is True

    assert authenticator.required_scopes == [
        "memories:write",
        "memories:read",
        "memories:read",
        "memories:read",
        "memories:delete",
    ]
    assert limiter.hits >= 4


@pytest.mark.asyncio
async def test_memory_routes_surface_adapter_errors() -> None:
    search_adapter = StubSearchAdapter()
    memory_adapter = ErrorMemoryAdapter()
    authenticator = StubAuthenticator()
    limiter = StubRateLimiter()

    server = create_server(
        adapters={"search": search_adapter, "memory": memory_adapter},
        auth_overrides={"authenticator": authenticator, "rate_limiter": limiter},
    )
    app = server.http_app(transport="http")

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/memories",
            json={"kind": "note", "text": "fail"},
            headers={"Authorization": "Bearer test"},
        )
        assert response.status_code == 502
        body = response.json()
        assert body["error"]


@pytest.mark.asyncio
async def test_search_circuit_breaker_trips() -> None:
    search_adapter = FailingSearchAdapter()
    memory_adapter = StubMemoryAdapter()
    authenticator = StubAuthenticator()
    limiter = StubRateLimiter()
    breaker = CircuitBreaker(
        failure_threshold=1,
        recovery_timeout=60.0,
        expected_exception=SearchAdapterError,
        name="test-search",
    )

    server = create_server(
        adapters={"search": search_adapter, "memory": memory_adapter},
        auth_overrides={"authenticator": authenticator, "rate_limiter": limiter},
        resilience_overrides={"search_breaker": breaker},
    )

    tools = await server.get_tools()
    search_tool = tools["search"]

    first = json.loads((await search_tool.run({"query": "fail"})).content[0].text)
    second = json.loads((await search_tool.run({"query": "fail"})).content[0].text)

    assert first["error"] == "search_failed"
    assert second["error"] == "search_unavailable"


@pytest.mark.asyncio
async def test_health_routes_include_resilience() -> None:
    server = create_server(
        adapters={"search": StubSearchAdapter(), "memory": StubMemoryAdapter()},
        auth_overrides={
            "authenticator": StubAuthenticator(),
            "rate_limiter": StubRateLimiter(),
        },
    )
    app = server.http_app(transport="http")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
        payload = response.json()
        assert payload["resilience"]["memory_breaker"] == "closed"


@pytest.mark.asyncio
async def test_memory_circuit_breaker_returns_service_unavailable() -> None:
    search_adapter = StubSearchAdapter()
    memory_adapter = ErrorMemoryAdapter()
    authenticator = StubAuthenticator()
    limiter = StubRateLimiter()
    breaker = CircuitBreaker(
        failure_threshold=1,
        recovery_timeout=60.0,
        expected_exception=MemoryAdapterError,
        name="test-memory",
    )

    server = create_server(
        adapters={"search": search_adapter, "memory": memory_adapter},
        auth_overrides={"authenticator": authenticator, "rate_limiter": limiter},
        resilience_overrides={"memory_breaker": breaker},
    )
    app = server.http_app(transport="http")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        first = await client.post(
            "/api/memories",
            json={"kind": "note", "text": "fail"},
            headers={"Authorization": "Bearer test"},
        )
        assert first.status_code == 502

        second = await client.post(
            "/api/memories",
            json={"kind": "note", "text": "fail"},
            headers={"Authorization": "Bearer test"},
        )
        assert second.status_code == 503
        assert second.json()["error"] == "memory service unavailable"
