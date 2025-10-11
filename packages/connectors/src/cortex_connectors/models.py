"""Pydantic models for the connectors manifest schema."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import AnyUrl, BaseModel, ConfigDict, Field, field_validator


class ConnectorAuth(BaseModel):
    """Authentication configuration for a connector."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["apiKey", "bearer", "none"]
    header_name: Optional[str] = Field(default=None, alias="headerName", min_length=1)


class ConnectorEntry(BaseModel):
    """Manifest entry describing a Cortex-OS connector."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str = Field(..., pattern=r"^[a-z0-9][a-z0-9-]{1,62}$")
    name: str = Field(..., min_length=1)
    display_name: str = Field(..., alias="displayName", min_length=1)
    version: str = Field(..., min_length=1)
    description: Optional[str] = Field(default=None, min_length=1)
    enabled: bool = True
    status: Optional[Literal["enabled", "disabled", "preview"]] = None
    scopes: List[str] = Field(..., min_length=1)
    ttl_seconds: int = Field(..., alias="ttlSeconds", ge=1)
    endpoint: AnyUrl
    auth: ConnectorAuth
    quotas: Dict[str, int] = Field(default_factory=dict)
    timeouts: Dict[str, int] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)

    @field_validator("scopes")
    @classmethod
    def ensure_unique_scopes(cls, value: List[str]) -> List[str]:
        if len(value) != len(set(value)):
            msg = "scopes must contain unique entries"
            raise ValueError(msg)
        return value


class ConnectorsManifest(BaseModel):
    """Root manifest describing all connectors."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    schema_uri: Optional[str] = Field(default=None, alias="$schema", min_length=1)
    id: str = Field(..., min_length=1)
    manifest_version: str = Field(..., alias="manifestVersion", pattern=r"^\d+\.\d+\.\d+$")
    generated_at: Optional[str] = Field(default=None, alias="generatedAt")
    ttl_seconds: Optional[int] = Field(default=None, alias="ttlSeconds", ge=1)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    connectors: List[ConnectorEntry] = Field(..., min_length=1)

    @field_validator("generated_at")
    @classmethod
    def validate_generated_at(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        # Support trailing Z by normalising to RFC 3339 compatible string
        normalised = value.replace("Z", "+00:00")
        datetime.fromisoformat(normalised)
        return value


class ConnectorServiceMapEntry(BaseModel):
    """Subset of connector information exported to ASBR clients."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    version: str
    display_name: str = Field(..., alias="displayName")
    endpoint: AnyUrl
    auth: ConnectorAuth
    scopes: List[str]
    ttl_seconds: int = Field(..., alias="ttlSeconds", ge=1)
    enabled: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)
    quotas: Optional[Dict[str, int]] = None
    timeouts: Optional[Dict[str, int]] = None
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

    @field_validator("scopes")
    @classmethod
    def ensure_unique_scopes(cls, value: List[str]) -> List[str]:
        if len(value) != len(set(value)):
            msg = "scopes must contain unique entries"
            raise ValueError(msg)
        return value


class ConnectorServiceMap(BaseModel):
    """Service map exported to ASBR and downstream clients."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str = Field(..., min_length=1)
    brand: Literal["brAInwav"] = "brAInwav"
    generated_at: str = Field(..., alias="generatedAt")
    ttl_seconds: int = Field(..., alias="ttlSeconds", ge=1)
    connectors: List[ConnectorServiceMapEntry] = Field(default_factory=list)

    @field_validator("generated_at")
    @classmethod
    def validate_generated_at(cls, value: str) -> str:
        normalised = value.replace("Z", "+00:00")
        datetime.fromisoformat(normalised)
        return value
