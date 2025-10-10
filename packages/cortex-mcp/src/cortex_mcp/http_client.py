"""brAInwav Cortex MCP HTTP Client - Routes to Node MCP Server

This module replaces the Python FastMCP server with an HTTP client that routes
all MCP requests to the consolidated Node.js MCP server, following brAInwav
consolidation standards with circuit breaker and retry logic.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass
from typing import Any

import httpx
from httpx import HTTPError, RequestError, TimeoutException

# brAInwav branding constants
BRANDING = {
    "provider": "brAInwav",
    "product": "Cortex MCP HTTP Client",
    "version": "1.0.0"
}

USER_AGENT = f"brAInwav-python-mcp-client/{BRANDING['version']}"
DEFAULT_NODE_MCP_URL = os.getenv("NODE_MCP_URL", "http://localhost:3024/mcp")
DEFAULT_TIMEOUT = int(os.getenv("MCP_CLIENT_TIMEOUT", "30"))
DEFAULT_MAX_RETRIES = int(os.getenv("MCP_CLIENT_MAX_RETRIES", "3"))
DEFAULT_RETRY_DELAY = float(os.getenv("MCP_CLIENT_RETRY_DELAY", "1.0"))

# Configure logging with brAInwav branding
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [brAInwav MCP Client] %(levelname)s: %(message)s"
)
logger = logging.getLogger("brainwav-mcp-client")


@dataclass
class CircuitBreakerState:
    """Circuit breaker state for Node MCP server calls."""
    failures: int = 0
    last_failure_time: float = 0
    state: str = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    failure_threshold: int = 5
    timeout_seconds: float = 30.0


class MCPHttpClient:
    """HTTP client for routing Python MCP requests to Node MCP server."""

    def __init__(
        self,
        base_url: str = DEFAULT_NODE_MCP_URL,
        timeout: int = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_MAX_RETRIES,
        retry_delay: float = DEFAULT_RETRY_DELAY,
    ):
        self.base_url = base_url
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.circuit_breaker = CircuitBreakerState()

        # HTTP client with brAInwav branding
        self.client = httpx.AsyncClient(
            timeout=timeout,
            headers={
                "User-Agent": USER_AGENT,
                "X-brAInwav-Source": "cortex-mcp-python",
                "Content-Type": "application/json",
            }
        )

        logger.info(f"brAInwav MCP HTTP client initialized for {base_url}")

    async def _check_circuit_breaker(self) -> None:
        """Check circuit breaker state before making requests."""
        if self.circuit_breaker.state == "OPEN":
            time_since_failure = time.time() - self.circuit_breaker.last_failure_time
            if time_since_failure < self.circuit_breaker.timeout_seconds:
                raise Exception("brAInwav circuit breaker open")
            else:
                self.circuit_breaker.state = "HALF_OPEN"
                logger.info("brAInwav circuit breaker transitioning to HALF_OPEN")

    async def _record_success(self) -> None:
        """Record successful request."""
        if self.circuit_breaker.state == "HALF_OPEN":
            self.circuit_breaker.state = "CLOSED"
            self.circuit_breaker.failures = 0
            logger.info("brAInwav circuit breaker closed after successful request")

    async def _record_failure(self) -> None:
        """Record failed request and update circuit breaker."""
        self.circuit_breaker.failures += 1
        self.circuit_breaker.last_failure_time = time.time()

        if self.circuit_breaker.failures >= self.circuit_breaker.failure_threshold:
            self.circuit_breaker.state = "OPEN"
            logger.warning(
                f"brAInwav circuit breaker opened after {self.circuit_breaker.failures} failures"
            )

    async def call(self, request: dict[str, Any]) -> dict[str, Any]:
        """Make MCP request to Node server with retry and circuit breaker."""
        await self._check_circuit_breaker()

        for attempt in range(self.max_retries + 1):
            try:
                response = await self.client.post(
                    self.base_url,
                    json=request
                )
                response.raise_for_status()

                await self._record_success()
                result = response.json()

                # Ensure brAInwav branding appears in structured responses
                if isinstance(result, dict) and isinstance(result.get("result"), dict):
                    result["result"]["branding"] = BRANDING

                return result

            except (HTTPError, RequestError, TimeoutException) as e:
                await self._record_failure()
                logger.warning(
                    f"brAInwav MCP HTTP client attempt {attempt + 1}/{self.max_retries + 1} failed: {e}"
                )

                if attempt < self.max_retries:
                    await asyncio.sleep(self.retry_delay * (2 ** attempt))  # Exponential backoff
                else:
                    # Final attempt failed - raise with brAInwav branding
                    raise Exception(
                        f"brAInwav MCP HTTP client: Connection failed after {self.max_retries + 1} attempts"
                    ) from e

        # This should never be reached due to the raise above, but added for type safety
        raise Exception("brAInwav MCP HTTP client: Unexpected code path")

    async def search(self, query: str, max_results: int = 10) -> dict[str, Any]:
        """Search via Node MCP server."""
        request = {
            "id": f"search-{int(time.time() * 1000)}",
            "method": "tools/call",
            "params": {
                "name": "search",
                "arguments": {
                    "query": query,
                    "max_results": max_results
                }
            }
        }
        return await self.call(request)

    async def memory_search(self, query: str, limit: int = 10) -> dict[str, Any]:
        """Memory search via Node MCP server."""
        request = {
            "id": f"memory-search-{int(time.time() * 1000)}",
            "method": "tools/call",
            "params": {
                "name": "memory.search",
                "arguments": {
                    "query": query,
                    "limit": limit
                }
            }
        }
        return await self.call(request)

    async def memory_store(self, content: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
        """Memory store via Node MCP server."""
        request = {
            "id": f"memory-store-{int(time.time() * 1000)}",
            "method": "tools/call",
            "params": {
                "name": "memory.store",
                "arguments": {
                    "content": content,
                    "metadata": metadata or {}
                }
            }
        }
        return await self.call(request)

    async def fetch_document(self, url: str) -> dict[str, Any]:
        """Fetch document via Node MCP server."""
        request = {
            "id": f"fetch-{int(time.time() * 1000)}",
            "method": "tools/call",
            "params": {
                "name": "fetch",
                "arguments": {
                    "url": url
                }
            }
        }
        return await self.call(request)

    async def health_check(self) -> dict[str, Any]:
        """Health check via Node MCP server."""
        request = {
            "id": f"health-{int(time.time() * 1000)}",
            "method": "ping"
        }
        return await self.call(request)

    async def close(self) -> None:
        """Close HTTP client."""
        await self.client.aclose()
        logger.info("brAInwav MCP HTTP client closed")


async def main() -> None:
    """Main entry point for brAInwav MCP HTTP client CLI."""
    import sys

    if len(sys.argv) < 2:
        print(f"brAInwav Cortex MCP HTTP Client v{BRANDING['version']}")
        print("Usage: cortex-mcp <command> [args...]")
        print("Commands:")
        print("  health                     - Check Node MCP server health")
        print("  search <query>            - Search knowledge base")
        print("  memory-search <query>     - Search memory")
        print("  memory-store <content>    - Store content in memory")
        print("  fetch <url>              - Fetch document")
        return

    command = sys.argv[1]
    client = MCPHttpClient()

    try:
        if command == "health":
            result = await client.health_check()
            print(json.dumps(result, indent=2))

        elif command == "search" and len(sys.argv) > 2:
            query = " ".join(sys.argv[2:])
            result = await client.search(query)
            print(json.dumps(result, indent=2))

        elif command == "memory-search" and len(sys.argv) > 2:
            query = " ".join(sys.argv[2:])
            result = await client.memory_search(query)
            print(json.dumps(result, indent=2))

        elif command == "memory-store" and len(sys.argv) > 2:
            content = " ".join(sys.argv[2:])
            result = await client.memory_store(content)
            print(json.dumps(result, indent=2))

        elif command == "fetch" and len(sys.argv) > 2:
            url = sys.argv[2]
            result = await client.fetch_document(url)
            print(json.dumps(result, indent=2))

        else:
            print(f"Unknown command or missing arguments: {command}")
            sys.exit(1)

    except Exception as e:
        logger.error(f"brAInwav MCP client error: {e}")
        print(f"Error: {e}")
        sys.exit(1)

    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
