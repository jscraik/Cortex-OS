import asyncio
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
        "'instructor' or 'mlx' dependency not installed (or shim); skipping load concurrency test.",
        allow_module_level=True,
    )

from app import app  # noqa: E402


@pytest.mark.asyncio
async def test_load_concurrency() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        tasks = [client.post("/predict", json={"prompt": str(i)}) for i in range(10)]
        responses = await asyncio.gather(*tasks)

    assert all(r.status_code == 200 for r in responses)
