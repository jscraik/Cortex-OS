"""Manifest models for Cortex Connectors."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional
import json

from pydantic import BaseModel, Field, HttpUrl, ValidationError


class ConnectorAuth(BaseModel):
    """Authentication configuration for a connector."""

    header_name: str = Field(alias="headerName")
    scheme: str = Field(default="Bearer")
    locations: List[str] = Field(default_factory=lambda: ["header"])

    model_config = dict(populate_by_name=True)


class ConnectorEndpoints(BaseModel):
    """Endpoints exposed by a connector."""

    http: HttpUrl
    sse: Optional[HttpUrl] = None


class ConnectorManifestEntry(BaseModel):
    """Single connector definition loaded from the manifest."""

    id: str
    name: str
    description: str
    enabled: bool = True
    scopes: List[str]
    quota_per_minute: Optional[int] = Field(default=None, alias="quotaPerMinute")
    ttl_seconds: Optional[int] = Field(default=None, alias="ttlSeconds")
    auth: ConnectorAuth
    endpoints: ConnectorEndpoints
    metadata: Dict[str, Any] = Field(default_factory=dict)

    model_config = dict(populate_by_name=True)

    def to_service_map_entry(self) -> Dict[str, Any]:
        """Return the public representation used in service-map payloads."""

        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "scopes": list(self.scopes),
            "ttlSeconds": self.ttl_seconds,
            "quotaPerMinute": self.quota_per_minute,
            "auth": {
                "headerName": self.auth.header_name,
                "scheme": self.auth.scheme,
                "locations": list(self.auth.locations),
            },
            "endpoints": {
                "http": str(self.endpoints.http),
                "sse": str(self.endpoints.sse) if self.endpoints.sse else None,
            },
            "metadata": self.metadata,
        }


class ManifestMetadata(BaseModel):
    version: str
    generated_at: datetime = Field(alias="generatedAt")

    model_config = dict(populate_by_name=True)


class ConnectorManifest(BaseModel):
    """Top-level manifest representation."""

    metadata: ManifestMetadata
    connectors: List[ConnectorManifestEntry]

    model_config = dict(populate_by_name=True)

    @classmethod
    def load(cls, path: Path) -> "ConnectorManifest":
        try:
            raw = path.read_text(encoding="utf-8")
        except FileNotFoundError as exc:  # pragma: no cover - easier to assert message
            raise FileNotFoundError(f"Manifest not found at {path}") from exc

        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Manifest at {path} is not valid JSON: {exc}") from exc

        try:
            return cls.model_validate(data)
        except ValidationError as exc:
            raise ValueError(f"Manifest validation failed: {exc}") from exc

    def enabled_connectors(self) -> Iterable[ConnectorManifestEntry]:
        return (connector for connector in self.connectors if connector.enabled)

    def service_map_payload(self) -> Dict[str, Any]:
        connectors = [c.to_service_map_entry() for c in self.enabled_connectors()]
        return {
            "metadata": {
                "version": self.metadata.version,
                "generatedAt": self.metadata.generated_at.isoformat(),
                "count": len(connectors),
            },
            "connectors": connectors,
        }


__all__ = [
    "ConnectorAuth",
    "ConnectorEndpoints",
    "ConnectorManifest",
    "ConnectorManifestEntry",
    "ManifestMetadata",
]
