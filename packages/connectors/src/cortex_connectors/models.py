"""Pydantic models for the connectors manifest schema."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class ConnectorAuth(BaseModel):
    """Authentication configuration for a connector."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["apiKey", "bearer", "none"]
    header_name: Optional[str] = Field(default=None, alias="headerName", min_length=1)


class ConnectorManifestEntry(BaseModel):
    """Manifest entry describing a Cortex-OS connector."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str = Field(..., pattern=r"^[a-z0-9][a-z0-9-]{1,62}$")
    name: str = Field(..., min_length=1)
    version: str = Field(..., min_length=1)
    scopes: List[str] = Field(..., min_length=1)
    quotas: Dict[str, int] = Field(default_factory=dict)
    timeouts: Dict[str, int] = Field(default_factory=dict)
    status: Literal["enabled", "disabled"] = "enabled"
    ttl_seconds: int = Field(..., ge=1, alias="ttlSeconds")
    metadata: Dict[str, Any] = Field(default_factory=dict)
    endpoint: Optional[HttpUrl] = None
    auth: Optional[ConnectorAuth] = None

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

    id: str = Field(..., min_length=1)
    brand: Optional[Literal["brAInwav"]] = None
    ttl_seconds: int = Field(..., ge=1, alias="ttlSeconds")
    connectors: List[ConnectorManifestEntry] = Field(..., min_length=1)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def service_map_payload(self) -> "ConnectorServiceMapPayload":
        """Create the service map payload derived from this manifest."""

        now = datetime.now(timezone.utc)
        now_epoch = int(now.timestamp())
        connectors = [
            ConnectorServiceMapEntry.from_manifest(entry, now_epoch)
            for entry in sorted(self.connectors, key=lambda connector: connector.id)
        ]

        min_connector_ttl = None
        if connectors:
            min_connector_ttl = min(connector.ttl - now_epoch for connector in connectors)

        ttl_seconds = max(self.ttl_seconds, (min_connector_ttl or 1))

        payload = ConnectorServiceMapPayload(
            id=self.id,
            brand=self.brand or "brAInwav",
            generated_at=now.isoformat().replace("+00:00", "Z"),
            ttl_seconds=ttl_seconds,
            connectors=connectors,
        )

        return payload


class ConnectorServiceMapEntry(BaseModel):
    """Subset of connector information exported to ASBR clients."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    name: str
    version: str
    scopes: List[str]
    status: Literal["enabled", "disabled"]
    ttl: int = Field(..., ge=1)
    quotas: Optional[Dict[str, int]] = None
    timeouts: Optional[Dict[str, int]] = None
    metadata: Optional[Dict[str, Any]] = None
    endpoint: Optional[HttpUrl] = None
    auth: Optional[ConnectorAuth] = None

    @classmethod
    def from_manifest(cls, entry: ConnectorManifestEntry, now_epoch: int) -> "ConnectorServiceMapEntry":
        data: Dict[str, Any] = {
            "id": entry.id,
            "name": entry.name,
            "version": entry.version,
            "scopes": list(entry.scopes),
            "status": entry.status,
            "ttl": now_epoch + entry.ttl_seconds,
        }

        if entry.quotas:
            data["quotas"] = dict(entry.quotas)
        if entry.timeouts:
            data["timeouts"] = dict(entry.timeouts)
        if entry.metadata:
            data["metadata"] = dict(entry.metadata)
        if entry.endpoint is not None:
            data["endpoint"] = entry.endpoint
        if entry.auth is not None:
            data["auth"] = entry.auth

        return cls.model_validate(data)


class ConnectorServiceMapPayload(BaseModel):
    """Service map payload shared between the registry and ASBR."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str = Field(..., min_length=1)
    brand: Literal["brAInwav"] = "brAInwav"
    generated_at: str = Field(..., alias="generatedAt")
    ttl_seconds: int = Field(..., alias="ttlSeconds", ge=1)
    connectors: List[ConnectorServiceMapEntry] = Field(default_factory=list)

    @field_validator("generated_at")
    @classmethod
    def validate_generated_at(cls, value: str) -> str:
        # Support trailing Z by normalising to RFC 3339 compatible string
        normalised = value.replace("Z", "+00:00")
        datetime.fromisoformat(normalised)
        return value


class ConnectorServiceMap(ConnectorServiceMapPayload):
    """Signed service map exported to ASBR and downstream clients."""

    signature: str = Field(..., min_length=1)
