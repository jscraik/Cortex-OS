"""Coverage tests for FastAPI application defined in app.py.

Exercised endpoints:
- POST /embed (success + validation errors + length error)
- POST /embeddings (success + various validation errors + length error)
- GET /model-info (lazy dummy info path under FAST_TEST)
- GET /health (backend availability structure)

Environment ensures FAST_TEST dummy generator is used to avoid heavy model init.
"""

from __future__ import annotations

import importlib
import os
import sys
from collections.abc import Generator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def env_isolation() -> Generator[None, None, None]:
    """Isolate environment variables and module state between tests."""
    original_env = dict(os.environ)
    # Clear any app modules from cache to prevent state leakage
    modules_to_clear = [
        k for k in sys.modules if k.startswith("app") or k.startswith("mlx")
    ]
    for mod in modules_to_clear:
        if mod in sys.modules:
            del sys.modules[mod]
    yield
    os.environ.clear()
    os.environ.update(original_env)
    # Clean up modules again after test
    modules_to_clear = [
        k for k in sys.modules if k.startswith("app") or k.startswith("mlx")
    ]
    for mod in modules_to_clear:
        if mod in sys.modules:
            del sys.modules[mod]


@pytest.fixture(scope="function")
def test_client() -> Any:
    # Force fast test mode and small max char limit for boundary tests
    os.environ["CORTEX_PY_FAST_TEST"] = "1"
    os.environ["EMBED_MAX_CHARS"] = "12"  # small limit to trigger length validation
    # Ensure src is on path for import
    src_root = Path(__file__).resolve().parents[2] / "src"
    if str(src_root) not in sys.path:
        sys.path.insert(0, str(src_root))
    # Import app module after env setup
    app_mod = importlib.import_module("app")
    client = TestClient(app_mod.create_app())
    return client


def test_embed_success(test_client: TestClient) -> None:
    resp = test_client.post("/embed", json={"text": "hello"})
    assert resp.status_code == 200
    data = resp.json()
    assert "embedding" in data and isinstance(data["embedding"], list)


def test_embed_missing_text(test_client: TestClient) -> None:
    resp = test_client.post("/embed", json={})
    assert resp.status_code == 422
    data = resp.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_embed_empty_text(test_client: TestClient) -> None:
    resp = test_client.post("/embed", json={"text": "   "})
    assert resp.status_code == 422
    assert resp.json()["error"]["message"].startswith("text must not be empty")


def test_embed_text_too_long(test_client: TestClient) -> None:
    resp = test_client.post("/embed", json={"text": "x" * 20})  # exceeds 12
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "TEXT_TOO_LONG"


def test_embeddings_success(test_client: TestClient) -> None:
    resp = test_client.post(
        "/embeddings", json={"texts": ["a", "b"], "normalize": True}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "embeddings" in data and len(data["embeddings"]) == 2


def test_embeddings_missing_texts(test_client: TestClient) -> None:
    resp = test_client.post("/embeddings", json={})
    assert resp.status_code == 422
    assert resp.json()["error"]["message"].startswith("texts field must be")


def test_embeddings_empty_list(test_client: TestClient) -> None:
    resp = test_client.post("/embeddings", json={"texts": []})
    assert resp.status_code == 422


def test_embeddings_invalid_entry(test_client: TestClient) -> None:
    resp = test_client.post("/embeddings", json={"texts": ["ok", 5]})
    body = resp.json()
    assert resp.status_code == 422, body
    # Depending on parsing order, Pydantic may raise before custom validation loop.
    # Accept either our wrapped error shape or Pydantic's default detail list.
    if "error" in body:
        assert body["error"]["code"] == "VALIDATION_ERROR"
    else:
        assert "detail" in body
        # Ensure one of the messages references valid string type
        msgs = [d.get("msg", "") for d in body.get("detail", [])]
        assert any("valid string" in m for m in msgs)


def test_embeddings_text_too_long(test_client: TestClient) -> None:
    resp = test_client.post("/embeddings", json={"texts": ["a" * 30]})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "TEXT_TOO_LONG"


def test_model_info_lazy(test_client: TestClient) -> None:
    resp = test_client.get("/model-info")
    assert resp.status_code == 200
    info = resp.json()
    # Under fast test we expect dummy fast model naming
    assert info["model_name"] in {"dummy-fast-test", "lazy-uninitialized"}
    assert info["model_loaded"] in (False, True)


def test_health(test_client: TestClient) -> None:
    resp = test_client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "backends_available" in data
