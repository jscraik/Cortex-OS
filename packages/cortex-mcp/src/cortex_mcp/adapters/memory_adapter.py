"""Local Memory REST adapter for Cortex MCP."""

from __future__ import annotations

import logging
from typing import Any, cast

import httpx
from tenacity import AsyncRetrying, RetryError, stop_after_attempt, wait_exponential

from ..security.input_validation import sanitize_output

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
        url = f"{self.base_url.rstrip('/')}/{path.lstrip('/')}"

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
                payload = cast(dict[str, Any], response.json())
                if isinstance(payload, dict) and "success" in payload:
                    if not payload.get("success", False):
                        error = payload.get("error")
                        message: str | None = None
                        if isinstance(error, dict):
                            if error.get("message"):
                                message = str(error["message"])
                            elif error.get("code"):
                                message = str(error["code"])
                        elif error:
                            message = str(error)
                        if not message and payload.get("message"):
                            message = str(payload["message"])
                        if not message:
                            message = "Local Memory request failed"
                        raise MemoryAdapterError(message)
                    data = payload.get("data")
                    meta: dict[str, Any] = {}
                    for key in ("count", "total", "next", "prev"):
                        if key in payload:
                            meta[key] = payload[key]
                    if data is None:
                        if "message" in payload:
                            return {**meta, "message": payload["message"]} if meta else {"message": payload["message"]}
                        return meta
                    if isinstance(data, dict):
                        return {**data, **meta}
                    if isinstance(data, list):
                        result = {"results": data}
                        result.update(meta)
                        return result
                    return {"data": data, **meta}
                return payload

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
        result = await self._request("POST", "/memory/store", json_body=payload)
        return sanitize_output(result)

    async def search(
        self,
        *,
        query: str,
        limit: int,
        kind: str | None,
        tags: list[str] | None,
    ) -> dict[str, Any]:
        payload = {
            "query": query,
            "search_type": "semantic" if not tags else "hybrid",
            "limit": limit,
            "tags": tags or [],
        }
        if kind:
            payload["domain"] = kind
        result = await self._request("POST", "/memory/search", json_body=payload)
        if isinstance(result, list):
            return sanitize_output({
                "results": result,
                "total_found": len(result),
            })
        if isinstance(result, dict):
            output = dict(result)
            if "results" in output and isinstance(output["results"], list):
                total = output.pop("count", None)
                if total is None:
                    total = output.get("total_found")
                if total is None:
                    total = len(output["results"])
                output["total_found"] = total or 0
                return sanitize_output(output)
            data_results = output.get("data")
            if isinstance(data_results, list):
                total = output.get("count", len(data_results))
                return sanitize_output({"results": data_results, "total_found": total})
            return sanitize_output(output)
        return sanitize_output(result)

    async def get(self, memory_id: str) -> dict[str, Any] | None:
        try:
            result = await self._request("GET", f"/memory/store/{memory_id}")
            return sanitize_output(result)
        except MemoryAdapterError:
            logger.warning("Memory %s not found", memory_id)
            return None

    async def delete(self, memory_id: str) -> bool:
        try:
            await self._request("DELETE", f"/memory/store/{memory_id}")
            return True
        except MemoryAdapterError:
            return False

    async def analysis(self, payload: dict[str, Any]) -> dict[str, Any]:
        result = await self._request("POST", "/memory/analysis", json_body=payload)
        return sanitize_output(result)

    async def relationships(self, payload: dict[str, Any]) -> dict[str, Any]:
        result = await self._request("POST", "/memory/relationships", json_body=payload)
        return sanitize_output(result)

    async def stats(self, payload: dict[str, Any]) -> dict[str, Any]:
        result = await self._request("POST", "/memory/stats", json_body=payload)
        return sanitize_output(result)

    async def health(self) -> dict[str, Any]:
        result = await self._request("GET", "/memory/health")
        return sanitize_output(result)

    async def cleanup(self) -> dict[str, Any]:
        result = await self._request("POST", "/memory/cleanup")
        return sanitize_output(result)

    async def optimize(self) -> dict[str, Any]:
        result = await self._request("POST", "/memory/optimize")
        return sanitize_output(result)
