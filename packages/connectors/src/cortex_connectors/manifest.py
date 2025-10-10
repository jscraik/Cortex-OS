"""Utilities for loading and signing the connectors manifest."""

from __future__ import annotations

import json
import hmac
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from typing import Iterable, List, Optional

from pydantic import ValidationError

from .models import (
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
        ConnectorServiceMapEntry(
            id=entry.id,
            version=entry.version,
            status=entry.status,
            scopes=list(entry.scopes),
            quotas=entry.quotas,
            ttl_seconds=entry.ttl_seconds,
        )
        for entry in sorted(manifest.connectors, key=lambda item: item.id)
    ]

    return ConnectorServiceMap(
        schema_version=manifest.schema_version,
        generated_at=manifest.generated_at,
        connectors=connectors,
    )


def sign_connector_service_map(service_map: ConnectorServiceMap, secret: str) -> str:
    """Generate an HMAC signature for the service map."""

    if not secret:
        msg = "CONNECTORS_SIGNATURE_KEY is required to sign the connectors service map"
        raise ValueError(msg)

    payload = json.dumps(
        service_map.model_dump(mode="json", exclude_none=True),
        separators=(",", ":"),
    ).encode("utf-8")
    return hmac.new(secret.encode("utf-8"), payload, sha256).hexdigest()
