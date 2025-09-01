import pytest

from cortex_mlx.router import ModelRouter


@pytest.mark.timeout(10)
def test_router_basic_chat():
    router = ModelRouter()
    out = router.chat("ping")
    assert "adapter" in out and isinstance(out["text"], str)


def test_router_embed_and_rerank():
    router = ModelRouter()
    e = router.embed("hello")
    assert "embedding" in e and isinstance(e["embedding"], list)
    order = router.rerank("a", ["doc1", "long document 2", "tiny"])
    assert set(order["order"]) == {0, 1, 2}
