from importlib import util as importlib_util

import httpx
import pytest


def _safe_has_module(name: str) -> bool:
    try:
        spec = importlib_util.find_spec(name)
    except ValueError:  # shim modules without proper __spec__
        return False
    return spec is not None


INSTRUCTOR_AVAILABLE = _safe_has_module("instructor")
MLX_AVAILABLE = _safe_has_module("mlx")

if not (
    INSTRUCTOR_AVAILABLE and MLX_AVAILABLE
):  # pragma: no cover - environment dependent skip path
    pytest.skip(
        "'instructor' or 'mlx' dependency not installed; skipping ml-inference endpoint tests.",
        allow_module_level=True,
    )

from app import COMMIT_HASH, MODEL_NAME, app  # noqa: E402


@pytest.mark.asyncio
async def test_health_ready_endpoints() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        health = await client.get("/health")
        ready = await client.get("/ready")

    assert health.json() == {
        "status": "ok",
        "model": MODEL_NAME,
        "commit": COMMIT_HASH,
    }
    assert ready.json()["status"] == "ready"
    assert ready.json()["model"] == MODEL_NAME


@pytest.mark.asyncio
async def test_metrics_endpoint() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/metrics")

    assert resp.status_code == 200
    assert b"inference_requests_total" in resp.content
