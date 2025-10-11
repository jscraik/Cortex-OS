"""Registry that hydrates connectors from the manifest."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from prometheus_client import Gauge

from .manifest import build_connector_service_map, load_connectors_manifest, sign_connector_service_map
from .models import BRAND, ConnectorManifestEntry, ConnectorsManifest, determine_enabled

_CONNECTOR_GAUGE = Gauge(
    "brainwav_mcp_connector_proxy_up",
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
        self._gauge_cache: Dict[str, int] = {}

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
        manifest = self._manifest
        if manifest is None:
            return

        current_ids = {connector.id for connector in manifest.connectors}
        stale_ids = set(self._gauge_cache) - current_ids

        for connector_id in stale_ids:
            try:
                _CONNECTOR_GAUGE.remove(connector_id)
            except KeyError:
                pass
            finally:
                self._gauge_cache.pop(connector_id, None)

        for connector in manifest.connectors:
            status = 1 if determine_enabled(connector) else 0
            if self._gauge_cache.get(connector.id) == status:
                continue
            _CONNECTOR_GAUGE.labels(connector.id).set(status)
            self._gauge_cache[connector.id] = status

    def records(self) -> Iterable[ConnectorRecord]:
        return (
            ConnectorRecord(entry=connector, enabled=determine_enabled(connector))
            for connector in self.manifest.connectors
        )

    def enabled(self) -> List[ConnectorRecord]:
        return [record for record in self.records() if record.enabled]

    def service_map(self) -> Dict[str, object]:
        payload = build_connector_service_map(self.manifest)
        signature = sign_connector_service_map(payload, self._signature_key)
        payload_dict = payload.model_dump(by_alias=True, mode="json", exclude_none=True)
        metadata = payload_dict.setdefault("metadata", {"brand": BRAND})
        if "brand" not in metadata:
            metadata["brand"] = BRAND
        metadata["count"] = len(payload_dict.get("connectors", []))
        return {
            "payload": payload_dict,
            "signature": signature,
        }


__all__ = ["ConnectorRegistry", "ConnectorRecord"]
