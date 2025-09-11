from __future__ import annotations

from typing import Any, Dict

import httpx


class MCPClient:
    """Minimal JSON-RPC client for Model Context Protocol services."""

    def __init__(self, base_url: str) -> None:
        self._client = httpx.AsyncClient(base_url=base_url)
        self._next_id = 0

    async def call(self, method: str, params: Dict[str, Any] | None = None) -> Any:
        """Send a JSON-RPC request and return the result."""

        self._next_id += 1
        payload = {
            "jsonrpc": "2.0",
            "id": self._next_id,
            "method": method,
            "params": params or {},
        }
        response = await self._client.post("", json=payload)
        response.raise_for_status()
        data = response.json()
        if "error" in data:
            raise RuntimeError(data["error"])
        return data.get("result")

    async def aclose(self) -> None:
        await self._client.aclose()
