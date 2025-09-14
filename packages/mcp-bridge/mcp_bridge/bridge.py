"""Stdio ↔ HTTP/SSE bridge (scaffold)."""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass
from typing import Any

try:  # pragma: no cover - optional import
    import httpx
except Exception:  # pragma: no cover
    httpx = None  # type: ignore


@dataclass
class RateConfig:
    messages_per_sec: float | None = None
    max_queue: int | None = None


class MCPBridge:
    """Minimal bridge that forwards JSON lines between stdio and HTTP/SSE."""

    def __init__(
        self,
        outbound_url: str | None = None,
        rate: RateConfig | None = None,
        sleep_func: Callable[[float], Any] | None = None,
    ) -> None:
        self.outbound_url = outbound_url
        self.rate = rate or RateConfig()
        import asyncio as _asyncio

        self._sleep = sleep_func or _asyncio.sleep
        self._allowance = self.rate.messages_per_sec or None
        self._last = None
        self._queue: asyncio.Queue[str] = asyncio.Queue(
            maxsize=self.rate.max_queue or 0
        )

    async def enqueue_stdio(self, line: str) -> None:
        """Enqueue an incoming stdio JSON line for forwarding."""
        try:
            if self._queue.maxsize and self._queue.qsize() >= self._queue.maxsize:
                # Drop newest when queue is full (simple policy)
                _ = self._queue.get_nowait()
            await self._queue.put(line)
        except asyncio.QueueFull:  # pragma: no cover - guard
            pass

    async def forward_loop(self) -> None:
        """Forward queued lines to outbound URL with basic rate limiting."""
        if self.outbound_url is None or httpx is None:
            return
        async with httpx.AsyncClient() as client:
            while True:
                line = await self._queue.get()
                if self.rate.messages_per_sec:
                    import time as _time

                    now = _time.monotonic()
                    if self._last is None:
                        self._last = now
                        self._allowance = self.rate.messages_per_sec
                    elapsed = max(0.0, now - self._last)
                    self._last = now
                    self._allowance = min(
                        self.rate.messages_per_sec,
                        (self._allowance or 0) + elapsed * self.rate.messages_per_sec,
                    )
                    if (self._allowance or 0) < 1.0:
                        await self._sleep(
                            (1.0 - (self._allowance or 0)) / self.rate.messages_per_sec
                        )
                        self._allowance = 0.0
                    else:
                        self._allowance = (self._allowance or 0) - 1.0

                try:
                    payload = json.loads(line)
                except Exception:
                    payload = {"raw": line}
                await client.post(self.outbound_url, json=payload)

    # Stdio reader wiring (injectable for tests)
    async def read_stdio(self, reader: AsyncIterator[str]) -> None:
        async for line in reader:
            await self.enqueue_stdio(line)

    # SSE subscription to receive events and emit to callback
    async def subscribe_sse(self, url: str, on_event: Callable[[dict], Any]) -> None:
        if httpx is None:  # pragma: no cover
            return
        async with httpx.AsyncClient() as client:
            async with client.stream("GET", url) as response:
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    data_str = line[len("data:") :].strip()
                    try:
                        evt = json.loads(data_str)
                    except Exception:
                        evt = {"raw": data_str}
                    on_event(evt)
