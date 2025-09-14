"""Utilities for RFC 9457 Problem+JSON error responses.

Provides helpers to create consistent error payloads and FastAPI handlers
without coupling core logic to the web framework.
"""

from __future__ import annotations

from typing import Any


def problem_detail(
    title: str,
    status: int,
    detail: str | None = None,
    type_: str = "about:blank",
    instance: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Create a Problem+JSON compatible dictionary.

    Fields follow RFC 9457: type, title, status, detail, instance.
    """

    payload: dict[str, Any] = {
        "type": type_,
        "title": title,
        "status": status,
    }
    if detail is not None:
        payload["detail"] = detail
    if instance is not None:
        payload["instance"] = instance
    if extra:
        # Merge extra members, without overwriting standard fields
        for k, v in extra.items():
            if k not in payload:
                payload[k] = v
    return payload


def as_fastapi_handler():  # pragma: no cover - thin adapter
    """Return a FastAPI exception handler producing Problem+JSON responses.

    Imported lazily to avoid hard dependency on FastAPI for core tests.
    """

    from fastapi import Request
    from fastapi.responses import JSONResponse
    from starlette.exceptions import HTTPException as StarletteHTTPException

    async def handler(_request: Request, exc: StarletteHTTPException):
        payload = problem_detail(
            title=exc.detail if isinstance(exc.detail, str) else exc.__class__.__name__,
            status=exc.status_code,
            detail=exc.detail if isinstance(exc.detail, str) else None,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=payload,
            media_type="application/problem+json",
        )

    return handler

