from __future__ import annotations

import httpx
import pytest

from cortex_connectors.server import create_app
from cortex_connectors.settings import Settings


def build_client(app) -> httpx.AsyncClient:
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    return httpx.AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_health_endpoint_unprotected(settings: Settings) -> None:
    app = create_app(settings=settings, sse_interval=0.01, sse_max_events=1)
    async with build_client(app) as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_service_map_authentication(settings: Settings) -> None:
    app = create_app(settings=settings, sse_interval=0.01, sse_max_events=1)
    async with build_client(app) as client:
        response = await client.get("/v1/connectors/service-map")
        assert response.status_code == 401

        response = await client.get(
            "/v1/connectors/service-map",
            headers={"Authorization": "Bearer wrong"},
        )
        assert response.status_code == 403

        response = await client.get(
            "/v1/connectors/service-map",
            headers={"Authorization": f"Bearer {settings.api_key}"},
        )
        assert response.status_code == 200
        body = response.json()
        assert "signature" in body
        assert body["payload"]["metadata"]["count"] == 1


@pytest.mark.asyncio
async def test_metrics_exposed(settings: Settings) -> None:
    app = create_app(settings=settings, sse_interval=0.01, sse_max_events=1)
    async with build_client(app) as client:
        response = await client.get("/metrics", headers={"Authorization": f"Bearer {settings.api_key}"})
        assert response.status_code == 200
        assert "brainwav_mcp_connector_proxy_up" in response.text


@pytest.mark.asyncio
async def test_apps_bundle_served(settings: Settings) -> None:
    app = create_app(settings=settings, sse_interval=0.01, sse_max_events=1)
    async with build_client(app) as client:
        response = await client.get(
            "/apps/chatgpt-dashboard/index.html",
            headers={"Authorization": f"Bearer {settings.api_key}"},
        )
        assert response.status_code == 200
        assert "bundle" in response.text


@pytest.mark.asyncio
async def test_sse_stream(settings: Settings) -> None:
    app = create_app(settings=settings, sse_interval=0.01, sse_max_events=1)
    async with build_client(app) as client:
        async with client.stream(
            "GET",
            "/v1/connectors/stream",
            headers={"Authorization": f"Bearer {settings.api_key}"},
            timeout=1.0,
        ) as response:
            assert response.status_code == 200
            buffer = ""
            async for chunk in response.aiter_text():
                buffer += chunk
                if "data:" in buffer:
                    break
            assert "status" in buffer


@pytest.mark.asyncio
async def test_manifest_missing_returns_503(settings: Settings, tmp_path) -> None:
    missing_settings = Settings(
        signature_key=settings.signature_key,
        manifest_path=tmp_path / "missing.json",
        api_key=settings.api_key,
        mcp_api_key=settings.mcp_api_key,
        no_auth=settings.no_auth,
        log_level=settings.log_level,
        apps_bundle_dir=settings.apps_bundle_dir,
        enable_prometheus=settings.enable_prometheus,
    )
    app = create_app(settings=missing_settings, sse_interval=0.01, sse_max_events=1)
    async with build_client(app) as client:
        response = await client.get(
            "/v1/connectors/service-map",
            headers={"Authorization": f"Bearer {settings.api_key}"},
        )
        assert response.status_code == 503
