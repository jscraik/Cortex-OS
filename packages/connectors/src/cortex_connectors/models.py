"""Pydantic models for the connectors manifest and service map."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from pydantic import AnyUrl, BaseModel, ConfigDict, Field, field_validator

BRAND = "brAInwav"
ULID_PATTERN = r"^[0-9A-HJKMNP-TV-Z]{26}$"
CONNECTOR_ID_PATTERN = r"^[a-z0-9][a-z0-9-]{1,62}$"


class ConnectorAuthHeader(BaseModel):
    """Authentication header definition used in manifests."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1)
    value: str = Field(..., min_length=1)


class ConnectorAuthentication(BaseModel):
    """Authentication metadata describing required headers."""

    model_config = ConfigDict(extra="forbid")

    headers: List[ConnectorAuthHeader] = Field(..., min_length=1)


class ConnectorAuth(BaseModel):
    """Authentication configuration surfaced to consumers."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["apiKey", "bearer", "none"]
    header_name: Optional[str] = Field(default=None, alias="headerName", min_length=1)


class ConnectorQuota(BaseModel):
    """Quota definition as stored in manifests."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    per_minute: Optional[int] = Field(default=None, alias="perMinute", ge=0)
    per_hour: Optional[int] = Field(default=None, alias="perHour", ge=0)
    per_day: Optional[int] = Field(default=None, alias="perDay", ge=0)
    concurrent: Optional[int] = Field(default=None, ge=0)

    def to_budget(self) -> Optional[Dict[str, int]]:
        """Return camelCase quota keys for service-map payloads."""

        budget: Dict[str, int] = {}
        if self.per_minute is not None:
            budget["perMinute"] = self.per_minute
        if self.per_hour is not None:
            budget["perHour"] = self.per_hour
        if self.per_day is not None:
            budget["perDay"] = self.per_day
        if self.concurrent is not None:
            budget["concurrent"] = self.concurrent
        return budget or None


class ConnectorManifestEntry(BaseModel):
    """Connector definition supplied in the manifest file."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str = Field(..., pattern=CONNECTOR_ID_PATTERN)
    name: str = Field(..., min_length=1)
    display_name: Optional[str] = Field(default=None, alias="displayName", min_length=1)
    version: str = Field(..., min_length=1)
    description: Optional[str] = Field(default=None, min_length=1)
    endpoint: AnyUrl
    auth: ConnectorAuth
    authentication: Optional[ConnectorAuthentication] = None
    headers: Optional[Dict[str, str]] = None
    scopes: List[str] = Field(..., min_length=1)
    quotas: Optional[ConnectorQuota] = None
    timeouts: Optional[Dict[str, int]] = None
    status: Optional[Literal["enabled", "disabled", "preview"]] = None
    enabled: Optional[bool] = None
    ttl_seconds: int = Field(..., alias="ttlSeconds", ge=1)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)

    @field_validator("scopes")
    @classmethod
    def validate_scopes(cls, value: List[str]) -> List[str]:
        if len(value) != len(set(value)):
            msg = "connector scopes must be unique"
            raise ValueError(msg)
        return value


class ConnectorsManifest(BaseModel):
    """Root manifest containing connector entries."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    schema_uri: Optional[str] = Field(default=None, alias="$schema", min_length=1)
    id: str = Field(..., pattern=ULID_PATTERN)
    brand: Optional[Literal["brAInwav"]] = None
    manifest_version: str = Field(..., alias="manifestVersion", min_length=1)
    schema_version: Optional[str] = Field(default=None, alias="schemaVersion", min_length=1)
    generated_at: Optional[str] = Field(default=None, alias="generatedAt")
    ttl_seconds: Optional[int] = Field(default=None, alias="ttlSeconds", ge=1)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    connectors: List[ConnectorManifestEntry] = Field(..., min_length=1)


class ConnectorQuotaBudget(BaseModel):
    """Quota definition emitted in the service map payload."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    per_minute: Optional[int] = Field(default=None, alias="perMinute", ge=0)
    per_hour: Optional[int] = Field(default=None, alias="perHour", ge=0)
    per_day: Optional[int] = Field(default=None, alias="perDay", ge=0)
    concurrent: Optional[int] = Field(default=None, ge=0)


class ConnectorServiceMapEntry(BaseModel):
    """Connector representation returned to downstream clients."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    version: str
    display_name: str = Field(..., alias="displayName")
    endpoint: AnyUrl
    auth: ConnectorAuth
    scopes: List[str]
    ttl_seconds: int = Field(..., alias="ttlSeconds", ge=1)
    enabled: bool
    metadata: Dict[str, Any] = Field(default_factory=lambda: {"brand": BRAND})
    quotas: Optional[ConnectorQuotaBudget] = None
    headers: Optional[Dict[str, str]] = None
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    timeouts: Optional[Dict[str, int]] = None


