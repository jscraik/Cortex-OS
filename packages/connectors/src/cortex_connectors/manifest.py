"""Utilities for loading and signing the connectors manifest."""

from __future__ import annotations

import base64
import json
import hmac
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from pydantic import ValidationError

from .models import (
    ConnectorAuth,
    ConnectorAuthHeader,
    ConnectorEntry,
    ConnectorQuota,
    ConnectorQuotaBudget,
    ConnectorServiceMap,
    ConnectorServiceMapEntry,
    ConnectorsManifest,
)

MODULE_PATH = Path(__file__).resolve()
FALLBACK_MANIFEST_PATH = MODULE_PATH.parents[4] / "config" / "connectors.manifest.json"
CWD_MANIFEST_PATH = Path.cwd() / "config" / "connectors.manifest.json"


@dataclass(slots=True)
class ManifestLoadAttempt:
    """Record of an attempted manifest load."""

    path: Path
    error: Exception


class ConnectorsManifestError(Exception):
    """Raised when the manifest cannot be loaded from any configured location."""

    def __init__(self, message: str, attempts: List[ManifestLoadAttempt]):
        super().__init__(message)
        self.attempts = attempts


def _build_candidate_paths(path: Optional[str | Path]) -> Iterable[Path]:
    """Build the ordered list of manifest paths to try."""

    candidates: List[Path] = []
    if path:
        candidates.append(Path(path))
    candidates.extend([CWD_MANIFEST_PATH, FALLBACK_MANIFEST_PATH])

    seen: set[Path] = set()
    for candidate in candidates:
        expanded = candidate.expanduser()
        if expanded in seen:
            continue
        seen.add(expanded)
        yield expanded


def load_connectors_manifest(manifest_path: Optional[str | Path] = None) -> ConnectorsManifest:
    """Load and validate the connectors manifest."""

    attempts: List[ManifestLoadAttempt] = []

    for candidate in _build_candidate_paths(manifest_path):
        try:
            raw = candidate.read_text(encoding="utf-8")
            data = json.loads(raw)
            return ConnectorsManifest.model_validate(data)
        except (FileNotFoundError, PermissionError, json.JSONDecodeError, ValidationError) as exc:  # pragma: no cover - aggregated below
            attempts.append(ManifestLoadAttempt(path=candidate, error=exc))
        except Exception as exc:  # pragma: no cover - unexpected exceptions are still reported
            attempts.append(ManifestLoadAttempt(path=candidate, error=exc))

    raise ConnectorsManifestError(
        "Unable to load connectors manifest from configured locations",
        attempts,
    )


def build_connector_service_map(manifest: ConnectorsManifest) -> ConnectorServiceMap:
    """Create the ASBR-facing service map from the manifest."""

    connectors = [
        _build_service_entry(entry)
        for entry in sorted(manifest.connectors, key=lambda item: item.id)
    ]

    if not connectors:
        msg = "Connectors manifest must declare at least one connector"
        raise ConnectorsManifestError(msg, attempts=[])

    ttl_seconds = max(1, min(entry.ttl_seconds for entry in connectors))

    return ConnectorServiceMap(
        id=manifest.id,
        generated_at=manifest.generated_at,
        ttl_seconds=ttl_seconds,
        connectors=connectors,
    )


def sign_connector_service_map(service_map: ConnectorServiceMap, secret: str) -> str:
    """Generate an HMAC signature for the service map."""

    if not secret:
        msg = "CONNECTORS_SIGNATURE_KEY is required to sign the connectors service map"
        raise ValueError(msg)

    payload = json.dumps(
        service_map.model_dump(mode="json", by_alias=True, exclude_none=True),
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), payload, sha256).digest()
    return base64.urlsafe_b64encode(signature).rstrip(b"=").decode("ascii")


def _build_service_entry(connector: ConnectorEntry) -> ConnectorServiceMapEntry:
    primary_header = connector.authentication.headers[0]

    auth_type = "none"
    header_name: Optional[str] = None
    if primary_header:
        header_name = primary_header.name
        if primary_header.name.lower() == "authorization" or primary_header.value.startswith("Bearer "):
            auth_type = "bearer"
        else:
            auth_type = "apiKey"

    metadata = {"brand": "brAInwav", **connector.metadata}
    quotas = _build_quota_budget(connector.quotas)
    headers = _merge_headers(connector.headers, connector.authentication.headers)

    return ConnectorServiceMapEntry(
        id=connector.id,
        version=connector.version,
        display_name=connector.display_name,
        endpoint=connector.endpoint,
        auth=ConnectorAuth(type=auth_type, header_name=header_name),
        scopes=list(connector.scopes),
        ttl_seconds=connector.ttl_seconds,
        enabled=connector.enabled,
        metadata=metadata,
        quotas=quotas,
        headers=headers,
        description=connector.description,
        tags=connector.tags,
    )


def _build_quota_budget(quotas: ConnectorQuota) -> Optional[ConnectorQuotaBudget]:
    data: Dict[str, int] = {}
    if quotas.per_minute is not None:
        data["perMinute"] = quotas.per_minute
    if quotas.per_hour is not None:
        data["perHour"] = quotas.per_hour
    if quotas.concurrent is not None:
        data["concurrent"] = quotas.concurrent

    return ConnectorQuotaBudget.model_validate(data) if data else None


def _merge_headers(
    extra_headers: Optional[Dict[str, str]],
    auth_headers: List[ConnectorAuthHeader],
) -> Optional[Dict[str, str]]:
    merged: Dict[str, str] = {}
    for header in auth_headers:
        merged[header.name] = header.value

    if extra_headers:
        merged.update(extra_headers)

    return merged or None
