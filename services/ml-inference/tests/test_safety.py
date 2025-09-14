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
        "'instructor' or 'mlx' dependency not installed (or shim); skipping safety test.",
        allow_module_level=True,
    )

from app import app  # noqa: E402


@pytest.mark.asyncio
async def test_safety_filter_blocks_prompt() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/predict", json={"prompt": "badword"})

    assert resp.status_code == 400
    assert resp.json()["detail"] == "Unsafe prompt"
