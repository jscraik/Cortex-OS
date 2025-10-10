from __future__ import annotations

from pathlib import Path
from typing import Dict

import pytest

from pydantic import BaseModel

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
    payload = registry.service_map()
    expected_signature = generate_service_map_signature(
        {k: v for k, v in payload.items() if k != "signature"},
        "secret",
    )
    assert payload["signature"] == expected_signature


def test_registry_builds_instructor_proxy(manifest_file: Path, monkeypatch) -> None:
    registry = ConnectorRegistry(manifest_file, "secret")

    class EchoResponse(BaseModel):
        message: str

    captured: Dict[str, object] = {}

    def fake_post(url: str, *, json: Dict[str, object], headers: Dict[str, str], timeout):
        captured["url"] = url
        captured["json"] = json
        captured["headers"] = headers

        class _Response:
            def raise_for_status(self) -> None:
                return None

            def json(self) -> Dict[str, object]:
                return {"message": json.get("message", "")}

        return _Response()

    monkeypatch.setattr("httpx.post", fake_post)

    proxy = registry.get_instructor_proxy("alpha")
    result = proxy.invoke({"message": "hello"}, EchoResponse)

    assert result.message == "hello"
    assert captured["url"] == "https://alpha.example/connect"
    assert captured["headers"]["Authorization"].startswith("Bearer")


def test_registry_rejects_disabled_connector_proxy(manifest_file: Path) -> None:
    registry = ConnectorRegistry(manifest_file, "secret")
    with pytest.raises(ValueError):
        registry.get_instructor_proxy("beta")
