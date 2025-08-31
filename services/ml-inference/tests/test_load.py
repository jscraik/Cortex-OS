import asyncio

import httpx
import pytest
from app import app


@pytest.mark.asyncio
async def test_load_concurrency() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        tasks = [client.post("/predict", json={"prompt": str(i)}) for i in range(10)]
        responses = await asyncio.gather(*tasks)

    assert all(r.status_code == 200 for r in responses)
