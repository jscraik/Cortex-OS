import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))
from app import _model_inference


def test_cache_hits() -> None:
    _model_inference.cache_clear()
    _model_inference("hello")
    first_hits = _model_inference.cache_info().hits
    _model_inference("hello")
    assert _model_inference.cache_info().hits == first_hits + 1
