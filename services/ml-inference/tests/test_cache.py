import pytest

try:  # pragma: no cover - optional dependency guard
    from app import _model_inference  # type: ignore
except Exception as import_err:  # pragma: no cover
    pytest.skip(f"ml-inference deps unavailable: {import_err}", allow_module_level=True)


def test_cache_hits() -> None:
    _model_inference.cache_clear()
    _model_inference("hello")
    first_hits = _model_inference.cache_info().hits
    _model_inference("hello")
    assert _model_inference.cache_info().hits == first_hits + 1