class ConnectorServiceMapPayload(BaseModel):
    """Unsigned service-map payload."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str = Field(..., pattern=ULID_PATTERN)
    brand: Literal["brAInwav"] = Field(default=BRAND)
    generated_at: str = Field(..., alias="generatedAt")
    ttl_seconds: int = Field(..., alias="ttlSeconds", ge=1)
    connectors: List[ConnectorServiceMapEntry] = Field(..., min_length=1)
    metadata: Optional[Dict[str, Any]] = None

    @field_validator("generated_at")
    @classmethod
    def validate_generated_at(cls, value: str) -> str:
        # Normalise and validate ISO-8601 timestamps (support trailing Z)
        normalised = value.replace("Z", "+00:00")
        datetime.fromisoformat(normalised)
        return value


class ConnectorServiceMap(ConnectorServiceMapPayload):
    """Signed service-map payload."""

    signature: str = Field(..., min_length=1)


def ensure_brand(metadata: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Ensure metadata contains the brAInwav brand marker."""

    base: Dict[str, Any] = {"brand": BRAND}
    if metadata:
        base.update(metadata)
    return base


def manifest_entry_to_service_entry(
    entry: ConnectorManifestEntry,
    *,
    enabled: bool,
) -> ConnectorServiceMapEntry:
    """Transform a manifest connector entry into the service-map representation."""

    metadata = ensure_brand(entry.metadata)
    quotas = entry.quotas.to_budget() if entry.quotas else None
    merged_headers: Dict[str, str] = {}

    for header in entry.authentication.headers if entry.authentication else []:
        merged_headers[header.name] = header.value

    if entry.headers:
        merged_headers.update(entry.headers)

    headers = merged_headers or None

    return ConnectorServiceMapEntry(
        id=entry.id,
        version=entry.version,
        displayName=entry.display_name or entry.name,
        endpoint=entry.endpoint,
        auth=entry.auth,
        scopes=list(entry.scopes),
        ttlSeconds=entry.ttl_seconds,
        enabled=enabled,
        metadata=metadata,
        quotas=ConnectorQuotaBudget.model_validate(quotas) if quotas else None,
        headers=headers,
        description=entry.description,
        tags=list(entry.tags) if entry.tags else [],
        timeouts=entry.timeouts,
    )


def determine_enabled(entry: ConnectorManifestEntry) -> bool:
    """Resolve whether a connector is enabled."""

    if entry.enabled is not None:
        return entry.enabled
    if entry.status:
        return entry.status != "disabled"
    return True


def build_service_map_payload(
    manifest: ConnectorsManifest,
    *,
    now: Optional[datetime] = None,
) -> ConnectorServiceMapPayload:
    """Construct a service-map payload from a validated manifest."""

    current_time = now or datetime.now(timezone.utc)
    generated_at = manifest.generated_at or current_time.replace(microsecond=0).isoformat().replace("+00:00", "Z")

    connectors = [
        manifest_entry_to_service_entry(entry, enabled=determine_enabled(entry))
        for entry in sorted(manifest.connectors, key=lambda connector: connector.id)
    ]

    if not connectors:
        raise ValueError("connectors manifest must include at least one connector")

    ttl_candidates = [connector.ttl_seconds for connector in connectors]
    min_connector_ttl = min(ttl_candidates)
    manifest_ttl = manifest.ttl_seconds if manifest.ttl_seconds is not None else min_connector_ttl
    ttl_seconds = max(1, min(manifest_ttl, min_connector_ttl))

    metadata = manifest.metadata or None
    if metadata is not None and "brand" not in metadata:
        metadata = {"brand": BRAND, **metadata}

    return ConnectorServiceMapPayload(
        id=manifest.id,
        brand=manifest.brand or BRAND,
        generatedAt=generated_at,
        ttlSeconds=ttl_seconds,
        connectors=connectors,
        metadata=metadata,
    )


__all__ = [
    "BRAND",
    "ConnectorAuthHeader",
    "ConnectorAuthentication",
    "ConnectorAuth",
    "ConnectorQuota",
    "ConnectorQuotaBudget",
    "ConnectorManifestEntry",
    "ConnectorsManifest",
    "ConnectorServiceMapEntry",
    "ConnectorServiceMapPayload",
    "ConnectorServiceMap",
    "ensure_brand",
    "manifest_entry_to_service_entry",
    "determine_enabled",
    "build_service_map_payload",
]
