from __future__ import annotations

import json
from pathlib import Path

import pytest

from cortex_connectors import cli


def test_cli_service_map_plain_output(
    monkeypatch: pytest.MonkeyPatch, manifest_file: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setenv("CONNECTORS_SIGNATURE_KEY", "secret")
    monkeypatch.setenv("CONNECTORS_MANIFEST_PATH", str(manifest_file))
    monkeypatch.setenv("CONNECTORS_API_KEY", "key")
    monkeypatch.setenv("NO_AUTH", "true")
    monkeypatch.setenv("LOG_LEVEL", "info")
    monkeypatch.delenv("APPS_BUNDLE_DIR", raising=False)
    monkeypatch.delenv("ENABLE_PROMETHEUS", raising=False)

    exit_code = cli.main(["service-map", "--plain"])
    captured = capsys.readouterr().out.strip()
    assert exit_code == 0
    data = json.loads(captured)
    assert "signature" in data


def test_cli_unknown_command(monkeypatch: pytest.MonkeyPatch, manifest_file: Path) -> None:
    monkeypatch.setenv("CONNECTORS_SIGNATURE_KEY", "secret")
    monkeypatch.setenv("CONNECTORS_MANIFEST_PATH", str(manifest_file))
    monkeypatch.setenv("NO_AUTH", "true")
    monkeypatch.setenv("CONNECTORS_API_KEY", "key")

    with pytest.raises(SystemExit):
        cli.main(["unknown"])  # type: ignore[arg-type]
