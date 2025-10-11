"""Pydantic models for the connectors manifest schema."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Literal

from pydantic import AnyUrl, BaseModel, ConfigDict, Field, field_validator


class ConnectorAuthHeader(BaseModel):
    """Authentication header entry used by a connector."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1)
    value: str = Field(..., min_length=1)


class ConnectorAuthentication(BaseModel):
    """Authentication configuration for a connector."""

    model_config = ConfigDict(extra="forbid")

    headers: List[ConnectorAuthHeader] = Field(..., min_length=1)


class ConnectorQuota(BaseModel):
    """Quota limits for a connector."""

    model_config = ConfigDict(extra="forbid")

    per_minute: Optional[int] = Field(default=None, ge=0)
    per_hour: Optional[int] = Field(default=None, ge=0)
    per_day: Optional[int] = Field(default=None, ge=0)
    concurrent: Optional[int] = Field(default=None, ge=0)


class ConnectorEntry(BaseModel):
    """Manifest entry describing a Cortex-OS connector."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., pattern=r"^[a-z0-9][a-z0-9-]{1,62}$")
    name: str = Field(..., min_length=1)
    version: str = Field(..., min_length=1)
    status: Literal["enabled", "disabled", "preview"]
    description: Optional[str] = Field(default=None, min_length=1)
    endpoint: AnyUrl
    authentication: ConnectorAuthentication
    scopes: List[str] = Field(default_factory=list)
    quotas: ConnectorQuota
    ttl_seconds: int = Field(..., ge=1)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    headers: Optional[Dict[str, str]] = None
    tags: Optional[List[str]] = None

    @field_validator("scopes")
    @classmethod
    def ensure_unique_scopes(cls, value: List[str]) -> List[str]:
        if len(value) != len(set(value)):
            raise ValueError("scopes must contain unique entries")
        return value

    @property
    def enabled(self) -> bool:
        return self.status == "enabled"

    @property
    def display_name(self) -> str:
        return self.name


class ConnectorsManifest(BaseModel):
    """Root manifest describing all connectors."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str = Field(..., pattern=r"^[0-9A-HJKMNP-TV-Z]{26}$")
    schema_uri: Optional[str] = Field(default=None, alias="$schema", min_length=1)
    schema_version: str = Field(..., pattern=r"^\d+\.\d+\.\d+$")
    generated_at: Optional[str] = None
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


class ConnectorAuth(BaseModel):
    """Authentication metadata surfaced to clients."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["apiKey", "bearer", "none"]
    header_name: Optional[str] = Field(default=None, alias="headerName", min_length=1)


class ConnectorQuotaBudget(BaseModel):
    """Quota information exposed via the service map."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    per_minute: Optional[int] = Field(default=None, alias="perMinute", ge=0)
    per_hour: Optional[int] = Field(default=None, alias="perHour", ge=0)
    concurrent: Optional[int] = Field(default=None, alias="concurrent", ge=0)


class ConnectorServiceMapEntry(BaseModel):
    """Subset of connector information exported to ASBR clients."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    version: str
    display_name: str = Field(..., alias="displayName", min_length=1)
    endpoint: AnyUrl
    auth: ConnectorAuth
    scopes: List[str]
    ttl_seconds: int = Field(..., alias="ttlSeconds", ge=1)
    enabled: bool
    metadata: Dict[str, Any] = Field(default_factory=lambda: {"brand": "brAInwav"})
    quotas: Optional[ConnectorQuotaBudget] = None
    headers: Optional[Dict[str, str]] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None


class ConnectorServiceMap(BaseModel):
    """Service map exported to ASBR and downstream clients."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str = Field(..., pattern=r"^[0-9A-HJKMNP-TV-Z]{26}$")
    brand: Literal["brAInwav"] = "brAInwav"
    generated_at: Optional[str] = Field(default=None, alias="generatedAt")
    ttl_seconds: int = Field(..., alias="ttlSeconds", ge=1)
    connectors: List[ConnectorServiceMapEntry] = Field(..., min_length=1)

    @field_validator("generated_at")
    @classmethod
    def validate_generated_at(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        normalised = value.replace("Z", "+00:00")
        datetime.fromisoformat(normalised)
        return value
