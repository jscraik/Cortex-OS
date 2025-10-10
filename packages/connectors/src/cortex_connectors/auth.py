"""API key authentication helpers."""

from __future__ import annotations

from fastapi import HTTPException, Request, status


class APIKeyAuthenticator:
    """Simple bearer token auth suitable for HTTP + SSE requests."""

    def __init__(self, api_key: str | None, no_auth: bool = False) -> None:
        self._api_key = api_key
        self._no_auth = no_auth

    async def __call__(self, request: Request) -> None:
        if self._no_auth:
            return

        header = request.headers.get("authorization") or request.headers.get("Authorization")
        if not header:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")

        scheme, _, token = header.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Authorization header")

        if token != self._api_key:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API key")

    def protect(self, request: Request) -> None:
        """Synchronous helper for non-async contexts such as static file serving."""

        if self._no_auth:
            return
        header = request.headers.get("authorization") or request.headers.get("Authorization")
        if not header:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
        scheme, _, token = header.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Authorization header")
        if token != self._api_key:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API key")


__all__ = ["APIKeyAuthenticator"]
