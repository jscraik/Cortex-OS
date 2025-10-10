from __future__ import annotations

import logging
import sys
import types
from types import SimpleNamespace
from typing import Any

import pytest

from cortex_mlx import router as router_mod
from cortex_mlx.router import ModelRouter, OllamaAdapter, RouterConfig

pytestmark = pytest.mark.router


class _FakeChatResponse:
    def __init__(self, text: str) -> None:
        self.response = text
        self.choices = [SimpleNamespace(message=SimpleNamespace(content=text))]


class _FakeEmbeddingResponse:
    def __init__(self, vector: list[float]) -> None:
        self.data = [SimpleNamespace(embedding=vector)]


class _FakeOpenAIClient:
    def __init__(self, factory: "_FakeOpenAIFactory") -> None:
        self._factory = factory
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create_chat))
        self.embeddings = SimpleNamespace(create=self._create_embedding)
        self.chat_calls: list[dict[str, Any]] = []

    def _create_chat(self, **kwargs: Any) -> _FakeChatResponse:
        self.chat_calls.append(kwargs)
        if self._factory.chat_exception is not None:
            raise self._factory.chat_exception
        return _FakeChatResponse(self._factory.chat_text)

    def _create_embedding(self, **kwargs: Any) -> _FakeEmbeddingResponse:
        return _FakeEmbeddingResponse(self._factory.embed_vector)


class _FakeOpenAIFactory:
    def __init__(self) -> None:
        self.chat_text = "ok"
        self.embed_vector = [0.01, 0.02]
        self.chat_exception: Exception | None = None
        self.instances: list[_FakeOpenAIClient] = []

    def __call__(self, *args: Any, **kwargs: Any) -> _FakeOpenAIClient:
        client = _FakeOpenAIClient(self)
        self.instances.append(client)
        return client


class _FakeInstructorModule:
    class Mode:
        JSON = "json"

    def __init__(self) -> None:
        self.raise_error: Exception | None = None
        self.response_text = "structured"

    def from_openai(self, _client: Any, _mode: Any) -> Any:
        module = self

        class _InstructorClient:
            def __init__(self) -> None:
                self.chat = SimpleNamespace(
                    completions=SimpleNamespace(create=self._create_chat)
                )

            def _create_chat(self, **_kwargs: Any) -> _FakeChatResponse:
                if module.raise_error is not None:
                    raise module.raise_error
                return _FakeChatResponse(module.response_text)

        return _InstructorClient()


@pytest.fixture
def fake_openai(monkeypatch: pytest.MonkeyPatch) -> _FakeOpenAIFactory:
    factory = _FakeOpenAIFactory()
    monkeypatch.setattr(router_mod, "OpenAI", factory)
    return factory


@pytest.fixture
def stub_ollama_health(monkeypatch: pytest.MonkeyPatch) -> None:
    class _OkResponse:
        status_code = 200

    monkeypatch.setattr(router_mod.httpx, "get", lambda *args, **kwargs: _OkResponse())


@pytest.fixture
def fake_instructor(monkeypatch: pytest.MonkeyPatch) -> _FakeInstructorModule:
    module = _FakeInstructorModule()
    monkeypatch.setattr(router_mod, "instructor", module)
    return module


def test_router_falls_back_to_ollama_when_mlx_unavailable(
    monkeypatch: pytest.MonkeyPatch,
    fake_openai: _FakeOpenAIFactory,
    stub_ollama_health: None,
    caplog: pytest.LogCaptureFixture,
) -> None:
    monkeypatch.setattr(router_mod, "instructor", None)
    fake_openai.chat_text = "ollama-ok"
    stub = types.ModuleType("mlx_lm")
    monkeypatch.setitem(sys.modules, "mlx_lm", stub)

    with caplog.at_level(logging.INFO):
        router = ModelRouter()
        result = router.chat("hello")

    assert result["adapter"] == "ollama"
    assert result["text"] == "ollama-ok"
    assert any("MLX adapter unavailable" in record.getMessage() for record in caplog.records)


def test_router_retries_and_uses_timeout() -> None:
    class FlakyAdapter:
        name = "flaky"

        def __init__(self) -> None:
            self.calls = 0
            self.last_timeout = 0.0

        def available(self) -> bool:
            return True

        def chat(self, prompt: str, timeout: float) -> str:
            self.calls += 1
            self.last_timeout = timeout
            raise TimeoutError("flaky failure")

        def embed(self, text: str, timeout: float) -> list[float]:  # pragma: no cover
            raise NotImplementedError

        def rerank(self, query: str, docs: list[str], timeout: float) -> list[int]:  # pragma: no cover
            raise NotImplementedError

    adapter = FlakyAdapter()
    config = RouterConfig(timeout_seconds=0.2, retries=2)
    router = ModelRouter(config=config, adapters=[adapter])

    with pytest.raises(RuntimeError, match="flaky failure"):
        router.chat("hi")

    assert adapter.calls == config.retries + 1
    assert adapter.last_timeout == pytest.approx(config.timeout_seconds)


def test_instructor_json_error_propagates(
    fake_openai: _FakeOpenAIFactory,
    fake_instructor: _FakeInstructorModule,
    stub_ollama_health: None,
) -> None:
    fake_instructor.raise_error = ValueError("JSON decode failed")
    router = ModelRouter(config=RouterConfig(retries=0), adapters=[OllamaAdapter()])

    with pytest.raises(RuntimeError, match="JSON decode failed"):
        router.chat("structured")
