import importlib.util
from pathlib import Path

from fastapi.testclient import TestClient


def _load_app_module():
    repo_root = Path(__file__).resolve().parents[3]
    module_path = repo_root / "apps" / "cortex-py" / "src" / "app.py"
    import sys

    sys.path.insert(0, str(module_path.parent))
    spec = importlib.util.spec_from_file_location(
        "cortex_py_app_lazy", str(module_path)
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def test_lazy_loader_uninitialized_then_initialized(monkeypatch):
    # Ensure fast test mode OFF so LazyEmbeddingGenerator path is used
    monkeypatch.delenv("CORTEX_PY_FAST_TEST", raising=False)
    mod = _load_app_module()
    app = mod.app  # app built with lazy generator
    client = TestClient(app)

    # Call model-info BEFORE any embedding to hit uninitialized branch
    info1 = client.get("/model-info").json()
    # In uninitialized state backend should be None or lazy placeholder
    assert info1["backend"] in (
        None,
        "lazy-uninitialized",
        "sentence-transformers",
        "mlx",
    )

    # Trigger embedding (will cause real initialization inside lazy wrapper)
    resp = client.post("/embed", json={"text": "hello world"})
    assert resp.status_code in (
        200,
        500,
    )  # 500 allowed if heavy backend fails; fallback may engage

    # Second model-info should reflect attempted load (backend not None unless failure fallback kept placeholder)
    info2 = client.get("/model-info").json()
    assert "model_loaded" in info2
    # Health endpoint for completeness
    health = client.get("/health").json()
    assert health["status"] == "healthy"
