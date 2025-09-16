"""Testing utilities for Model Context Protocol integrations.

This module provides a lightweight mock MCP server and client pair that can be
used to unit test higher level integrations without starting a real MCP
process.  The helpers intentionally mirror the high level behaviour of an MCP
server: tools can be registered, requests are recorded for later assertions and
responses are normalised into the canonical tool response shape.
"""
from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable, Mapping
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, cast

__all__ = [
    "MockMCPError",
    "ToolCall",
    "MockMCPServer",
    "MCPTestClient",
    "MCPTestFixture",
    "create_mock_server",
    "create_test_client",
    "create_fixture",
    "assert_tool_called",
    "assert_response_contains",
    "text_content",
    "structured_content",
]

ToolArguments = Dict[str, Any]
ToolResponse = Mapping[str, Any] | List[Any] | str | None
ToolHandler = Callable[[ToolArguments], ToolResponse | Awaitable[ToolResponse]]


class MockMCPError(Exception):
    """Raised when a mock MCP interaction fails."""


@dataclass(slots=True)
class ToolCall:
    """Record describing an invocation against the mock server."""

    name: str
    arguments: ToolArguments
    timestamp: datetime

    def clone(self) -> "ToolCall":
        """Return a deep copy so that tests can mutate arguments safely."""

        return ToolCall(
            name=self.name,
            arguments=deepcopy(self.arguments),
            timestamp=self.timestamp,
        )


class MockMCPServer:
    """In-memory mock MCP server used for unit tests."""

    def __init__(self, *, name: str = "mock-mcp-server") -> None:
        self.name = name
        self._tools: dict[str, ToolHandler] = {}
        self._calls: list[ToolCall] = []
        self._lock = asyncio.Lock()
        self._closed = False
        self._ping_count = 0

    def register_tool(self, name: str, handler: ToolHandler) -> None:
        """Register a handler for a tool."""

        if not name:
            msg = "Tool name cannot be empty"
            raise ValueError(msg)
        self._tools[name] = handler

    async def call_tool(
        self,
        name: str,
        arguments: Optional[ToolArguments] = None,
    ) -> dict[str, Any]:
        """Invoke a registered tool and return the normalised response."""

        payload = deepcopy(arguments or {})
        async with self._lock:
            if self._closed:
                msg = "Mock MCP server is closed"
                raise MockMCPError(msg)

            handler = self._tools.get(name)
            if handler is None:
                msg = f"Tool '{name}' is not registered"
                raise MockMCPError(msg)

            self._calls.append(
                ToolCall(
                    name=name,
                    arguments=deepcopy(payload),
                    timestamp=datetime.now(timezone.utc),
                )
            )

        return await self._invoke_handler(name, handler, payload)

    async def ping(self) -> None:
        """Record a ping request against the server."""

        async with self._lock:
            if self._closed:
                msg = "Mock MCP server is closed"
                raise MockMCPError(msg)
            self._ping_count += 1

    async def close(self) -> None:
        """Mark the server as closed to prevent further calls."""

        async with self._lock:
            self._closed = True

    async def reset(self) -> None:
        """Clear recorded state so the server can be reused."""

        async with self._lock:
            self._calls.clear()
            self._ping_count = 0
            self._closed = False

    @property
    def ping_count(self) -> int:
        return self._ping_count

    @property
    def is_closed(self) -> bool:
        return self._closed

    async def calls(self) -> list[ToolCall]:
        """Return all recorded calls."""

        async with self._lock:
            return [call.clone() for call in self._calls]

    async def find_calls(
        self,
        tool_name: str,
        *,
        predicate: Callable[[ToolCall], bool] | None = None,
    ) -> list[ToolCall]:
        """Return matching call records for a tool."""

        async with self._lock:
            results: list[ToolCall] = []
            for call in self._calls:
                if call.name != tool_name:
                    continue
                if predicate is not None and not predicate(call):
                    continue
                results.append(call.clone())
            return results

    @staticmethod
    async def _invoke_handler(
        tool_name: str, handler: ToolHandler, payload: ToolArguments
    ) -> dict[str, Any]:
        try:
            result: ToolResponse | Awaitable[ToolResponse] = handler(payload)
            if asyncio.iscoroutine(result):
                result = await result
            # After awaiting, result is definitely ToolResponse
            final_result = cast(ToolResponse, result)
        except Exception as exc:  # pragma: no cover - defensive path
            msg = f"Tool '{tool_name}' raised an exception: {exc}"
            raise MockMCPError(msg) from exc
        return _normalize_result(final_result)


