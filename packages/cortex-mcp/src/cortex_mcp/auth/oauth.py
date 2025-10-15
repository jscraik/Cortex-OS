"""OAuth bridge configuration, Protected Resource Metadata, and token verification."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any, Callable, Iterable, Sequence

import httpx
import jwt
from jwt import InvalidTokenError
from starlette.responses import JSONResponse

from cortex_mcp.config import MCPSettings, OAuthSettings
from cortex_mcp.auth.context import IdentityContext

_BRANDING = {"provider": "brAInwav", "component": "cortex-mcp"}


@dataclass(frozen=True, slots=True)
class OAuthBridgeConfig:
    """Runtime configuration derived from settings for the OAuth bridge."""

    enabled: bool
    issuer: str
    resource: str
    authorization_endpoint: str | None
    token_endpoint: str | None
    jwks_uri: str
    scopes: dict[str, list[str]]
    require_pkce: bool
    metadata_ttl_seconds: int
    jwks_cache_ttl_seconds: int

    @classmethod
    def from_settings(cls, settings: MCPSettings) -> OAuthBridgeConfig | None:
        """Build a bridge configuration from MCP settings, or None if disabled."""
        oauth: OAuthSettings | None = settings.oauth
        if not oauth or not oauth.enabled:
            return None
        if not oauth.issuer:
            raise ValueError("oauth.issuer is required when OAuth bridge is enabled")
        if not oauth.resource:
            raise ValueError("oauth.resource is required when OAuth bridge is enabled")
        issuer = str(oauth.issuer).rstrip("/")
        resource = oauth.resource.rstrip("/") if oauth.resource else oauth.resource
        jwks_uri = (
            str(oauth.jwks_uri)
            if oauth.jwks_uri
            else f"{issuer}/.well-known/jwks.json"
        )
        return cls(
            enabled=True,
            issuer=issuer,
            resource=resource,
            authorization_endpoint=str(oauth.authorization_endpoint)
            if oauth.authorization_endpoint
            else None,
            token_endpoint=str(oauth.token_endpoint) if oauth.token_endpoint else None,
            jwks_uri=jwks_uri,
            scopes=oauth.scopes_catalog(),
            require_pkce=oauth.require_pkce,
            metadata_ttl_seconds=oauth.metadata_ttl_seconds,
            jwks_cache_ttl_seconds=oauth.jwks_cache_ttl_seconds,
        )

    def scopes_supported(self) -> list[str]:
        """Return sorted unique scopes from the configured map."""
        unique: set[str] = set()
        for items in self.scopes.values():
            unique.update(items)
        return sorted(unique)


def build_protected_resource_metadata(config: OAuthBridgeConfig) -> dict[str, Any]:
    """
    Construct the Protected Resource Metadata payload for ChatGPT Apps.

    The map is deterministic (sorted scopes) to simplify downstream comparisons.
    """

    payload: dict[str, Any] = {
        "issuer": config.issuer,
        "resource": config.resource,
        "jwks_uri": config.jwks_uri,
        "scopes": config.scopes,
        "scopes_supported": config.scopes_supported(),
        "require_pkce": config.require_pkce,
        "token_formats": ["jwt"],
        "branding": _BRANDING,
        "metadata_ttl_seconds": config.metadata_ttl_seconds,
    }
    if config.authorization_endpoint:
        payload["authorization_endpoint"] = config.authorization_endpoint
    if config.token_endpoint:
        payload["token_endpoint"] = config.token_endpoint
    return payload


def create_prm_response(config: OAuthBridgeConfig) -> JSONResponse:
    """Return a branded Starlette response for PRM requests."""

    headers = {
        "Cache-Control": f"public, max-age={config.metadata_ttl_seconds}",
        "X-Brainwav-Brand": "brAInwav",
        "X-Brainwav-Component": "cortex-mcp",
    }
    return JSONResponse(build_protected_resource_metadata(config), status_code=200, headers=headers)


class OAuthVerificationError(Exception):
    """Base error for OAuth verification failures."""


class JWKSResolutionError(OAuthVerificationError):
    """Raised when JWKS data cannot be retrieved or parsed."""


class InsufficientScopeError(OAuthVerificationError):
    """Raised when a token lacks required scopes."""

    def __init__(self, required_scopes: Sequence[str], granted_scopes: Iterable[str]):
        self.required_scopes = list(required_scopes)
        self.granted_scopes = list(granted_scopes)
        message = (
            "Insufficient scope."
            f" required={self.required_scopes}, granted={self.granted_scopes}"
        )
        super().__init__(message)


def _default_jwks_fetcher(url: str) -> dict[str, Any]:
    """Fetch JWKS payload from the identity provider."""

    response = httpx.get(url, timeout=5.0)
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, dict):
        raise JWKSResolutionError("JWKS response must be a JSON object")
    return data


class OAuthTokenVerifier:
    """Validates OAuth access tokens using provider JWKS."""

    def __init__(
        self,
        config: OAuthBridgeConfig,
        *,
        jwks_fetcher: Callable[[str], dict[str, Any]] | None = None,
        allowed_algorithms: Sequence[str] | None = None,
    ) -> None:
        if not config.enabled:
            raise ValueError("OAuthTokenVerifier requires an enabled OAuth bridge config")
        self._config = config
        self._jwks_fetcher = jwks_fetcher or _default_jwks_fetcher
        self._allowed_algorithms = tuple(allowed_algorithms or ("RS256",))
        self._cached_keys: dict[str, Any] = {}
        self._cache_timestamp: float = 0.0

    def verify(
        self, token: str, required_scopes: Sequence[str] | None = None
    ) -> IdentityContext:
        """Verify an access token and return a normalised identity context."""

        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            raise OAuthVerificationError("Token header missing 'kid'")
        key = self._get_signing_key(kid)
        try:
            claims = jwt.decode(
                token,
                key=key,
                algorithms=self._allowed_algorithms,
                audience=self._config.resource,
                issuer=self._config.issuer,
            )
        except InvalidTokenError as exc:
            raise OAuthVerificationError(str(exc)) from exc
        context = IdentityContext.from_claims(claims)
        required = list(required_scopes or [])
        if required and not context.has_scopes(required):
            raise InsufficientScopeError(required, context.scopes)
        return context

    def _get_signing_key(self, kid: str) -> Any:
        """Fetch and cache the signing key for the requested key id."""

        now = time.time()
        if (
            not self._cached_keys
            or (now - self._cache_timestamp) >= self._config.jwks_cache_ttl_seconds
            or kid not in self._cached_keys
        ):
            self._refresh_cache()
        key = self._cached_keys.get(kid)
        if not key:
            raise JWKSResolutionError(f"JWKS key with kid '{kid}' not found")
        return key

    def _refresh_cache(self) -> None:
        payload = self._jwks_fetcher(self._config.jwks_uri)
        keys = payload.get("keys")
        if not isinstance(keys, list):
            raise JWKSResolutionError("JWKS payload missing 'keys' array")
        parsed: dict[str, Any] = {}
        for entry in keys:
            if not isinstance(entry, dict):
                continue
            kid = entry.get("kid")
            if not kid:
                continue
            try:
                parsed[kid] = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(entry))
            except Exception as exc:  # pragma: no cover - defensive
                raise JWKSResolutionError(f"Failed to parse JWK for kid '{kid}'") from exc
        if not parsed:
            raise JWKSResolutionError("JWKS payload contained no usable keys")
        self._cached_keys = parsed
        self._cache_timestamp = time.time()
