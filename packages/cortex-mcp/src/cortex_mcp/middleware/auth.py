"""Authentication middleware for Cortex MCP HTTP transport."""

from __future__ import annotations

from typing import Iterable, Sequence

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response

from cortex_mcp.auth.context import IdentityContext
from cortex_mcp.auth.jwt_auth import JWTAuthenticator
from cortex_mcp.auth.oauth import InsufficientScopeError, OAuthTokenVerifier, OAuthVerificationError
from cortex_mcp.middleware.rate_limiter import RateLimiter

BRANDING = {"provider": "brAInwav", "component": "cortex-mcp"}


class AuthMiddleware(BaseHTTPMiddleware):
    """Middleware that attaches authenticated identity to the request state."""

    def __init__(
        self,
        app,
        *,
        authenticator: JWTAuthenticator | None,
        oauth_verifier: OAuthTokenVerifier | None,
        rate_limiter: RateLimiter | None,
        optional_paths: Iterable[str] | None = None,
    ) -> None:
        super().__init__(app)
        self._authenticator = authenticator
        self._oauth_verifier = oauth_verifier
        self._rate_limiter = rate_limiter
        self._optional_paths = set(optional_paths or [])

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        if self._is_optional_path(path):
            return await call_next(request)

        token = _extract_bearer(request)
        if not token:
            # Allow legacy authenticator to fetch token itself if configured; otherwise enforce bearer.
            if self._oauth_verifier:
                return _json_error(
                    status.HTTP_401_UNAUTHORIZED,
                    "missing_token",
                    "Missing bearer token",
                )
        identity: IdentityContext | None = None

        if self._oauth_verifier and token:
            try:
                identity = self._oauth_verifier.verify(token, [])
            except InsufficientScopeError as exc:
                return _json_error(
                    status.HTTP_403_FORBIDDEN,
                    "insufficient_scope",
                    f"Insufficient scope: required={exc.required_scopes}",
                )
            except OAuthVerificationError as exc:
                return _json_error(
                    status.HTTP_401_UNAUTHORIZED,
                    "invalid_token",
                    str(exc) or "Invalid access token",
                )

        # Attach identity / token to request state for downstream handlers.
        if identity:
            request.state.identity = identity  # type: ignore[attr-defined]
            request.state.user_id = identity.subject  # type: ignore[attr-defined]
            request.state.scopes = identity.scopes  # type: ignore[attr-defined]
            request.state.oauth_token = token  # type: ignore[attr-defined]
        elif token:
            request.state.bearer_token = token  # type: ignore[attr-defined]

        if self._authenticator:
            request.state.authenticator = self._authenticator  # type: ignore[attr-defined]
        if self._oauth_verifier:
            request.state.oauth_verifier = self._oauth_verifier  # type: ignore[attr-defined]

        if self._rate_limiter:
            try:
                self._rate_limiter.check(request)
            except HTTPException as exc:
                return _json_error(exc.status_code, "rate_limited", exc.detail, exc.headers)

        return await call_next(request)

    def _is_optional_path(self, path: str) -> bool:
        return any(path == optional or path.startswith(optional.rstrip("/") + "/") for optional in self._optional_paths)


def enforce_scopes(
    request: Request,
    required_scopes: Sequence[str],
    authenticator: JWTAuthenticator | None,
) -> IdentityContext | None:
    """Ensure the request identity includes the required scopes."""

    identity: IdentityContext | None = getattr(request.state, "identity", None)
    if identity:
        if _has_required_scopes(identity.scopes, required_scopes):
            return identity
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )

    if authenticator is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    # Fallback to legacy authenticator which checks one scope at a time.
    for scope in required_scopes:
        authenticator.verify_request(request, required_scope=scope)
    return getattr(request.state, "identity", None)


def _has_required_scopes(granted: Iterable[str], required: Sequence[str]) -> bool:
    granted_set = set(granted)
    if "*" in granted_set or not required:
        return True
    return all(scope in granted_set for scope in required)


def _extract_bearer(request: Request) -> str | None:
    header = request.headers.get("authorization") or request.headers.get("Authorization")
    if not header or not header.startswith("Bearer "):
        return None
    return header.split(" ", 1)[1].strip()


def _json_error(
    status_code: int,
    code: str,
    message: str,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    payload = {
        "error": code,
        "message": message,
        "brand": BRANDING,
    }
    return JSONResponse(payload, status_code=status_code, headers=headers)
