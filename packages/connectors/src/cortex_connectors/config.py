"""Configuration and manifest loading utilities for Cortex connectors."""

from __future__ import annotations

from json import loads
from pathlib import Path
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from pydantic_settings import BaseSettings

BRAND = "brAInwav"


class ConnectorAuthHeader(BaseModel):
    """Authentication header definition for a connector."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1)
    value: str = Field(..., min_length=1)


class ConnectorAuthentication(BaseModel):
    """Authentication metadata for a connector."""

    model_config = ConfigDict(extra="forbid")

    headers: List[ConnectorAuthHeader] = Field(..., min_length=1)


class ConnectorQuotaConfig(BaseModel):
    """Quota configuration for downstream rate limiting."""

    model_config = ConfigDict(extra="forbid")

    per_minute: int = Field(..., ge=0)
    per_hour: int = Field(..., ge=0)
    per_day: Optional[int] = Field(default=None, ge=0)


class ConnectorManifestConnector(BaseModel):
    """Connector definition sourced from the manifest."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., pattern=r"^[a-z0-9][a-z0-9-]{1,62}$")
    version: str = Field(..., min_length=1)
    status: Literal["enabled", "disabled", "preview"]
    description: Optional[str] = Field(default=None, min_length=1)
    authentication: ConnectorAuthentication
    scopes: List[str] = Field(default_factory=list)
    quotas: ConnectorQuotaConfig
    ttl_seconds: int = Field(..., ge=1)
    metadata: Dict[str, object] = Field(default_factory=dict)

    @field_validator("scopes")
    @classmethod
    def ensure_unique_scopes(cls, value: List[str]) -> List[str]:
        if len(value) != len(set(value)):
            raise ValueError("scopes must contain unique entries")
        return value


class ConnectorManifest(BaseModel):
    """Top-level manifest file."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    schema_uri: Optional[str] = Field(default=None, alias="$schema", min_length=1)
    schema_version: str = Field(..., pattern=r"^\d+\.\d+\.\d+$")
    generated_at: Optional[str] = None
    connectors: List[ConnectorManifestConnector] = Field(..., min_length=1)

    @property
    def brand(self) -> str:
        """Return the brAInwav brand identifier used across payloads."""

        return BRAND

    @property
    def ttl_seconds(self) -> int:
        """Expose the longest connector TTL as the manifest-level TTL."""

        return max(connector.ttl_seconds for connector in self.connectors)


class ConnectorsSettings(BaseSettings):
    """Env vars for the connectors runtime."""

    manifest_path: Path = Field(default=Path("config/connectors.manifest.json"), alias="CONNECTORS_MANIFEST_PATH")
    signature_key: Optional[str] = Field(default=None, alias="CONNECTORS_SIGNATURE_KEY")
    api_key: Optional[str] = Field(default=None, alias="CONNECTORS_API_KEY")
    no_auth: bool = Field(default=False, alias="NO_AUTH")

    model_config = ConfigDict(env_prefix="", env_file=None, populate_by_name=True)


def load_manifest(path: Path) -> ConnectorManifest:
    """Load and validate a connectors manifest from disk."""

    try:
        content = path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise FileNotFoundError(f"Connector manifest not found at {path}") from exc

    try:
        parsed = loads(content)
    except ValueError as exc:
        raise ValueError(f"Connector manifest at {path} is not valid JSON") from exc

    try:
        return ConnectorManifest.model_validate(parsed)
    except ValidationError as exc:
        raise ValueError(f"Connector manifest at {path} failed validation: {exc}") from exc
