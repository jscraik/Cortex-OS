import importlib.util
from pathlib import Path

import pytest

# repo root (../../ from this file: tests/security/.. -> repo)
ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "packages" / "cortex-mcp" / "security" / "input_validation.py"


def _load_input_validation():
    spec = importlib.util.spec_from_file_location("input_validation", str(MODULE_PATH))
    assert spec and spec.loader, "Unable to load input_validation"
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[attr-defined]
    return mod


iv = _load_input_validation()


def test_validate_search_query_ok():
    assert iv.validate_search_query("hello") == "hello"


def test_validate_search_query_sql_injection():
    with pytest.raises(ValueError):
        iv.validate_search_query("'; DROP TABLE users; --")


def test_validate_resource_id_ok():
    assert iv.validate_resource_id("abc-123") == "abc-123"


def test_validate_resource_id_traversal():
    with pytest.raises(ValueError):
        iv.validate_resource_id("../etc/passwd")


def test_sanitize_output_html():
    out = iv.sanitize_output("<script>alert('x')</script>")
    assert "<script>" not in out
