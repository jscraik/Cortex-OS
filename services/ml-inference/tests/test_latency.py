import time
from importlib import util as importlib_util

import httpx
import pytest


def _safe_has_module(name: str) -> bool:
    try:
        spec = importlib_util.find_spec(name)
    except ValueError:
        return False
    return spec is not None


INSTRUCTOR_AVAILABLE = _safe_has_module("instructor")
MLX_AVAILABLE = _safe_has_module("mlx")
if not (INSTRUCTOR_AVAILABLE and MLX_AVAILABLE):  # pragma: no cover
    pytest.skip(
        "'instructor' or 'mlx' dependency not installed (or shim); skipping latency test.",
        allow_module_level=True,
    )

from app import app  # noqa: E402

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
