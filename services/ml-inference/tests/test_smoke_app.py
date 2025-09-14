"""Fast smoke tests for ml-inference FastAPI app.

Goals:
 - Import module without executing heavy model loads (relies on normal lifespan skip in tests)
 - Instantiate FastAPI test client and hit /metrics (cheap) and /predict with minimal payload
 - Skip entire module if heavy deps or create_mlx_engine unavailable to avoid slowing suite.
"""

from __future__ import annotations

# Dynamic shim-heavy test module; suppress strict type checking noise.
# mypy: ignore-errors
import importlib
import os
from typing import Any

import pytest
from fastapi.testclient import TestClient


def _safe_find(name: str):  # pragma: no cover - defensive
    try:
        return importlib.util.find_spec(name)
    except Exception:
        return None

ML_INFERENCE_SPEC = _safe_find("mlx_inference")
MLX_CORE_SPEC = _safe_find("mlx")
if os.getenv("CORTEX_MLX_TEST_SHIM", "0") != "1" and (
    ML_INFERENCE_SPEC is None or MLX_CORE_SPEC is None
):  # pragma: no cover
    pytest.skip(
        "mlx_inference or mlx core not available (and shim disabled); skipping ml-inference smoke tests",
        allow_module_level=True,
    )


def _fast_app() -> Any:
    # Import app module; its lifespan will run only if server startup context; for testclient we keep calls minimal.
    from app import app  # type: ignore

    return app


@pytest.fixture(scope="module")
def client():  # type: ignore[override]
    app = _fast_app()
    with TestClient(app) as c:
        yield c


def test_health_or_metrics_endpoint(client):  # type: ignore[no-untyped-def]
    # Try /metrics first; if 404 fallback to /health then root.
    for path in ("/metrics", "/health", "/"):
        r = client.get(path)
        if r.status_code != 404:
            assert r.status_code in (200, 204)
            break
    else:  # pragma: no cover - defensive
        raise AssertionError("No basic endpoint available (metrics/health/root)")


def test_predict_minimal_failure_path(client, monkeypatch):  # type: ignore[no-untyped-def]
    # Patch inference_engine to a dummy object so endpoint path exercises validation and error handling quickly.
    class DummyInferenceResponse:
        def __init__(self) -> None:
            self.text = "ok"
            self.tokens_generated = 1
            self.latency_ms = 0.1
            self.cached = False

    class DummyEngine:
        async def generate_text(self, _req):  # pragma: no cover - trivial
            return DummyInferenceResponse()

    monkeypatch.setenv("MODEL_NAME", "dummy-model")
    monkeypatch.setenv("MODEL_PATH", "dummy-path")
    monkeypatch.setenv("JWT_SECRET_KEY", "test-secret")
    # Monkeypatch module global if present
    import app as app_module  # type: ignore

    app_module.inference_engine = DummyEngine()  # type: ignore[attr-defined]
    # Minimal validator shims
    app_module.security_validator = type(
        "SV",
        (),
        {
            "validate_input": lambda self, _p, _u: type(
                "R",
                (),
                {
                    "is_safe": True,
                    "content_category": type("C", (), {"value": "none"})(),
                    "security_level": type("L", (), {"value": "low"})(),
                    "reasoning": "",
                },
            )(),
            "sanitize_output": lambda self, t: t,
        },
    )()
    app_module.rate_limiter = type(
        "RL", (), {"check_rate_limit": lambda self, _r, _u: True}
    )()
    app_module.auth_validator = type(
        "AV", (), {"validate_token": lambda self, _t: {"user_id": "u"}}
    )()
    app_module.output_validator = type(
        "OV",
        (),
        {
            "structure_response": lambda self, t: type(
                "SR", (), {"content": t, "dict": lambda self: {"content": t}}
            )()
        },
    )()

    payload = {
        "prompt": "Hi",
        "max_tokens": 4,
        "temperature": 0.1,
        "stream": False,
        "return_structured": False,
    }
    r = client.post("/predict", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["metadata"]["model"] == os.getenv("MODEL_NAME")
