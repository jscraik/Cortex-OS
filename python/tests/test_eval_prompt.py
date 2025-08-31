import pytest

deepeval = pytest.importorskip("deepeval")


def test_dummy_eval():
    # Placeholder to wire DeepEval into CI without external calls
    assert 1 + 1 == 2
