import httpx
import pytest
from app import COMMIT_HASH, MODEL_NAME, app


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
