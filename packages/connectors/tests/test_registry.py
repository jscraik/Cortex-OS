from __future__ import annotations

from pathlib import Path

from cortex_connectors.registry import ConnectorRegistry
from cortex_connectors.signing import generate_service_map_signature


def test_registry_filters_enabled_connectors(manifest_file: Path) -> None:
    registry = ConnectorRegistry(manifest_file, "secret")
    enabled = registry.enabled()
    assert len(enabled) == 1
    assert enabled[0].entry.id == "alpha"


def test_registry_service_map_signature(manifest_file: Path) -> None:
    registry = ConnectorRegistry(manifest_file, "secret")
    payload = registry.service_map()["payload"]
    expected_signature = generate_service_map_signature(payload, "secret")
    assert registry.service_map()["signature"] == expected_signature
