from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional, Union

import httpx

logger = logging.getLogger(__name__)


class MCPError(Exception):
    """Base exception for MCP client errors."""


class MCPConnectionError(MCPError):
    """Raised when connection to MCP server fails."""


class MCPTimeoutError(MCPError):
    """Raised when MCP operation times out."""


class MCPAuthenticationError(MCPError):
    """Raised when MCP authentication fails."""


class ArchonMCPClient:
    """Enhanced MCP client for Archon integration with streaming, auth, and error handling."""

    def __init__(
        self,
        base_url: str,
        *,
        api_key: Optional[str] = None,
        timeout: float = 30.0,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        headers: Optional[Dict[str, str]] = None,
    ) -> None:
        """
        Initialize Archon MCP client.

        Args:
            base_url: Base URL for the Archon MCP server (e.g., http://localhost:8051)
            api_key: Optional API key for authentication
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
            retry_delay: Delay between retries in seconds
            headers: Additional headers to send with requests
        """
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._timeout = timeout
        self._max_retries = max_retries
        self._retry_delay = retry_delay
        self._next_id = 0
        self._session_id: Optional[str] = None

        # Prepare headers
        default_headers = {
            "Content-Type": "application/json",
            "User-Agent": "Cortex-OS-MCP-Client/1.0",
        }
        if api_key:
            default_headers["Authorization"] = f"Bearer {api_key}"
        if headers:
            default_headers.update(headers)

        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=timeout,
            headers=default_headers,
        )

    async def initialize(self) -> Dict[str, Any]:
        """Initialize MCP session and return server capabilities."""
        try:
            result = await self.call(
                "initialize",
                {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "roots": {"listChanged": True},
                        "sampling": {},
                    },
                    "clientInfo": {"name": "Cortex-OS", "version": "1.0.0"},
                },
            )
            logger.info("MCP session initialized successfully")
            return result
        except Exception as e:
            logger.error("Failed to initialize MCP session: %s", e)
            msg = f"Failed to initialize MCP session: {e}"
            raise MCPConnectionError(msg) from e

    async def call(self, method: str, params: Dict[str, Any] | None = None) -> Any:
        """Send a JSON-RPC request with retry logic."""
        last_error = None

        for attempt in range(self._max_retries + 1):
            try:
                self._next_id += 1
                payload = {
                    "jsonrpc": "2.0",
                    "id": self._next_id,
                    "method": method,
                    "params": params or {},
                }

                logger.debug("MCP request (attempt %d): %s", attempt + 1, method)
                response = await self._client.post("/", json=payload)
                response.raise_for_status()

                data = response.json()
                if "error" in data:
                    error_info = data["error"]
                    if error_info.get("code") == -32002:  # Authentication error
                        msg = error_info.get("message", "Authentication failed")
                        raise MCPAuthenticationError(msg)
                    error_code = error_info.get("code", "unknown")
                    error_msg = error_info.get("message", "Unknown error")
                    raise MCPError(f"MCP error {error_code}: {error_msg}")

                return data.get("result")

            except (httpx.TimeoutException, asyncio.TimeoutError) as e:
                last_error = MCPTimeoutError(f"Request timed out: {e}")
                logger.warning("MCP request timeout (attempt %d): %s", attempt + 1, method)
            except (httpx.NetworkError, httpx.ConnectError) as e:
                last_error = MCPConnectionError(f"Connection error: {e}")
                logger.warning("MCP connection error (attempt %d): %s", attempt + 1, method)
            except MCPAuthenticationError:
                # Don't retry auth errors
                raise
            except Exception as e:
                last_error = MCPError(f"Unexpected error: {e}")
                logger.warning("MCP unexpected error (attempt %d): %s", attempt + 1, method)

            if attempt < self._max_retries:
                delay = self._retry_delay * (2**attempt)  # Exponential backoff
                await asyncio.sleep(delay)

        raise last_error

    async def list_tools(self) -> List[Dict[str, Any]]:
        """List available tools from the MCP server."""
        try:
            result = await self.call("tools/list")
            return result.get("tools", [])
        except Exception as e:
            logger.error("Failed to list tools: %s", e)
            raise

    async def call_tool(
        self,
        name: str,
        arguments: Dict[str, Any],
        timeout: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Call a specific tool with arguments."""
        try:
            params = {"name": name, "arguments": arguments}

            # Use custom timeout if provided
            if timeout:
                original_timeout = self._client.timeout
                self._client.timeout = timeout
                try:
                    result = await self.call("tools/call", params)
                finally:
                    self._client.timeout = original_timeout
            else:
                result = await self.call("tools/call", params)

            return result
        except Exception as e:
            logger.error("Failed to call tool %s: %s", name, e)
            raise

    async def search_knowledge_base(
        self,
        query: str,
        *,
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Search Archon's knowledge base."""
        try:
            arguments = {"query": query, "limit": limit}
            if filters:
                arguments["filters"] = filters

            result = await self.call_tool("search_knowledge_base", arguments)
            return result.get("results", [])
        except Exception as e:
            logger.error("Knowledge base search failed for query '%s': %s", query, e)
            raise

    async def create_task(
        self,
        title: str,
        description: str,
        *,
        project_id: Optional[str] = None,
        priority: str = "medium",
        tags: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Create a new task in Archon."""
        try:
            arguments = {"title": title, "description": description, "priority": priority}
            if project_id:
                arguments["project_id"] = project_id
            if tags:
                arguments["tags"] = tags

            result = await self.call_tool("create_task", arguments)
            logger.info("Created task: %s", title)
            return result
        except Exception as e:
            logger.error("Failed to create task '%s': %s", title, e)
            raise

    async def update_task_status(
        self,
        task_id: str,
        status: str,
        *,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Update task status in Archon."""
        try:
            arguments = {"task_id": task_id, "status": status}
            if notes:
                arguments["notes"] = notes

            result = await self.call_tool("update_task_status", arguments)
            logger.info("Updated task %s to status: %s", task_id, status)
            return result
        except Exception as e:
            logger.error("Failed to update task %s: %s", task_id, e)
            raise

    async def upload_document(
        self,
        content: Union[str, bytes],
        filename: str,
        *,
        content_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Upload a document to Archon's knowledge base."""
        try:
            # Convert bytes to string if necessary
            if isinstance(content, bytes):
                content = content.decode("utf-8")

            arguments = {"content": content, "filename": filename}
            if content_type:
                arguments["content_type"] = content_type
            if tags:
                arguments["tags"] = tags
            if metadata:
                arguments["metadata"] = metadata

            result = await self.call_tool("upload_document", arguments)
            logger.info("Uploaded document: %s", filename)
            return result
        except Exception as e:
            logger.error("Failed to upload document '%s': %s", filename, e)
            raise

    async def stream_ai_response(
        self,
        messages: List[Dict[str, str]],
        *,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream AI response from Archon's agents."""
        try:
            arguments = {"messages": messages}
            if model:
                arguments["model"] = model
            if max_tokens:
                arguments["max_tokens"] = max_tokens

            # Note: This would need to be implemented as Server-Sent Events
            # or WebSocket connection in a real implementation
            result = await self.call_tool("chat_stream", arguments)

            # For now, simulate streaming by yielding chunks
            if "content" in result:
                content = result["content"]
                chunk_size = 50
                for i in range(0, len(content), chunk_size):
                    chunk = content[i : i + chunk_size]
                    yield {
                        "type": "content",
                        "content": chunk,
                        "timestamp": datetime.now().isoformat(),
                    }
                    await asyncio.sleep(0.1)  # Simulate streaming delay

            yield {"type": "done", "timestamp": datetime.now().isoformat()}

        except Exception as e:
            logger.error("Failed to stream AI response: %s", e)
            yield {
                "type": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }

    async def health_check(self) -> bool:
        """Check if the MCP server is healthy."""
        try:
            # Try a simple ping operation
            await self.call("ping", timeout=5.0)
            return True
        except Exception as e:
            logger.warning("Health check failed: %s", e)
            return False

    async def aclose(self) -> None:
        """Close the HTTP client connection."""
        try:
            await self._client.aclose()
            logger.debug("MCP client connection closed")
        except Exception as e:
            logger.warning("Error closing MCP client: %s", e)

    async def __aenter__(self):
        """Async context manager entry."""
        await self.initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.aclose()


# Legacy compatibility
class MCPClient(ArchonMCPClient):
    """Legacy MCPClient for backward compatibility."""

    def __init__(self, base_url: str) -> None:
        super().__init__(base_url)
