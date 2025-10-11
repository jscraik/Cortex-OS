"""Utilities for loading and signing the connectors manifest."""

from __future__ import annotations

import json
import hmac
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Iterable, List, Optional

from pydantic import ValidationError

from .models import ConnectorServiceMapPayload, ConnectorsManifest

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


def build_connector_service_map(manifest: ConnectorsManifest) -> ConnectorServiceMapPayload:
    """Create the ASBR-facing service map from the manifest."""

    generated_at = (
        manifest.generated_at
        if manifest.generated_at is not None
        else datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    )

    connectors: List[ConnectorServiceMapEntry] = []
    for entry in sorted(manifest.connectors, key=lambda item: item.id):
        is_enabled = entry.enabled
        if entry.status is not None:
            is_enabled = entry.status != "disabled" and entry.enabled

        connector = ConnectorServiceMapEntry(
            id=entry.id,
            version=entry.version,
            display_name=entry.display_name,
            endpoint=entry.endpoint,
            auth=entry.auth,
            scopes=list(entry.scopes),
            ttl_seconds=entry.ttl_seconds,
            enabled=is_enabled,
            metadata=dict(entry.metadata),
            description=entry.description,
            tags=list(entry.tags) if entry.tags else None,
        )

        if entry.quotas:
            connector.quotas = dict(entry.quotas)

        if entry.timeouts:
            connector.timeouts = dict(entry.timeouts)

        connectors.append(connector)

    min_connector_ttl = min((connector.ttl_seconds for connector in connectors), default=1)
    ttl_seconds = max(manifest.ttl_seconds or min_connector_ttl, 1)

    return ConnectorServiceMap(
        id=manifest.id,
        generated_at=generated_at,
        ttl_seconds=ttl_seconds,
        connectors=connectors,
    )
    return manifest.service_map_payload()


def sign_connector_service_map(service_map: ConnectorServiceMapPayload, secret: str) -> str:
    """Generate an HMAC signature for the service map."""

    if not secret:
        msg = "CONNECTORS_SIGNATURE_KEY is required to sign the connectors service map"
        raise ValueError(msg)

    payload = json.dumps(
        service_map.model_dump(mode="json", by_alias=True, exclude_none=True),
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return hmac.new(secret.encode("utf-8"), payload, sha256).hexdigest()
