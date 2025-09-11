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
    assert "text must not be empty" in resp.json()["detail"]
    assert "empty text" in caplog.text.lower()
