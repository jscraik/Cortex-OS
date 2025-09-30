from __future__ import annotations

import time
from typing import Any

from prometheus_client import Counter, Histogram

mcp_requests_total = Counter(
    "mcp_requests_total", "Total MCP requests", ["method", "status"]
)
mcp_request_duration = Histogram(
    "mcp_request_duration_seconds",
    "MCP request duration",
    ["method"],
    buckets=[0.01, 0.05, 0.1, 0.5, 1, 2, 5],
)


class MetricsMiddleware:
    async def __call__(self, request: Any, call_next: Any):  # FastAPI-compatible
        start = time.time()
        method = "unknown"
        try:
            if hasattr(request, "json"):
                try:
                    body = await request.json()  # type: ignore[attr-defined]
                    method = body.get("method", "unknown")
                except Exception:
                    method = "unknown"
            response = await call_next(request)
            status = (
                "success" if getattr(response, "status_code", 500) < 400 else "error"
            )
            return response
        except Exception:
            status = "exception"
            raise
        finally:
            duration = time.time() - start
            mcp_requests_total.labels(method=method, status=status).inc()
            mcp_request_duration.labels(method=method).observe(duration)
