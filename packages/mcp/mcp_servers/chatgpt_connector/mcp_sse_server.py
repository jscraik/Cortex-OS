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
from typing import Any, AsyncGenerator, Dict, List

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import StreamingResponse

from .server import ChatGPTConnectorServer

logger = logging.getLogger(__name__)


class ClientHub:
    def __init__(self) -> None:
        self._clients: List[asyncio.Queue[str]] = []
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

    async def broadcast(self, message: Dict[str, Any]) -> None:
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
server = ChatGPTConnectorServer()


def _auth_dependency(authorization: str | None = Header(default=None)) -> None:
    api_key = os.environ.get("MCP_API_KEY")
    if not api_key:
        return
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    if authorization != f"Bearer {api_key}":
        raise HTTPException(status_code=403, detail="Invalid token")


@app.post("/mcp/message")
async def post_message(request: Request, _: None = Depends(_auth_dependency)) -> Dict[str, Any]:
    body = await request.json()
    msg_id = body.get("id")
    method = body.get("method")
    params = body.get("params") or {}
    jsonrpc = body.get("jsonrpc", "2.0")

    if not method:
        raise HTTPException(status_code=400, detail="Missing 'method'")

    # Dispatch to registered handler on the underlying server
    handler = server.protocol_handler.message_handlers.get(method)
    if not handler:
        raise HTTPException(status_code=404, detail=f"Unknown method: {method}")

    try:
        result = await handler(params)
    except Exception as e:  # noqa: BLE001
        logger.exception("MCP handler error")
        error_msg = {"id": msg_id, "jsonrpc": jsonrpc, "error": {"code": -32000, "message": str(e)}}
        await hub.broadcast(error_msg)
        raise HTTPException(status_code=500, detail=str(e))

    response_msg = {"id": msg_id, "jsonrpc": jsonrpc, "result": result}
    await hub.broadcast(response_msg)
    return {"ok": True}


@app.get("/mcp/sse")
async def sse_endpoint(_: None = Depends(_auth_dependency)) -> StreamingResponse:
    q = await hub.register()

    async def event_stream() -> AsyncGenerator[bytes, None]:
        try:
            # Initial hello event for quick connector verification
            yield b"data: {\"type\":\"hello\",\"service\":\"cortex-os\"}\n\n"
            while True:
                data = await q.get()
                yield f"data: {data}\n\n".encode("utf-8")
        finally:
            await hub.unregister(q)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def main() -> None:
    import uvicorn

    port = int(os.environ.get("PORT", "8007"))
    uvicorn.run("mcp.mcp_servers.chatgpt_connector.mcp_sse_server:app", host="0.0.0.0", port=port, reload=True)


if __name__ == "__main__":
    main()

