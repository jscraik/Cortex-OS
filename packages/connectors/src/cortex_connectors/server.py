"""FastAPI server exposing connectors runtime."""

from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, AsyncIterator, Callable, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from prometheus_client import CONTENT_TYPE_LATEST

from .auth import APIKeyAuthenticator
from .manifest import ConnectorsManifestError
from .registry import ConnectorRegistry
from .settings import Settings
from .sse import connector_status_stream
from .telemetry import configure_logging, configure_tracing


BRAND = "brAInwav"


def create_app(
    settings: Optional[Settings] = None,
    *,
    sse_interval: float = 15.0,
    sse_max_events: Optional[int] = None,
) -> FastAPI:
    app_settings = settings or Settings.from_env()

    configure_logging(app_settings.log_level)
    configure_tracing("cortex-connectors", os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"))

    registry = ConnectorRegistry(app_settings.manifest_path, app_settings.signature_key)
    _refresh_registry_best_effort(registry)
    authenticator = APIKeyAuthenticator(app_settings.api_key, app_settings.no_auth)

    app = FastAPI(title="Cortex Connectors", version="0.1.0")

    _register_auth_middleware(app, authenticator)
    _register_core_routes(app, registry, sse_interval, sse_max_events)
    _register_metrics_route(app, registry, app_settings.enable_prometheus)
    _register_dashboard_routes(app, app_settings.apps_bundle_dir)

    return app


def _refresh_registry_best_effort(registry: ConnectorRegistry) -> None:
    try:
        registry.refresh()
    except (FileNotFoundError, ValueError, ConnectorsManifestError):
        # Manifest may be missing or invalid on startup; endpoints expose precise errors later.
        pass


def _brand_detail(message: str) -> str:
    message = message.strip()
    return message if message.startswith(f"[{BRAND}") else f"[{BRAND}] {message}"


def _register_auth_middleware(app: FastAPI, authenticator: APIKeyAuthenticator) -> None:
    @app.middleware("http")
    async def auth_middleware(request: Request, call_next: Callable[..., Any]):
        target = request.url.path
        if target.startswith("/v1") or target.startswith("/apps"):
            try:
                await authenticator(request)
            except HTTPException as exc:
                content = {"detail": _brand_detail(str(exc.detail))}
                return JSONResponse(status_code=exc.status_code, content=content)
        return await call_next(request)


def _register_core_routes(
    app: FastAPI,
    registry: ConnectorRegistry,
    sse_interval: float,
    sse_max_events: Optional[int],
) -> None:
    @app.get("/health")
    async def health() -> dict[str, Any]:
        return {"status": "ok", "brand": BRAND, "timestamp": datetime.now(UTC).isoformat()}

    @app.get("/v1/connectors/service-map")
    async def service_map() -> dict[str, Any]:
        try:
            return registry.service_map()
        except (FileNotFoundError, ValueError, ConnectorsManifestError) as exc:
            raise HTTPException(status_code=503, detail=_brand_detail(str(exc))) from exc

    @app.get("/v1/connectors/stream")
    async def connectors_stream() -> StreamingResponse:
        async def event_generator() -> AsyncIterator[bytes]:
            async for event in connector_status_stream(
                registry, interval=sse_interval, max_events=sse_max_events
            ):
                chunk = f"event: {event['event']}\ndata: {json.dumps(event['data'])}\n\n"
                yield chunk.encode("utf-8")

        return StreamingResponse(event_generator(), media_type="text/event-stream")


def _register_metrics_route(
    app: FastAPI,
    registry: ConnectorRegistry,
    enable_prometheus: bool,
) -> None:
    if not enable_prometheus:
        return

    @app.get("/metrics")
    async def metrics() -> Response:
        try:
            registry.manifest
        except (FileNotFoundError, ValueError, ConnectorsManifestError) as exc:
            raise HTTPException(status_code=503, detail=_brand_detail(str(exc))) from exc

        lines = [
            "# HELP brainwav_mcp_connector_proxy_up Connector availability proxy state",
            "# TYPE brainwav_mcp_connector_proxy_up gauge",
        ]
        for record in registry.records():
            value = 1 if record.enabled else 0
            lines.append(
                f'brainwav_mcp_connector_proxy_up{{connector="{record.entry.id}"}} {value}'
            )
        body = "\n".join(lines) + "\n"
        return Response(body, media_type=CONTENT_TYPE_LATEST)


def _register_dashboard_routes(app: FastAPI, bundle_dir: Optional[Path]) -> None:
    if bundle_dir and bundle_dir.exists():
        app.mount(
            "/apps/chatgpt-dashboard",
            StaticFiles(directory=bundle_dir, html=True),
            name="chatgpt-dashboard",
        )
        return

    @app.get("/apps/chatgpt-dashboard/{path:path}")
    async def missing_bundle(path: str) -> JSONResponse:  # pragma: no cover - simple branch
        raise HTTPException(status_code=503, detail=_brand_detail("Apps bundle not configured"))


def main() -> None:
    import uvicorn

    settings = Settings.from_env()
    app = create_app(settings=settings)
    uvicorn.run(app, host="0.0.0.0", port=3026, log_level=settings.log_level)


__all__ = ["create_app", "main"]
