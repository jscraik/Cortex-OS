import os
import pytest

DEEPEVAL_ENABLED = os.getenv('DEEPEVAL', '0') == '1'

deepeval = pytest.importorskip('deepeval') if DEEPEVAL_ENABLED else None  # type: ignore


@pytest.mark.skipif(not DEEPEVAL_ENABLED, reason='Set DEEPEVAL=1 to run DeepEval scenarios')
def test_simple_relevance():
    from cortex_mlx.router import ModelRouter
    router = ModelRouter()
    out = router.chat('Summarize: Cortex OS is modular.')
    assert isinstance(out.get('text'), str)

