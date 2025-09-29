"""Configuration for Cortex MCP server."""

from __future__ import annotations

from typing import Any

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    model_config = SettingsConfigDict(env_prefix="CORTEX_MCP_", case_sensitive=False)

    def dict_for_logging(self) -> dict[str, Any]:
        """Return safe-to-log fields."""
        return {
            "cortex_search_configured": bool(self.cortex_search_url),
            "cortex_document_configured": bool(self.cortex_document_base_url),
            "local_memory_base_url": str(self.local_memory_base_url),
            "http_timeout_seconds": self.http_timeout_seconds,
            "http_retries": self.http_retries,
        }
