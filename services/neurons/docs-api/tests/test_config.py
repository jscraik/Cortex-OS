import importlib.util
from pathlib import Path

import pytest
from pydantic import ValidationError


def test_missing_database_url(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    spec = importlib.util.spec_from_file_location(
        "tmp_config", Path(__file__).resolve().parents[1] / "src/core/config.py"
    )
    module = importlib.util.module_from_spec(spec)
    with pytest.raises(ValidationError):
        assert spec.loader is not None
        spec.loader.exec_module(module)  # type: ignore[union-attr]
