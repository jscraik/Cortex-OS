import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "apps" / "cortex-py" / "src"
if str(SRC) not in sys.path:  # pragma: no cover - path setup deterministic
    sys.path.insert(0, str(SRC))

import app as cortex_app  # type: ignore


def test_dummy_generator_generate_embedding_invalid_input() -> None:
    """Ensure DummyEmbeddingGenerator raises on invalid input to cover defensive branch."""
    prev = os.environ.get("CORTEX_PY_FAST_TEST")
    os.environ["CORTEX_PY_FAST_TEST"] = "1"
    gen = cortex_app.DummyEmbeddingGenerator(8)
    with pytest.raises(ValueError):
        gen.generate_embedding("")  # empty string invalid
    if prev is not None:
        os.environ["CORTEX_PY_FAST_TEST"] = prev
    else:  # pragma: no cover - cleanup branch
        del os.environ["CORTEX_PY_FAST_TEST"]
