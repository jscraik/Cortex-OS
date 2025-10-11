"""Registry that hydrates connectors from the manifest."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from prometheus_client import Gauge

from .manifest import load_connectors_manifest
from .models import ConnectorManifestEntry, ConnectorsManifest
from .signing import generate_service_map_signature

_CONNECTOR_GAUGE = Gauge(
    "brAInwav_mcp_connector_proxy_up",
    "Connector availability proxy state",
    ["connector"],
)


@dataclass
class ConnectorRecord:
    """Runtime view of a connector entry."""

    entry: ConnectorManifestEntry
    enabled: bool


class ConnectorRegistry:
    """Manifest-backed registry that powers HTTP + SSE routes."""

    def __init__(self, manifest_path: Path, signature_key: str) -> None:
        self._manifest_path = manifest_path
        self._signature_key = signature_key
        self._manifest: Optional[ConnectorsManifest] = None

    @property
    def manifest(self) -> ConnectorsManifest:
        if self._manifest is None:
            self._manifest = load_connectors_manifest(self._manifest_path)
            self._update_metrics()
        return self._manifest

    def refresh(self) -> None:
        self._manifest = load_connectors_manifest(self._manifest_path)
        self._update_metrics()

    def _update_metrics(self) -> None:
        for connector in self.manifest.connectors:
            _CONNECTOR_GAUGE.labels(connector.id).set(1 if connector.status == "enabled" else 0)

    def records(self) -> Iterable[ConnectorRecord]:
        return (
            ConnectorRecord(entry=connector, enabled=connector.status == "enabled")
            for connector in self.manifest.connectors
        )

    def enabled(self) -> List[ConnectorRecord]:
        return [record for record in self.records() if record.enabled]

    def service_map(self) -> Dict[str, object]:
        payload = self.manifest.service_map_payload()
        signature = generate_service_map_signature(
            payload.model_dump(mode="json", by_alias=True, exclude_none=True),
            self._signature_key,
        )
        return {
            "payload": payload.model_dump(mode="json", by_alias=True, exclude_none=True),
            "signature": signature,
        }


__all__ = ["ConnectorRegistry", "ConnectorRecord"]
