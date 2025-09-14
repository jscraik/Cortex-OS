"""Minimal MCP-compatible SSE server wrapper for ChatGPT Connector.

Endpoints:
- POST /mcp/message: Accepts JSON-RPC-like payload {id, jsonrpc, method, params}.
  Dispatches to ChatGPTConnectorServer.protocol_handler and enqueues a result message.
- GET /mcp/sse: Streams outbound messages as Server-Sent Events (data: {json}\n\n).

Notes:
- This is a minimal implementation sufficient for ChatGPT's "New Connector" UI.
- Authentication is optional via a static API key header when MCP_API_KEY is set.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse

logger = logging.getLogger(__name__)


class ClientHub:
    def __init__(self) -> None:
        self._clients: list[asyncio.Queue[str]] = []
        self._lock = asyncio.Lock()

    async def register(self) -> asyncio.Queue[str]:
        q: asyncio.Queue[str] = asyncio.Queue()
        async with self._lock:
            self._clients.append(q)
        return q

    async def unregister(self, q: asyncio.Queue[str]) -> None:
        async with self._lock:
            if q in self._clients:
                self._clients.remove(q)

    async def broadcast(self, message: dict[str, Any]) -> None:
        data = json.dumps(message)
        async with self._lock:
            for q in list(self._clients):
                # Don't block if a client is slow; drop when queue is full
                try:
                    q.put_nowait(data)
                except asyncio.QueueFull:
                    logger.warning("Dropping SSE message for a slow client")


hub = ClientHub()
app = FastAPI(title="Cortex-OS MCP SSE Server", version="1.0.0")


# Minimal shim so this module is self-contained and not circular-importing `.server`.
# We expose `protocol_handler.message_handlers` where each handler is `async def(params) -> Any`.
class _ProtocolHandler:
    def __init__(self) -> None:
        self.message_handlers: dict[str, Any] = {
            "search": self._search,
            "ping": self._ping,
        }

    async def _search(self, params: dict[str, Any]) -> dict[str, Any]:
        query = (params or {}).get("query", "")
        # Return a deterministic, minimal payload that the wizard can accept
        return {
            "query": query,
            "results": [],
        }

    async def _ping(self, params: dict[str, Any]) -> dict[str, Any]:
        return {"pong": True, "ts": datetime.utcnow().isoformat() + "Z"}


class _ConnectorServer:
    def __init__(self) -> None:
        self.protocol_handler = _ProtocolHandler()


server = _ConnectorServer()


def _auth_dependency(authorization: str | None = Header(default=None)) -> None:
    api_key = os.environ.get("MCP_API_KEY")
    if not api_key:
        return
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    if authorization != f"Bearer {api_key}":
        raise HTTPException(status_code=403, detail="Invalid token")


@app.post("/mcp/message")
async def post_message(
    request: Request,
    _: None = Depends(_auth_dependency),
) -> JSONResponse:
    try:
        payload = await request.json()
    except Exception:
        return JSONResponse(
            {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": "Parse error"},
            },
            status_code=400,
        )

    req_id = payload.get("id")
    method = payload.get("method")
    params = payload.get("params") or {}

    # Built-ins that the wizard may call
    async def _ping(_):  # {"method":"ping"}
        return {"pong": True}

    async def _capabilities(_):  # {"method":"capabilities"}
        return {
            "capabilities": {
                "jsonrpc": "2.0",
                "transport": "sse",
                "server": "cortex-os",
            }
        }

    # Prefer real handlers if present on your server object
    handlers = getattr(server, "protocol_handler", None)
    table = dict(getattr(handlers, "message_handlers", {})) if handlers else {}
    table.setdefault("ping", _ping)
    table.setdefault("capabilities", _capabilities)

    if method in table:
        try:
            result = await table[method](params)
            return JSONResponse({"jsonrpc": "2.0", "id": req_id, "result": result})
        except Exception as e:
            return JSONResponse(
                {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32000, "message": f"Handler error: {e}"},
                },
                status_code=500,
            )

    # JSON-RPC -32601 Method not found
    return JSONResponse(
        {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32601, "message": f"Method not found: {method}"},
        },
        status_code=404,
    )


@app.post("/message")
async def rpc_message_alias(
    request: Request, _: None = Depends(_auth_dependency)
) -> JSONResponse:
    return await post_message(request, _)


async def _make_sse_stream() -> StreamingResponse:
    q = await hub.register()

    async def event_stream() -> AsyncGenerator[bytes]:
        try:
            # Initial hello event for quick connector verification
            yield b'data: {"type":"hello","service":"cortex-os"}\n\n'
            while True:
                data = await q.get()
                yield f"data: {data}\n\n".encode()
        finally:
            await hub.unregister(q)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/mcp/sse")
async def sse_endpoint(_: None = Depends(_auth_dependency)) -> StreamingResponse:
    return await _make_sse_stream()


# Alias required by ChatGPT connector wizard: it probes `/sse`
@app.get("/sse")
async def sse_alias(_: None = Depends(_auth_dependency)) -> StreamingResponse:
    return await _make_sse_stream()


def main() -> None:
    import uvicorn

    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("CHATGPT_MCP_PORT", os.environ.get("PORT", "8007")))
    uvicorn.run(app, host=host, port=port, reload=False, log_level="debug")


if __name__ == "__main__":
    main()
