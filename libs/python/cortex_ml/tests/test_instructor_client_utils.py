import asyncio
import math
import pathlib
import sys
from types import SimpleNamespace
from typing import Any

import pytest

# Attempt to import the submodule via package; add src path if running from monorepo root without install
try:  # pragma: no cover - import path resolution
    from cortex_ml import instructor_client as ic
except Exception:  # pragma: no cover - fallback path injection
    pkg_src = pathlib.Path(__file__).resolve().parents[2] / "src"
    if pkg_src.is_dir() and str(pkg_src) not in sys.path:
        sys.path.insert(0, str(pkg_src))
    try:
        from cortex_ml import instructor_client as ic  # type: ignore
    except Exception:  # Final fallback -> skip module tests
        pytest.skip(
            "cortex_ml.instructor_client not importable in test environment; skipping instructor utils tests.",
            allow_module_level=True,
        )


def _make_fake_client() -> tuple[Any, Any]:
    class FakeCreate:
        def __init__(self) -> None:
            self.called: bool = False
            self.kwargs: dict[str, Any] | None = None

        def create(self, **kwargs: Any) -> dict[str, Any]:
            self.called = True
            self.kwargs = kwargs
            return {"result": "ok", "kwargs": kwargs}

    create_fn = FakeCreate()

    class FakeCompletions:
        def __init__(self, create_impl: Any) -> None:
            self.create = create_impl

    class FakeChat:
        def __init__(self, completions: Any) -> None:
            self.completions = completions

    # Adapt test usage expecting attribute `.create` under `.chat.completions`
    return SimpleNamespace(chat=FakeChat(FakeCompletions(create_fn.create))), create_fn


def test_structured_chat_passes_through_and_defaults(monkeypatch: Any) -> None:
    # Use already imported module reference `ic`

    client, create_fn = _make_fake_client()
    messages = [{"role": "user", "content": "hi"}]

    res = ic.structured_chat(
        client,
        model="test-model",
        response_model=dict,  # dummy
        messages=messages,
    )

    assert res["result"] == "ok"
    assert create_fn.called is True
    assert create_fn.kwargs is not None  # defaults applied
    kwargs = create_fn.kwargs
    assert math.isclose(kwargs["temperature"], 0.0)
    assert kwargs["seed"] == 42
    assert kwargs["max_retries"] == 3
    assert create_fn.kwargs["model"] == "test-model"
    assert create_fn.kwargs["messages"] == messages


def test_astructured_chat_passes_through_and_defaults() -> None:
    # Use already imported module reference `ic`

    # Wrap the sync create in an async wrapper to simulate async client
    class AsyncCreateWrapper:
        def __init__(self) -> None:
            self.called: bool = False
            self.kwargs: dict[str, Any] | None = None

        async def create(
            self, **kwargs: Any
        ) -> dict[str, Any]:  # pragma: no cover - trivial
            self.called = True
            self.kwargs = kwargs
            return {"result": "ok", "kwargs": kwargs}

    create_fn = AsyncCreateWrapper()

    class FakeCompletions:
        def __init__(self, create_impl: Any) -> None:
            self.create = create_impl

    class FakeChat:
        def __init__(self, completions: Any) -> None:
            self.completions = completions

    fake_client = SimpleNamespace(chat=FakeChat(FakeCompletions(create_fn)))
    messages = [{"role": "user", "content": "hi"}]

    res = asyncio.run(
        ic.astructured_chat(
            fake_client,
            model="test-model",
            response_model=dict,
            messages=messages,
        )
    )

    assert res["result"] == "ok"
    assert create_fn.called is True
    assert create_fn.kwargs is not None
    akw = create_fn.kwargs
    assert math.isclose(akw["temperature"], 0.0)
    assert akw["seed"] == 42
    assert akw["max_retries"] == 3


def test_create_sync_instructor_uses_json_mode_when_available(monkeypatch: Any) -> None:
    # Use already imported module reference `ic`

    captured: dict[str, Any] = {}

    class DummyOpenAI:
        def __init__(self, base_url: str, api_key: str) -> None:
            captured["base_url"] = base_url
            captured["api_key"] = api_key

    class DummyInstructor:
        class Mode:
            JSON = "JSON_MODE"

        @staticmethod
        def from_openai(base: Any, mode: Any | None = None) -> str:
            captured["mode"] = mode
            captured["base"] = base
            return "CLIENT_SENTINEL"

    monkeypatch.setattr(ic, "OpenAI", DummyOpenAI)
    monkeypatch.setattr(ic, "instructor", DummyInstructor)

    client = ic.create_sync_instructor()
    assert client == "CLIENT_SENTINEL"
    assert captured["base_url"].endswith("/v1")
    assert captured["api_key"] == "ollama"
    # Ensure JSON mode is preferred when available
    assert captured["mode"] == "JSON_MODE"


def test_create_async_instructor_no_json_mode(monkeypatch: Any) -> None:
    # Use already imported module reference `ic`

    captured: dict[str, Any] = {"mode": "__unset__"}

    class DummyAsyncOpenAI:
        def __init__(self, base_url: str, api_key: str) -> None:
            captured["base_url"] = base_url
            captured["api_key"] = api_key

    class DummyInstructorNoJSON:
        class Mode:
            # No JSON attribute on purpose
            pass

        @staticmethod
        def from_openai(base: Any, mode: Any | None = None) -> str:
            captured["mode"] = mode
            captured["base"] = base
            return "ASYNC_CLIENT_SENTINEL"

    monkeypatch.setattr(ic, "AsyncOpenAI", DummyAsyncOpenAI)
    monkeypatch.setattr(ic, "instructor", DummyInstructorNoJSON)

    client = ic.create_async_instructor()
    assert client == "ASYNC_CLIENT_SENTINEL"
    assert captured["mode"] is None
    assert captured["api_key"] == "ollama"
