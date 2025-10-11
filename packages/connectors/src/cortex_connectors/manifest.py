"""Utilities for loading and signing the connectors manifest."""

from __future__ import annotations

import base64
import json
import hmac
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from typing import Iterable, List, Optional

from pydantic import ValidationError

from .models import (
    ConnectorServiceMap,
    ConnectorServiceMapPayload,
    ConnectorsManifest,
    build_service_map_payload,
)
from .schema import ManifestSchemaError, validate_manifest_document

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


def _candidate_paths(path: Optional[str | Path]) -> Iterable[Path]:
    """Yield unique candidate manifest paths in priority order."""

    if path:
        yield Path(path).expanduser()
        return

    candidates: List[Path] = [CWD_MANIFEST_PATH, FALLBACK_MANIFEST_PATH]

    seen: set[Path] = set()
    for candidate in candidates:
        resolved = candidate.expanduser()
        if resolved in seen:
            continue
        seen.add(resolved)
        yield resolved


def load_connectors_manifest(manifest_path: Optional[str | Path] = None) -> ConnectorsManifest:
    """Load and validate a connectors manifest from disk."""

    attempts: List[ManifestLoadAttempt] = []

    for candidate in _candidate_paths(manifest_path):
        try:
            raw = candidate.read_text(encoding="utf-8")
            payload = json.loads(raw)
            validate_manifest_document(payload)
            return ConnectorsManifest.model_validate(payload)
        except (
            FileNotFoundError,
            PermissionError,
            json.JSONDecodeError,
            ValidationError,
            ManifestSchemaError,
        ) as exc:
            attempts.append(ManifestLoadAttempt(path=candidate, error=exc))
        except Exception as exc:  # pragma: no cover - defensive
            attempts.append(ManifestLoadAttempt(path=candidate, error=exc))

    raise ConnectorsManifestError(
        "Unable to load connectors manifest from configured locations",
        attempts,
    )


def build_connector_service_map(manifest: ConnectorsManifest) -> ConnectorServiceMapPayload:
    """Create the unsigned service-map payload from a validated manifest."""

    return build_service_map_payload(manifest)


def sign_connector_service_map(service_map: ConnectorServiceMapPayload, secret: str) -> str:
    """Generate a base64url encoded HMAC signature for the service map."""

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


def attach_signature(payload: ConnectorServiceMapPayload, signature: str) -> ConnectorServiceMap:
    """Attach the computed signature to a service-map payload."""

    return ConnectorServiceMap.model_validate(
        {**payload.model_dump(mode="json", by_alias=True, exclude_none=True), "signature": signature}
    )


__all__ = [
    "ManifestLoadAttempt",
    "ConnectorsManifestError",
    "load_connectors_manifest",
    "build_connector_service_map",
    "sign_connector_service_map",
    "attach_signature",
]
