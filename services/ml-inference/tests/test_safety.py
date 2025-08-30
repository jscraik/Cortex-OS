import httpx
import pytest
from app import app


@pytest.mark.asyncio
async def test_safety_filter_blocks_prompt() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/predict", json={"prompt": "badword"})

    assert resp.status_code == 400
    assert resp.json()["detail"] == "Unsafe prompt"
