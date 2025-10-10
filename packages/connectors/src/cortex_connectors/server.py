"""FastAPI server exposing connectors runtime."""

from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from typing import Any, AsyncIterator, Callable, Optional

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from .auth import APIKeyAuthenticator
from .registry import ConnectorRegistry
from .settings import Settings
from .sse import connector_status_stream
from .telemetry import configure_logging, configure_tracing


def create_app(
    settings: Optional[Settings] = None, *, sse_interval: float = 15.0, sse_max_events: Optional[int] = None
) -> FastAPI:
    settings = settings or Settings.from_env()

    configure_logging(settings.log_level)
    configure_tracing("cortex-connectors", os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"))

    registry = ConnectorRegistry(settings.manifest_path, settings.signature_key)
    authenticator = APIKeyAuthenticator(settings.api_key, settings.no_auth)

    app = FastAPI(title="Cortex Connectors", version="0.1.0")

    @app.middleware("http")
    async def auth_middleware(request: Request, call_next: Callable[..., Any]):
        if request.url.path.startswith("/v1") or request.url.path.startswith("/apps"):
            try:
                await authenticator(request)
            except HTTPException as exc:
                return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
        return await call_next(request)

    @app.get("/health")
    async def health() -> dict[str, Any]:
        return {"status": "ok", "timestamp": datetime.now(UTC).isoformat()}

    @app.get("/v1/connectors/service-map")
    async def service_map() -> dict[str, Any]:
        try:
            return registry.service_map()
        except FileNotFoundError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    @app.get("/v1/connectors/stream")
    async def connectors_stream() -> StreamingResponse:
        async def event_generator() -> AsyncIterator[bytes]:
            async for event in connector_status_stream(
                registry, interval=sse_interval, max_events=sse_max_events
            ):
                chunk = f"event: {event['event']}\ndata: {json.dumps(event['data'])}\n\n"
                yield chunk.encode("utf-8")

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    if settings.enable_prometheus:
        @app.get("/metrics")
        async def metrics() -> Response:
            return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    bundle_dir = settings.apps_bundle_dir
    if bundle_dir and bundle_dir.exists():
        app.mount("/apps/chatgpt-dashboard", StaticFiles(directory=bundle_dir, html=True), name="chatgpt-dashboard")
    else:
        @app.get("/apps/chatgpt-dashboard/{path:path}")
        async def missing_bundle(path: str) -> JSONResponse:  # pragma: no cover - simple branch
            raise HTTPException(status_code=503, detail="Apps bundle not configured")

    return app


def main() -> None:
    import uvicorn

    settings = Settings.from_env()
    app = create_app(settings=settings)
    uvicorn.run(app, host="0.0.0.0", port=3026, log_level=settings.log_level)


__all__ = ["create_app", "main"]
