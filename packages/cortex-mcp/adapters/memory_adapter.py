"""Local Memory REST adapter for Cortex MCP."""

from __future__ import annotations

import asyncio
import logging
from typing import Any
from uuid import uuid4

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


class InMemoryMemoryAdapter:
    """Fallback adapter storing memories in-process for resilience."""

    def __init__(self) -> None:
        self._records: dict[str, dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def store(
        self,
        *,
        kind: str,
        text: str,
        tags: list[str] | None,
        metadata: dict[str, Any] | None,
    ) -> dict[str, Any]:
        record = sanitize_output(
            {
                "id": str(uuid4()),
                "kind": kind,
                "text": text,
                "tags": tags or [],
                "metadata": metadata or {},
            }
        )
        await self.upsert(record)
        return record

    async def upsert(self, record: dict[str, Any]) -> None:
        async with self._lock:
            record_id = str(record.get("id") or uuid4())
            clean = sanitize_output(
                {
                    "id": record_id,
                    "kind": record.get("kind", "note"),
                    "text": record.get("text", ""),
                    "tags": record.get("tags", []),
                    "metadata": record.get("metadata", {}),
                }
            )
            self._records[record_id] = clean

    async def search(
        self,
        *,
        query: str,
        limit: int,
        kind: str | None,
        tags: list[str] | None,
    ) -> dict[str, Any]:
        async with self._lock:
            lowered = (query or "").lower()
            results: list[dict[str, Any]] = []
            for record in self._records.values():
                if kind and record.get("kind") != kind:
                    continue
                if tags and not set(tags).issubset(set(record.get("tags", []))):
                    continue
                if lowered and lowered not in record.get("text", "").lower():
                    continue
                results.append(record)
            return {
                "query": query,
                "results": sanitize_output(results[:limit]),
                "total_found": len(results),
            }

    async def get(self, memory_id: str) -> dict[str, Any] | None:
        async with self._lock:
            record = self._records.get(memory_id)
            return sanitize_output(record) if record else None

    async def delete(self, memory_id: str) -> bool:
        async with self._lock:
            return self._records.pop(memory_id, None) is not None


class ResilientMemoryAdapter:
    """Attempts primary adapter first, falling back to in-memory storage."""

    def __init__(
        self,
        *,
        primary: LocalMemoryAdapter | None,
        fallback: InMemoryMemoryAdapter,
    ) -> None:
        self.primary = primary
        self.fallback = fallback

    async def store(
        self,
        *,
        kind: str,
        text: str,
        tags: list[str] | None,
        metadata: dict[str, Any] | None,
    ) -> dict[str, Any]:
        if self.primary is not None:
            try:
                record = await self.primary.store(
                    kind=kind, text=text, tags=tags, metadata=metadata
                )
                await self.fallback.upsert(record)
                return record
            except MemoryAdapterError as exc:
                logger.warning(
                    "Local Memory REST adapter failed, using in-process fallback: %s",
                    exc,
                )
        return await self.fallback.store(
            kind=kind, text=text, tags=tags, metadata=metadata
        )

    async def search(
        self,
        *,
        query: str,
        limit: int,
        kind: str | None,
        tags: list[str] | None,
    ) -> dict[str, Any]:
        if self.primary is not None:
            try:
                return await self.primary.search(
                    query=query, limit=limit, kind=kind, tags=tags
                )
            except MemoryAdapterError as exc:
                logger.warning(
                    "Falling back to in-process memory search: %s", exc
                )
        return await self.fallback.search(
            query=query, limit=limit, kind=kind, tags=tags
        )

    async def get(self, memory_id: str) -> dict[str, Any] | None:
        if self.primary is not None:
            try:
                value = await self.primary.get(memory_id)
                if value is not None:
                    return value
            except MemoryAdapterError as exc:
                logger.warning(
                    "Primary memory get failed, using fallback: %s", exc
                )
        return await self.fallback.get(memory_id)

    async def delete(self, memory_id: str) -> bool:
        deleted = False
        if self.primary is not None:
            try:
                deleted = await self.primary.delete(memory_id)
            except MemoryAdapterError as exc:
                logger.warning(
                    "Primary memory delete failed, trying fallback: %s", exc
                )
        fallback_deleted = await self.fallback.delete(memory_id)
        return deleted or fallback_deleted
