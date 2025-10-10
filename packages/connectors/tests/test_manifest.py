from __future__ import annotations

from pathlib import Path

import pytest

from cortex_connectors.manifest import ConnectorManifest


def test_manifest_loads_enabled_entries(manifest_file: Path) -> None:
    manifest = ConnectorManifest.load(manifest_file)
    enabled = list(manifest.enabled_connectors())
    assert len(enabled) == 1
    assert enabled[0].id == "alpha"

    payload = manifest.service_map_payload()
    assert payload["metadata"]["count"] == 1
    assert payload["connectors"][0]["id"] == "alpha"


def test_manifest_invalid_json(tmp_path: Path) -> None:
    path = tmp_path / "bad.json"
    path.write_text("not json", encoding="utf-8")
    with pytest.raises(ValueError):
        ConnectorManifest.load(path)


def test_manifest_missing_file(tmp_path: Path) -> None:
    path = tmp_path / "missing.json"
    with pytest.raises(FileNotFoundError):
        ConnectorManifest.load(path)
