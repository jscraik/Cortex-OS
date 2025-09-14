import importlib.util
import shutil
from importlib import util as importlib_util
from pathlib import Path

import pytest

def _safe_has_module(name: str) -> bool:
    try:
        spec = importlib_util.find_spec(name)
    except ValueError:
        # Some shimmed modules may have __spec__ = None and raise ValueError
        return False
    return spec is not None


INSTRUCTOR_AVAILABLE = _safe_has_module("instructor")
MLX_AVAILABLE = _safe_has_module("mlx")
if not (INSTRUCTOR_AVAILABLE and MLX_AVAILABLE):  # pragma: no cover
    pytest.skip(
        "'instructor' or 'mlx' dependency not installed (or shim without spec); skipping config tests.",
        allow_module_level=True,
    )


def _load_app_module() -> None:
    spec = importlib.util.spec_from_file_location(
        "tmp_app", Path(__file__).resolve().parents[1] / "src/app.py"
    )
    assert spec is not None, "spec_from_file_location returned None"
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None, "spec.loader is None"
    # The loader type is dynamic in importlib; ignore for mypy strict
    spec.loader.exec_module(module)


def test_requires_model_name_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("MODEL_NAME", raising=False)
    with pytest.raises(RuntimeError):
        _load_app_module()


def test_requires_git_binary(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MODEL_NAME", "test")

    def _fake_which(command: str) -> None:
        return None

    monkeypatch.setattr(shutil, "which", _fake_which)
    with pytest.raises(RuntimeError):
        _load_app_module()
