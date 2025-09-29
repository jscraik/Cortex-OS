"""Cortex knowledge search adapter."""

from __future__ import annotations

import logging
from typing import Any

import httpx
from tenacity import AsyncRetrying, RetryError, stop_after_attempt, wait_exponential

from security.input_validation import sanitize_output

logger = logging.getLogger(__name__)


class SearchAdapterError(RuntimeError):
    """Raised when the Cortex search adapter fails."""


class CortexSearchAdapter:
    """Adapter that proxies queries to the Cortex knowledge search service."""

    def __init__(
        self,
        *,
        search_url: str,
        document_url: str | None,
        api_key: str | None,
        timeout_seconds: float,
        retries: int,
    ) -> None:
        self.search_url = search_url.rstrip("/") if search_url else ""
        self.document_url = document_url.rstrip("/") if document_url else None
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds
        self.retries = max(0, retries)

    async def search(self, query: str, *, limit: int) -> dict[str, Any]:
        if not self.search_url:
            raise SearchAdapterError("Cortex search endpoint not configured")

        headers = {"Accept": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        params = {"q": query, "limit": limit}

        async def _perform_request() -> dict[str, Any]:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.get(self.search_url, headers=headers, params=params)
                response.raise_for_status()
                return response.json()

        try:
            if self.retries == 0:
                payload = await _perform_request()
            else:
                async for attempt in AsyncRetrying(
                    stop=stop_after_attempt(self.retries),
                    wait=wait_exponential(multiplier=0.5, min=0.5, max=5.0),
                    reraise=True,
                ):
                    with attempt:
                        payload = await _perform_request()
        except (RetryError, httpx.HTTPError) as exc:
            logger.error("brAInwav search adapter failure: %s", exc)
            raise SearchAdapterError(str(exc)) from exc

        results = payload.get("results", [])
        normalized = [
            {
                "id": item.get("id") or item.get("document_id") or "",
                "title": item.get("title") or item.get("name") or "Untitled",
                "snippet": item.get("snippet") or item.get("excerpt") or "",
                "score": float(item.get("score", 0.0)),
                "url": item.get("url") or "",
                "source": item.get("source") or "cortex",
            }
            for item in results
        ]

        response_payload = {
            "query": query,
            "results": normalized,
            "total_found": payload.get("total_found", len(normalized)),
        }
        return sanitize_output(response_payload)

    async def fetch(self, resource_id: str) -> dict[str, Any]:
        if not self.document_url:
            raise SearchAdapterError("Cortex document endpoint not configured")
        url = f"{self.document_url}/{resource_id}".rstrip("/")
        headers = {"Accept": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        async def _perform_request() -> dict[str, Any]:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                return response.json()

        try:
            if self.retries == 0:
                payload = await _perform_request()
            else:
                async for attempt in AsyncRetrying(
                    stop=stop_after_attempt(self.retries),
                    wait=wait_exponential(multiplier=0.5, min=0.5, max=5.0),
                    reraise=True,
                ):
                    with attempt:
                        payload = await _perform_request()
        except (RetryError, httpx.HTTPError) as exc:
            logger.error("brAInwav document fetch failure: %s", exc)
            raise SearchAdapterError(str(exc)) from exc

        document = {
            "id": payload.get("id", resource_id),
            "title": payload.get("title") or payload.get("name") or "Untitled",
            "text": payload.get("text") or payload.get("content") or "",
            "metadata": payload.get("metadata", {}),
            "url": payload.get("url") or "",
        }
        return sanitize_output(document)
