import importlib.util
import shutil
from pathlib import Path

import pytest


def _load_app_module() -> None:
    spec = importlib.util.spec_from_file_location(
        "tmp_app", Path(__file__).resolve().parents[1] / "src/app.py"
    )
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)  # type: ignore[union-attr]


def test_requires_model_name_env(monkeypatch) -> None:
    monkeypatch.delenv("MODEL_NAME", raising=False)
    with pytest.raises(RuntimeError):
        _load_app_module()


def test_requires_git_binary(monkeypatch) -> None:
    monkeypatch.setenv("MODEL_NAME", "test")
    monkeypatch.setattr(shutil, "which", lambda _: None)
    with pytest.raises(RuntimeError):
        _load_app_module()
