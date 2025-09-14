import importlib.util
from pathlib import Path

from fastapi.testclient import TestClient

repo_root = Path(__file__).resolve().parents[3]
module_path = repo_root / "apps" / "cortex-py" / "src" / "app.py"
import sys

sys.path.insert(0, str(module_path.parent))
spec = importlib.util.spec_from_file_location("cortex_py_app", str(module_path))
app_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app_mod)
create_app = app_mod.create_app


class StubGen:
    def generate_embedding(self, text: str):
        return [1.0]


def test_app_allows_stub_generator():
    app = create_app(generator=StubGen())
    client = TestClient(app)
    resp = client.post("/embed", json={"text": "hi"})
    assert resp.status_code == 200
    assert resp.json() == {"embedding": [1.0]}


def test_embed_empty_text_logs_error(caplog):
    app = create_app(generator=StubGen())
    client = TestClient(app)
    with caplog.at_level("ERROR"):
        resp = client.post("/embed", json={"text": ""})
    assert resp.status_code == 422
    body = resp.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "empty" in body["error"]["message"].lower()
    assert "empty" in caplog.text.lower()


def test_embed_whitespace_only(caplog):
    app = create_app(generator=StubGen())
    client = TestClient(app)
    with caplog.at_level("ERROR"):
        resp = client.post("/embed", json={"text": "   \n\t"})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


def test_embed_length_limit(monkeypatch):
    monkeypatch.setenv("EMBED_MAX_CHARS", "10")
    app = create_app(generator=StubGen())
    client = TestClient(app)
    resp = client.post("/embed", json={"text": "a" * 11})
    assert resp.status_code == 422
    body = resp.json()
    assert body["error"]["code"] == "TEXT_TOO_LONG"
    assert "max length" in body["error"]["message"].lower()


def test_lazy_generator_uninitialized_info():
    # Import app fresh with FAST_TEST disabled so LazyEmbeddingGenerator path is taken
    import importlib
    import os
    import sys

    os.environ.pop("CORTEX_PY_FAST_TEST", None)
    if "app" in sys.modules:
        del sys.modules["app"]
    app_module = importlib.import_module("app")
    # Access model-info before any embedding call triggers initialization
    info = app_module.app.embedding_generator.get_model_info()  # type: ignore[attr-defined]
    assert info["model_loaded"] is False
    assert info["model_name"] == "lazy-uninitialized"
