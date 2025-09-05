import pytest

from cortex_mlx.router import ModelRouter


class DummyAdapter:
    """Minimal adapter for tests."""

    name = "dummy"

    def available(self) -> bool:  # pragma: no cover - trivial
        return True

    def chat(self, prompt: str, timeout: float) -> str:  # pragma: no cover - trivial
        return "pong"

    def embed(self, text: str, timeout: float) -> list[float]:
        return [1.0, 0.0]

    def rerank(self, query: str, docs: list[str], timeout: float) -> list[int]:
        return list(range(len(docs)))


def make_router() -> ModelRouter:
    return ModelRouter(adapters=[DummyAdapter()])


def test_router_basic_chat():
    router = make_router()
    out = router.chat("ping")
    assert out["adapter"] == "dummy" and out["text"] == "pong"


def test_router_embed_and_rerank():
    router = make_router()
    e = router.embed("hello")
    assert e["adapter"] == "dummy" and e["embedding"] == [1.0, 0.0]
    order = router.rerank("a", ["doc1", "long document 2", "tiny"])
    assert order["adapter"] == "dummy" and order["order"] == [0, 1, 2]
