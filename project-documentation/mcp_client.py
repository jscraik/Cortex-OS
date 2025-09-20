"""
MCP Client (vendor-neutral)

Lightweight async client for calling MCP tools over HTTP using JSON-RPC.
Designed for agents and services to access capabilities via MCP rather than
direct database/service imports.
"""

import json
import logging
import os
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class MCPClient:
    """Client for calling MCP tools via HTTP (JSON-RPC)."""

    def __init__(
        self,
        mcp_url: str | None = None,
        *,
        timeout: float = 30.0,
        retries: int = 2,
        backoff_seconds: float = 0.5,
    ) -> None:
        """
        Initialize MCP client.

        Args:
            mcp_url: Full MCP base URL, e.g. "http://localhost:8051". If not provided,
                     environment variables are used.
            timeout: Request timeout in seconds.
            retries: Retry attempts on transient errors.
            backoff_seconds: Initial backoff between retries.
        """
        self.mcp_url = mcp_url or self._resolve_base_url()
        self._timeout = timeout
        self._retries = max(0, retries)
        self._backoff = max(0.0, backoff_seconds)
        self.client = httpx.AsyncClient(timeout=self._timeout)
        logger.info(
            "[MCP] Client initialized",
            extra={"mcp_url": self.mcp_url, "timeout": timeout},
        )

    @staticmethod
    def _resolve_base_url() -> str:
        """Resolve MCP base URL from environment, with sensible defaults."""
        # Preferred explicit base URL
        url = os.getenv("MCP_BASE_URL") or os.getenv("CORTEX_MCP_BASE_URL")
        if url:
            return url.rstrip("/")

        # Compose from parts
        scheme = os.getenv("MCP_SCHEME", "http")
        host = os.getenv("MCP_HOST")
        port = os.getenv("MCP_PORT", "8051")

        if not host:
            # In container, prefer service DNS name; otherwise localhost
            host = "mcp-server" if os.getenv("DOCKER_CONTAINER") else "localhost"

        return f"{scheme}://{host}:{port}"

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()

    async def call_tool(self, tool_name: str, **kwargs) -> dict[str, Any]:
        """
        Call an MCP tool via HTTP.

        Args:
            tool_name: Name of the MCP tool to call
            **kwargs: Tool arguments

        Returns:
            Dict with the tool response
        """
        request_data = {
            "jsonrpc": "2.0",
            "method": tool_name,
            "params": kwargs,
            "id": 1,
        }
        attempt = 0
        while True:
            try:
                response = await self.client.post(
                    f"{self.mcp_url}/rpc",
                    json=request_data,
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
                result = response.json()

                if "error" in result:
                    error = result["error"]
                    raise RuntimeError(
                        f"MCP tool error for {tool_name}: {error.get('message', 'Unknown error')}"
                    )

                return result.get("result", {})

            except (
                httpx.ReadTimeout,
                httpx.ConnectTimeout,
                httpx.ConnectError,
                httpx.RemoteProtocolError,
            ) as e:
                if attempt < self._retries:
                    sleep_for = self._backoff * (2**attempt)
                    logger.warning(
                        "[MCP] transient error; retrying",
                        extra={
                            "tool": tool_name,
                            "attempt": attempt + 1,
                            "sleep": sleep_for,
                            "error": str(e),
                        },
                    )
                    time.sleep(sleep_for)
                    attempt += 1
                    continue
                logger.error(
                    "[MCP] HTTP error calling tool",
                    extra={"tool": tool_name, "error": str(e)},
                )
                raise RuntimeError(f"Failed to call MCP tool {tool_name}: {e}")
            except httpx.HTTPStatusError as e:
                # Non-2xx status
                logger.error(
                    "[MCP] MCP server returned error status",
                    extra={"tool": tool_name, "status": e.response.status_code},
                )
                raise RuntimeError(
                    f"MCP server error {e.response.status_code} for tool {tool_name}"
                )
            except Exception as e:
                logger.error(
                    "[MCP] Unexpected error calling tool",
                    extra={"tool": tool_name, "error": str(e)},
                )
                raise

    # Convenience methods for common MCP tools

    async def perform_rag_query(
        self, query: str, source: str | None = None, match_count: int = 5
    ) -> str:
        """Perform a RAG query through MCP."""
        result = await self.call_tool(
            "perform_rag_query", query=query, source=source, match_count=match_count
        )
        return json.dumps(result) if isinstance(result, dict) else str(result)

    async def get_available_sources(self) -> str:
        """Get available sources through MCP."""
        result = await self.call_tool("get_available_sources")
        return json.dumps(result) if isinstance(result, dict) else str(result)

    async def search_code_examples(
        self, query: str, source_id: str | None = None, match_count: int = 5
    ) -> str:
        """Search code examples through MCP."""
        result = await self.call_tool(
            "search_code_examples",
            query=query,
            source_id=source_id,
            match_count=match_count,
        )
        return json.dumps(result) if isinstance(result, dict) else str(result)

    async def manage_project(self, action: str, **kwargs) -> str:
        """Manage projects through MCP."""
        result = await self.call_tool("manage_project", action=action, **kwargs)
        return json.dumps(result) if isinstance(result, dict) else str(result)

    async def manage_document(self, action: str, project_id: str, **kwargs) -> str:
        """Manage documents through MCP."""
        result = await self.call_tool(
            "manage_document", action=action, project_id=project_id, **kwargs
        )
        return json.dumps(result) if isinstance(result, dict) else str(result)

    async def manage_task(self, action: str, project_id: str, **kwargs) -> str:
        """Manage tasks through MCP."""
        result = await self.call_tool(
            "manage_task", action=action, project_id=project_id, **kwargs
        )
        return json.dumps(result) if isinstance(result, dict) else str(result)


# Global MCP client instance (created on first use)
_mcp_client: MCPClient | None = None


async def get_mcp_client() -> MCPClient:
    """
    Get or create the global MCP client instance.

    Returns:
        MCPClient instance
    """
    global _mcp_client

    if _mcp_client is None:
        _mcp_client = MCPClient()

    return _mcp_client
