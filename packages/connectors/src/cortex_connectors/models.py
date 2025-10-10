"""Pydantic models for the connectors manifest schema."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from typing import Literal


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

    per_minute: int = Field(..., ge=0)
    per_hour: int = Field(..., ge=0)
    per_day: int = Field(..., ge=0)


class ConnectorEntry(BaseModel):
    """Manifest entry describing a Cortex-OS connector."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., pattern=r"^[a-z0-9][a-z0-9-]{1,62}$")
    version: str = Field(..., min_length=1)
    status: Literal["enabled", "disabled", "preview"]
    description: Optional[str] = Field(default=None, min_length=1)
    authentication: ConnectorAuthentication
    scopes: List[str] = Field(default_factory=list)
    quotas: ConnectorQuota
    ttl_seconds: int = Field(..., ge=1)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("scopes")
    @classmethod
    def ensure_unique_scopes(cls, value: List[str]) -> List[str]:
        if len(value) != len(set(value)):
            raise ValueError("scopes must contain unique entries")
        return value


class ConnectorsManifest(BaseModel):
    """Root manifest describing all connectors."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

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


class ConnectorServiceMapEntry(BaseModel):
    """Subset of connector information exported to ASBR clients."""

    model_config = ConfigDict(extra="forbid")

    id: str
    version: str
    status: Literal["enabled", "disabled", "preview"]
    scopes: List[str]
    quotas: ConnectorQuota
    ttl_seconds: int = Field(..., ge=1)


class ConnectorServiceMap(BaseModel):
    """Service map exported to ASBR and downstream clients."""

    model_config = ConfigDict(extra="forbid")

    schema_version: Optional[str] = Field(default=None, pattern=r"^\d+\.\d+\.\d+$")
    generated_at: Optional[str] = None
    connectors: List[ConnectorServiceMapEntry] = Field(default_factory=list)

    @field_validator("generated_at")
    @classmethod
    def validate_generated_at(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        normalised = value.replace("Z", "+00:00")
        datetime.fromisoformat(normalised)
        return value
