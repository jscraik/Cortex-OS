import importlib
import sys

import pytest


def reload_auth(monkeypatch, secret_file, env="development", key=None):
    monkeypatch.setenv("ENVIRONMENT", env)
    monkeypatch.setenv("JWT_SECRET_FILE", str(secret_file))
    if key is not None:
        monkeypatch.setenv("JWT_SECRET_KEY", key)
    else:
        monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    if "mcp.security.auth" in sys.modules:
        del sys.modules["mcp.security.auth"]
    return importlib.import_module("mcp.security.auth")


def test_secret_key_persists(tmp_path, monkeypatch):
    secret_path = tmp_path / "secret"
    auth = reload_auth(monkeypatch, secret_path)
    first = auth.SECRET_KEY
    auth = reload_auth(monkeypatch, secret_path)
    second = auth.SECRET_KEY
    assert first == second


def test_production_requires_env_key(tmp_path, monkeypatch):
    secret_path = tmp_path / "secret"
    with pytest.raises(RuntimeError):
        reload_auth(monkeypatch, secret_path, env="production")
