"""Tests for FastAPI app error branches and embedding normalization properties.

Covers:
- /embed validation errors: missing text, empty text, too long text
- /embeddings validation errors: missing list, empty list, bad element, length overflow
- Normalization property: generated embedding norm ~= 1 when normalize=True (sentence-transformers path)
"""

from __future__ import annotations

import json
import math
import os
import sys
from collections.abc import Iterator
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

# Ensure src path
ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "apps" / "cortex-py" / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))


@pytest.fixture(scope="function")
def fastapi_client() -> Iterator[TestClient]:  # type: ignore[no-untyped-def]
    os.environ["CORTEX_PY_FAST_TEST"] = "1"
    import importlib

    if "app" in sys.modules:
        del sys.modules["app"]
    app_mod = importlib.import_module("app")
    yield TestClient(app_mod.app)


def test_embed_missing_text(fastapi_client: TestClient) -> None:  # type: ignore[no-untyped-def]
    res = fastapi_client.post("/embed", json={})
    assert res.status_code == 422
    body = res.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_embed_empty_text(fastapi_client: TestClient) -> None:  # type: ignore[no-untyped-def]
    res = fastapi_client.post("/embed", json={"text": "   "})
    assert res.status_code == 422
    assert "must not be empty" in res.json()["error"]["message"]


def test_embed_too_long_text(
    fastapi_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setenv("EMBED_MAX_CHARS", "10")
    # Recreate app to apply new env var limit
    import importlib

    if "app" in sys.modules:
        del sys.modules["app"]
    app_mod = importlib.import_module("app")
    client = TestClient(app_mod.app)
    res = client.post("/embed", json={"text": "x" * 11})
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "TEXT_TOO_LONG"


def test_embeddings_missing_list(fastapi_client: TestClient) -> None:  # type: ignore[no-untyped-def]
    res = fastapi_client.post("/embeddings", json={})
    assert res.status_code == 422
    assert "texts field must be a non-empty list" in res.json()["error"]["message"]


def test_embeddings_empty_list(fastapi_client: TestClient) -> None:  # type: ignore[no-untyped-def]
    res = fastapi_client.post("/embeddings", json={"texts": []})
    assert res.status_code == 422
    assert "texts field must be a non-empty list" in res.json()["error"]["message"]


def test_embeddings_bad_element(fastapi_client: TestClient) -> None:  # type: ignore[no-untyped-def]
    res = fastapi_client.post("/embeddings", json={"texts": ["ok", 123]})
    assert res.status_code == 422
    body = res.json()
    # If Pydantic validation fires before route logic, FastAPI returns standard 'detail' structure.
    if "error" in body:
        assert "each text must be a non-empty string" in body["error"]["message"]
    else:
        # Standard validation error list present
        assert "detail" in body and isinstance(body["detail"], list)
        # Ensure at least one entry refers to type coercion / string issue
        joined = " ".join(json.dumps(entry) for entry in body["detail"])
        assert "str" in joined or "string" in joined


def test_embeddings_text_too_long(monkeypatch: pytest.MonkeyPatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setenv("CORTEX_PY_FAST_TEST", "1")
    monkeypatch.setenv("EMBED_MAX_CHARS", "5")
    import importlib

    if "app" in sys.modules:
        del sys.modules["app"]
    app_mod = importlib.import_module("app")
    client = TestClient(app_mod.app)
    res = client.post("/embeddings", json={"texts": ["hello", "world!"]})
    assert res.status_code == 422
    data = res.json()
    assert data["error"]["code"] == "TEXT_TOO_LONG"


def test_normalization_property_sentence_transformers(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:  # type: ignore[no-untyped-def]
    """Property-style check: embedding norm ~ 1 when normalize=True.

    We simulate sentence-transformers backend with a deterministic non-zero vector so
    normalization effect can be asserted.
    """
    # Prepare minimal JSON config
    cfg_path = tmp_path / "models.json"
    cfg_path.write_text(
        json.dumps(
            {
                "test-model": {
                    "path": "dummy/repo",
                    "dimensions": 12,
                    "context_length": 32,
                    "memory_gb": 0.01,
                }
            }
        ),
        encoding="utf-8",
    )
    # Disable fast test mode for real normalization path
    monkeypatch.delenv("CORTEX_PY_FAST_TEST", raising=False)
    from types import ModuleType

    # Ensure real sentence_transformers (if previously imported) is removed so our fake one is used.
    sys.modules.pop("sentence_transformers", None)
    fake_st_mod = ModuleType("sentence_transformers")

    class _FakeST:
        def __init__(self, *a, **k):  # type: ignore[no-untyped-def]
            pass

        def encode(self, text, convert_to_numpy=True, normalize_embeddings=True):  # type: ignore[no-untyped-def]
            # Return a deterministic ascending vector (non-normalized)
            arr = np.arange(12, dtype=float) + 1.0
            if convert_to_numpy:
                return arr / np.linalg.norm(arr) if normalize_embeddings else arr
            return arr.tolist()

    fake_st_mod.SentenceTransformer = _FakeST  # type: ignore[attr-defined]
    sys.modules["sentence_transformers"] = fake_st_mod

    # Force reload of embedding_generator so that module-level SentenceTransformer symbol
    # binds to our fake implementation instead of the real library (which would attempt
    # network/model downloads in offline mode). We load it directly from its source path
    # to avoid issues with the shimmed 'mlx' package lacking a real filesystem path.
    sys.modules.pop("mlx.embedding_generator", None)
    import importlib.util
    emb_path = SRC / "mlx" / "embedding_generator.py"
    spec = importlib.util.spec_from_file_location("mlx.embedding_generator", str(emb_path))
    assert spec and spec.loader, "Failed to build spec for embedding_generator"
    eg = importlib.util.module_from_spec(spec)
    sys.modules["mlx.embedding_generator"] = eg
    spec.loader.exec_module(eg)

    # Force capability flags for the sentence-transformers path
    if hasattr(eg, "MLX_AVAILABLE"):
        eg.MLX_AVAILABLE = False  # type: ignore[attr-defined]
    if hasattr(eg, "SENTENCE_TRANSFORMERS_AVAILABLE"):
        eg.SENTENCE_TRANSFORMERS_AVAILABLE = True  # type: ignore[attr-defined]

    # Obtain class from reloaded module
    generator_cls = eg.MLXEmbeddingGenerator  # type: ignore[attr-defined]

    gen = generator_cls("test-model", str(cfg_path))  # type: ignore[misc]
    emb = gen.generate_embedding("normalize me", normalize=True)
    norm = math.isclose(float(np.linalg.norm(np.array(emb))), 1.0, rel_tol=1e-6)
    assert norm, "Embedding not normalized to unit length"
    assert len(emb) == 12
