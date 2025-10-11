from __future__ import annotations

from pathlib import Path

from cortex_connectors.registry import ConnectorRegistry
from cortex_connectors.signing import generate_service_map_signature


def test_registry_filters_enabled_connectors(manifest_file: Path) -> None:
    registry = ConnectorRegistry(manifest_file, "secret")
    enabled = registry.enabled()
    enabled_ids = {record.entry.id for record in enabled}
    assert enabled_ids == {"alpha", "wikidata"}

    wikidata = next(record for record in enabled if record.entry.id == "wikidata")
    tools = wikidata.entry.metadata.get("tools")
    assert tools == [
        {"name": "vector_search", "description": "Semantic entity and identifier lookup"},
        {"name": "sparql", "description": "Execute Wikidata SPARQL queries"},
    ]


def test_registry_service_map_signature(manifest_file: Path) -> None:
    registry = ConnectorRegistry(manifest_file, "secret")
    payload = registry.service_map()["payload"]
    expected_signature = generate_service_map_signature(payload, "secret")
    assert registry.service_map()["signature"] == expected_signature
