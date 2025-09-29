"""Local Memory REST adapter for Cortex MCP."""

from __future__ import annotations

import logging
from typing import Any

import httpx
from tenacity import AsyncRetrying, RetryError, stop_after_attempt, wait_exponential

from security.input_validation import sanitize_output

logger = logging.getLogger(__name__)


class MemoryAdapterError(RuntimeError):
    """Raised when Local Memory REST calls fail."""


class LocalMemoryAdapter:
    """Adapter that proxies memory CRUD to the Local Memory REST API."""

    def __init__(
        self,
        *,
        base_url: str,
        api_key: str | None,
        namespace: str | None,
        timeout_seconds: float,
        retries: int,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.namespace = namespace
        self.timeout_seconds = timeout_seconds
        self.retries = max(0, retries)

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        if self.namespace:
            headers["X-Namespace"] = self.namespace
        return headers

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json_body: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        url = f"{self.base_url}/{path.lstrip('/')}"

        async def _perform() -> dict[str, Any]:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.request(
                    method,
                    url,
                    headers=self._headers(),
                    json=json_body,
                    params=params,
                )
                if response.status_code == 204:
                    return {}
                response.raise_for_status()
                if not response.content:
                    return {}
                return response.json()

        try:
            if self.retries == 0:
                return await _perform()
            async for attempt in AsyncRetrying(
                stop=stop_after_attempt(self.retries),
                wait=wait_exponential(multiplier=0.5, min=0.5, max=5.0),
                reraise=True,
            ):
                with attempt:
                    return await _perform()
        except (RetryError, httpx.HTTPError) as exc:
            logger.error("brAInwav Local Memory call failed: %s", exc)
            raise MemoryAdapterError(str(exc)) from exc

    async def store(
        self,
        *,
        kind: str,
        text: str,
        tags: list[str] | None,
        metadata: dict[str, Any] | None,
    ) -> dict[str, Any]:
        payload = {
            "kind": kind,
            "text": text,
            "tags": tags or [],
            "metadata": metadata or {},
        }
        result = await self._request("POST", "/memories", json_body=payload)
        return sanitize_output(result)

    async def search(
        self,
        *,
        query: str,
        limit: int,
        kind: str | None,
        tags: list[str] | None,
    ) -> dict[str, Any]:
        params = {"q": query or "", "limit": limit}
        if kind:
            params["kind"] = kind
        if tags:
            params["tags"] = ",".join(tags)
        result = await self._request("GET", "/memories/search", params=params)
        return sanitize_output(result)

    async def get(self, memory_id: str) -> dict[str, Any] | None:
        try:
            result = await self._request("GET", f"/memories/{memory_id}")
            return sanitize_output(result)
        except MemoryAdapterError:
            logger.warning("Memory %s not found", memory_id)
            return None

    async def delete(self, memory_id: str) -> bool:
        try:
            await self._request("DELETE", f"/memories/{memory_id}")
            return True
        except MemoryAdapterError:
            return False
