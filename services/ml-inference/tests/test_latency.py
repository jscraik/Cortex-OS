import time

import httpx
import pytest
from app import app

SLO_SECONDS = 0.1


@pytest.mark.asyncio
async def test_latency_slo() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        start = time.perf_counter()
        resp = await client.post("/predict", json={"prompt": "hello"})
        duration = time.perf_counter() - start

    assert resp.status_code == 200
    assert duration < SLO_SECONDS
