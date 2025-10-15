"""Configuration for Cortex MCP server."""

from __future__ import annotations

from typing import Any

from pydantic import AliasChoices, AnyHttpUrl, BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class OAuthSettings(BaseModel):
    """Configuration block for ChatGPT Apps OAuth bridge."""

    enabled: bool = Field(
        default=False,
        description="Enable OAuth 2.1 bridge for ChatGPT Apps",
    )
    issuer: AnyHttpUrl | None = Field(
        default=None,
        description="OAuth issuer URL",
    )
    authorization_endpoint: AnyHttpUrl | None = Field(
        default=None,
        description="Authorization endpoint exposed by the identity provider",
    )
    token_endpoint: AnyHttpUrl | None = Field(
        default=None,
        description="Token endpoint for exchanging authorization codes",
    )
    resource: str | None = Field(
        default=None,
        min_length=1,
        description="Resource identifier (audience) expected in access tokens",
    )
    jwks_uri: AnyHttpUrl | None = Field(
        default=None,
        description="Override for JWKS URI; defaults to {issuer}/.well-known/jwks.json",
    )
    scopes: dict[str, list[str]] = Field(
        default_factory=dict,
        description="Mapping of tool identifiers to required scopes",
    )
    require_pkce: bool = Field(
        default=True,
        description="Whether PKCE is required for the OAuth client",
    )
    metadata_ttl_seconds: int = Field(
        default=300,
        ge=60,
        le=86400,
        description="Cache lifetime for Protected Resource Metadata responses",
    )
    jwks_cache_ttl_seconds: int = Field(
        default=300,
        ge=60,
        le=7200,
        description="Cache lifetime for JWKS key material",
    )

    def scopes_catalog(self) -> dict[str, list[str]]:
        """Return scopes sorted per tool for deterministic outputs."""
        return {key: sorted({*value}) for key, value in self.scopes.items()}


class MCPSettings(BaseSettings):
    """Environment-driven configuration for Cortex MCP."""

    cortex_search_url: AnyHttpUrl | None = Field(
        default=None, description="Base URL for Cortex knowledge search endpoint"
    )
    cortex_search_api_key: str | None = Field(
        default=None, description="API key for Cortex knowledge search"
    )
    cortex_document_base_url: AnyHttpUrl | None = Field(
        default=None, description="Base URL for Cortex document fetch endpoint"
    )
    local_memory_base_url: AnyHttpUrl = Field(
        default="http://localhost:3028/api/v1",
        description="Base URL for Local Memory REST API",
    )
    local_memory_api_key: str | None = Field(
        default=None, description="Bearer token for Local Memory"
    )
    local_memory_namespace: str | None = Field(
        default=None, description="Namespace header for Local Memory"
    )
    http_timeout_seconds: float = Field(
        default=15.0, description="Default timeout for outbound HTTP calls"
    )
    http_retries: int = Field(
        default=3, ge=0, le=10, description="Retry attempts for outbound HTTP"
    )
    oauth: OAuthSettings | None = Field(
        default=None,
        description="Nested OAuth bridge configuration block",
        validation_alias=AliasChoices("oauth", "oauth_settings"),
    )

    model_config = SettingsConfigDict(env_prefix="CORTEX_MCP_", case_sensitive=False)

    def dict_for_logging(self) -> dict[str, Any]:
        """Return safe-to-log fields."""
        payload: dict[str, Any] = {
            "cortex_search_configured": bool(self.cortex_search_url),
            "cortex_document_configured": bool(self.cortex_document_base_url),
            "local_memory_base_url": str(self.local_memory_base_url),
            "http_timeout_seconds": self.http_timeout_seconds,
            "http_retries": self.http_retries,
        }
        if self.oauth:
            payload.update(
                {
                    "oauth_enabled": bool(self.oauth.enabled),
                    "oauth_issuer": str(self.oauth.issuer)
                    if self.oauth.issuer
                    else None,
                    "oauth_resource": self.oauth.resource,
                    "oauth_scopes": sorted(self.oauth.scopes.keys()),
                }
            )
        else:
            payload.update(
                {
                    "oauth_enabled": False,
                    "oauth_issuer": None,
                    "oauth_resource": None,
                    "oauth_scopes": [],
                }
            )
        return payload
