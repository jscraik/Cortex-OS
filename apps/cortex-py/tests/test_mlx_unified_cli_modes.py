"""CLI coverage tests for ``mlx_unified.main`` with lightweight fake backend.

We patch ``MLXUnified`` to:
 - Skip heavy model loading
 - Provide deterministic outputs per mode
 - Allow exercising all CLI argument branches without external deps
"""

from __future__ import annotations

import importlib
import json
import os
import sys
from collections.abc import Generator, Iterable
from pathlib import Path
from typing import Any

import pytest

SRC_ROOT = Path(__file__).resolve().parents[2] / "src"
sys.path.insert(0, str(SRC_ROOT))  # Ensure src on path for import


@pytest.fixture(autouse=True)
def env_isolation() -> Generator[None, None, None]:
    """Isolate environment variables between tests."""
    original_env = dict(os.environ)
    yield
    os.environ.clear()
    os.environ.update(original_env)


@pytest.fixture(autouse=True)
def patch_unified(monkeypatch: pytest.MonkeyPatch) -> Generator[None, None, None]:
    from mlx import mlx_unified as real_module  # type: ignore

    class FakeUnified:
        def __init__(self, model_name: str, model_path: str | None = None):
            self.model_name = model_name
            self.model_path = model_path or model_name
            if "rerank" in model_name:
                self.model_type = "reranking"
            elif "chat" in model_name:
                self.model_type = "chat"
            else:
                self.model_type = "embedding"
            # Pretend capabilities
            self.mlx_available = True
            self.torch_available = True
            self.sentence_transformers_available = True
            self.model = object()
            self.tokenizer = object()

        def load_model(self) -> None:
            return None

        def generate_embedding(self, text: str) -> list[float]:
            return [0.0, 1.0, 2.0]

        def generate_embeddings(self, texts: Iterable[str]) -> list[list[float]]:
            return [[0.0, 1.0, 2.0] for _ in texts]

        def generate_chat(
            self,
            messages: list[dict[str, str]],
            max_tokens: int | None = None,
            temperature: float | None = None,
        ) -> dict[str, Any]:
            return {
                "content": "ok",
                "usage": {
                    "prompt_tokens": 1,
                    "completion_tokens": 1,
                    "total_tokens": 2,
                },
            }

        def generate_reranking(
            self, query: str, documents: list[str]
        ) -> list[dict[str, float | int]]:
            return [
                {"index": i, "score": 1.0 - (i * 0.1)}
                for i, _doc in enumerate(documents)
            ]

    monkeypatch.setattr(real_module, "MLXUnified", FakeUnified)
    yield


def run_cli(args: list[str]) -> None:
    module = importlib.import_module("mlx.mlx_unified")
    argv_backup = sys.argv[:]
    sys.argv = ["mlx_unified.py", *args]
    try:
        # main prints JSON when --json-only flag provided
        # Capture via redirecting stdout by pytest capsys in callers
        module.main()
    finally:
        sys.argv = argv_backup


def test_cli_embedding_mode(capsys: pytest.CaptureFixture[str]) -> None:
    run_cli(["--model", "test-embedding", "--embedding-mode", "hello", "--json-only"])
    data: Any = json.loads(capsys.readouterr().out.strip())
    assert isinstance(data, list) and len(data) == 1


def test_cli_batch_embedding_mode(capsys: pytest.CaptureFixture[str]) -> None:
    run_cli(
        ["--model", "test-embedding", "--batch-embedding-mode", "a", "b", "--json-only"]
    )
    data: Any = json.loads(capsys.readouterr().out.strip())
    assert isinstance(data, list) and len(data) == 2


def test_cli_chat_mode_json_messages(capsys: pytest.CaptureFixture[str]) -> None:
    messages = json.dumps([{"role": "user", "content": "hi"}])
    run_cli(["--model", "test-chat", "--chat-mode", messages, "--json-only"])
    data: dict[str, Any] = json.loads(capsys.readouterr().out.strip())
    assert data["content"] == "ok"


def test_cli_chat_mode_prompt_fallback(capsys: pytest.CaptureFixture[str]) -> None:
    # Provide plain words (json parse should fail -> fallback prompt join)
    run_cli(["--model", "test-chat", "--chat-mode", "user", "hello", "--json-only"])
    data: dict[str, Any] = json.loads(capsys.readouterr().out.strip())
    assert data["content"] == "ok"


def test_cli_rerank_mode(capsys: pytest.CaptureFixture[str]) -> None:
    docs_json = json.dumps(["d1", "d2"])  # JSON path
    run_cli(
        ["--model", "test-rerank", "--rerank-mode", "query", docs_json, "--json-only"]
    )
    data: dict[str, Any] = json.loads(capsys.readouterr().out.strip())
    assert "scores" in data and len(data["scores"]) == 2


def test_cli_default_fallback_no_mode(capsys: pytest.CaptureFixture[str]) -> None:
    # No mode flags & no input -> embedding fallback path uses FALLBACK_TEST_TEXT
    run_cli(["--model", "test-embedding", "--json-only"])
    data: Any = json.loads(capsys.readouterr().out.strip())
    assert isinstance(data, list) and len(data) == 1
