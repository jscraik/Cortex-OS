"""
Lightweight JWT authentication utilities for FastAPI endpoints and middleware.

Design goals:
- Validate real JWTs using PyJWT (declared in dependencies).
- No static-token fallback in production paths.
- Small functions (<= 40 lines) to comply with CODESTYLE.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Sequence

from fastapi import HTTPException, Request, status

# Use PyJWT, which is part of project dependencies
from jwt import InvalidTokenError
import jwt

from cortex_mcp.auth.context import IdentityContext
from cortex_mcp.auth.oauth import (
    InsufficientScopeError,
    OAuthTokenVerifier,
    OAuthVerificationError,
)


@dataclass
class TokenData:
    user_id: str
    scopes: list[str]
    identity: IdentityContext | None = None


class JWTAuthenticator:
    """Authenticator supporting JWT or static bearer token fallback."""

    def __init__(
        self,
        secret_key: str | None,
        algorithm: str = "HS256",
        *,
        oauth_verifier: OAuthTokenVerifier | None = None,
    ) -> None:
        if not secret_key and not oauth_verifier:
            raise ValueError("Either 'secret_key' or 'oauth_verifier' must be provided")
        self.secret_key = secret_key
        self.algorithm = algorithm
        self._oauth_verifier = oauth_verifier

    def _extract_token(self, request: Request) -> str | None:
        # Prefer direct header parse to avoid DI coupling
        auth_header = request.headers.get("authorization") or request.headers.get(
            "Authorization"
        )
        if not auth_header:
            return None
        if not auth_header.startswith("Bearer "):
            return None
        return auth_header.split(" ", 1)[1].strip()

    def _decode_jwt(self, token: str) -> TokenData:
        try:
            payload: dict[str, Any] = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
                options={"require": ["sub"]},
            )
            user_id = str(payload.get("sub") or payload.get("user_id") or "anonymous")
            scopes = payload.get("scopes") or payload.get("scope") or []
            if isinstance(scopes, str):
                scopes = [scopes]
            return TokenData(user_id=user_id, scopes=list(scopes))
        except InvalidTokenError as exc:  # pragma: no cover
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
            ) from exc

    def verify_request(
        self, request: Request, required_scope: str | None = None
    ) -> TokenData:
        token = self._extract_token(request)
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token"
            )
        if self._oauth_verifier:
            required_scopes: Sequence[str] | None = (
                [required_scope] if required_scope else None
            )
            try:
                identity = self._oauth_verifier.verify(token, required_scopes)
            except InsufficientScopeError as exc:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
                ) from exc
            except OAuthVerificationError as exc:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
                ) from exc
            # Attach identity to request state for downstream consumers
            request.state.identity = identity  # type: ignore[attr-defined]
            request.state.user_id = identity.subject  # type: ignore[attr-defined]
            request.state.scopes = identity.scopes  # type: ignore[attr-defined]
            return TokenData(
                user_id=identity.subject, scopes=identity.scopes, identity=identity
            )

        if not self.secret_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication disabled"
            )
        data = self._decode_jwt(token)
        if required_scope and not ("*" in data.scopes or required_scope in data.scopes):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
            )
        # Attach to request for downstream consumers
        request.state.user_id = data.user_id  # type: ignore[attr-defined]
        request.state.scopes = data.scopes  # type: ignore[attr-defined]
        return data


def create_authenticator_from_env() -> JWTAuthenticator:
    import os

    secret = os.getenv("JWT_SECRET_KEY", "")
    if not secret:
        # Strict mode: require a secret to be set; safer default to avoid hardcoded secrets
        raise RuntimeError("JWT_SECRET_KEY is required for JWT authentication")
    algo = os.getenv("JWT_ALGORITHM", "HS256")
    return JWTAuthenticator(secret_key=secret, algorithm=algo)
