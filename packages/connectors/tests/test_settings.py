from __future__ import annotations

import os

import pytest

from cortex_connectors.settings import Settings


def test_settings_from_env_requires_api_key(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    monkeypatch.setenv("CONNECTORS_SIGNATURE_KEY", "secret")
    monkeypatch.setenv("CONNECTORS_MANIFEST_PATH", str(tmp_path / "manifest.json"))
    monkeypatch.delenv("CONNECTORS_API_KEY", raising=False)
    monkeypatch.setenv("NO_AUTH", "false")
    with pytest.raises(RuntimeError):
        Settings.from_env()


def test_settings_from_env_allows_no_auth(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    monkeypatch.setenv("CONNECTORS_SIGNATURE_KEY", "secret")
    monkeypatch.setenv("CONNECTORS_MANIFEST_PATH", str(tmp_path / "manifest.json"))
    monkeypatch.setenv("NO_AUTH", "true")
    monkeypatch.delenv("CONNECTORS_API_KEY", raising=False)
    settings = Settings.from_env()
    assert settings.no_auth is True