class MCPTestClient:
    """Thin wrapper that mirrors the public MCP client surface for tests."""

    def __init__(self, server: MockMCPServer) -> None:
        self._server = server
        self._closed = False

    async def call_tool(
        self,
        name: str,
        arguments: Optional[ToolArguments] = None,
    ) -> dict[str, Any]:
        if self._closed:
            msg = "Test client is closed"
            raise MockMCPError(msg)
        return await self._server.call_tool(name, arguments)

    async def ping(self) -> None:
        if self._closed:
            msg = "Test client is closed"
            raise MockMCPError(msg)
        await self._server.ping()

    async def close(self) -> None:
        self._closed = True


class MCPTestFixture:
    """Convenience wrapper bundling a server and test client."""

    def __init__(self, server: MockMCPServer, client: MCPTestClient) -> None:
        self.server = server
        self.client = client

    async def aclose(self) -> None:
        await self.client.close()
        await self.server.close()


def create_mock_server(*, name: str = "mock-mcp-server") -> MockMCPServer:
    """Create a new mock MCP server instance."""

    return MockMCPServer(name=name)


def create_test_client(server: MockMCPServer) -> MCPTestClient:
    """Create a test client bound to the given mock server."""

    return MCPTestClient(server)


def create_fixture(*, name: str = "mock-mcp-server") -> MCPTestFixture:
    """Create a server/client fixture pair."""

    server = create_mock_server(name=name)
    client = create_test_client(server)
    return MCPTestFixture(server, client)


async def assert_tool_called(
    server: MockMCPServer,
    tool_name: str,
    *,
    times: int | None = None,
    where: Callable[[ToolCall], bool] | None = None,
) -> list[ToolCall]:
    """Assert that a tool was invoked and optionally validate the calls."""

    matches = await server.find_calls(tool_name, predicate=where)
    if not matches:
        msg = f"Expected tool '{tool_name}' to be called but no invocations were recorded"
        raise AssertionError(msg)
    if times is not None and len(matches) != times:
        msg = (
            f"Expected tool '{tool_name}' to be called {times} time(s) but received {len(matches)}"
        )
        raise AssertionError(msg)
    return matches


def assert_response_contains(
    response: Mapping[str, Any],
    *,
    text: str | None = None,
    structured: Mapping[str, Any] | None = None,
) -> None:
    """Validate that an MCP tool response contains expected data."""

    if text is not None:
        content = response.get("content", [])
        if not isinstance(content, list):
            msg = "Response content must be a list"
            raise AssertionError(msg)
        joined = " ".join(
            str(block.get("text", ""))
            for block in content
            if isinstance(block, Mapping) and block.get("type") == "text"
        ).strip()
        if text not in joined:
            msg = f"Expected response text to contain '{text}' but received '{joined}'"
            raise AssertionError(msg)

    if structured is not None:
        structured_content = response.get("structuredContent")
        if not isinstance(structured_content, Mapping):
            msg = "Response does not contain structured content"
            raise AssertionError(msg)
        for key, expected in structured.items():
            actual = structured_content.get(key)
            if actual != expected:
                msg = f"Structured field '{key}' expected {expected!r} but received {actual!r}"
                raise AssertionError(msg)


def text_content(text: str) -> dict[str, Any]:
    """Create a simple text content block."""

    return {
        "content": [
            {
                "type": "text",
                "text": text,
            }
        ]
    }


def structured_content(data: Mapping[str, Any]) -> dict[str, Any]:
    """Create a response with structured content only."""

    return {"structuredContent": dict(data)}


def _normalize_result(result: ToolResponse) -> dict[str, Any]:
    if result is None:
        return {"content": []}
    if isinstance(result, Mapping):
        return {key: value for key, value in result.items()}
    if isinstance(result, list):
        return {"content": list(result)}
    return text_content(str(result))
