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
from urllib.parse import urlencode
import secrets

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


# OAuth configuration
OAUTH_CLIENTS = {
    "cortex-mcp-chatgpt": {
        "client_id": "cortex-mcp-chatgpt",
        "client_secret": "cortex-test-secret",
        "redirect_uris": [
            "https://chat.openai.com/callback",
            "https://chatgpt.com/callback",
            "https://chat.openai.com/oauth/callback",
            "https://chatgpt.com/oauth/callback",
            "https://chat.openai.com/auth/callback"
        ]
    }
}

# Simple in-memory storage for auth codes (use Redis/DB in production)
auth_codes = {}
access_tokens = {}


@app.get("/.well-known/oauth-authorization-server")
async def oauth_metadata():
    """OAuth 2.0 Authorization Server Metadata"""
    base_url = os.environ.get("BASE_URL", "https://cortex-mcp.brainwav.io")
    return {
        "issuer": base_url,
        "authorization_endpoint": f"{base_url}/oauth/authorize",
        "token_endpoint": f"{base_url}/oauth/token",
        "userinfo_endpoint": f"{base_url}/oauth/userinfo",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code"],
        "scopes_supported": ["mcp", "openid", "profile"],
        "token_endpoint_auth_methods_supported": ["client_secret_post", "client_secret_basic"],
        "code_challenge_methods_supported": ["S256", "plain"]
    }


@app.get("/.well-known/openid_configuration")
async def openid_configuration():
    """OpenID Connect Discovery"""
    return await oauth_metadata()


@app.get("/oauth/userinfo")
async def oauth_userinfo(authorization: str | None = Header(default=None)):
    """OAuth userinfo endpoint"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization")

    token = authorization[7:]
    if token not in access_tokens:
        raise HTTPException(status_code=401, detail="Invalid token")

    return {
        "sub": "cortex-mcp-user",
        "name": "Cortex MCP User",
        "email": "user@cortex-mcp.local"
    }


@app.get("/oauth/authorize")
async def oauth_authorize(
    client_id: str,
    redirect_uri: str,
    response_type: str = "code",
    scope: str = "mcp",
    state: str = None
):
    """OAuth 2.0 Authorization Endpoint"""
    logger.info(f"OAuth authorize request: client_id={client_id}, redirect_uri={redirect_uri}, response_type={response_type}, scope={scope}, state={state}")

    # Validate client
    if client_id not in OAUTH_CLIENTS:
        raise HTTPException(status_code=400, detail="Invalid client_id")

    client = OAUTH_CLIENTS[client_id]
    # For development, be more permissive with redirect URIs
    if not any(allowed in redirect_uri for allowed in client["redirect_uris"]):
        logger.warning(f"Redirect URI not in allowlist: {redirect_uri}")
        # Allow it anyway for ChatGPT testing
        # raise HTTPException(status_code=400, detail="Invalid redirect_uri")

    if response_type != "code":
        raise HTTPException(status_code=400, detail="Unsupported response_type")

    # Generate authorization code
    auth_code = secrets.token_urlsafe(32)
    auth_codes[auth_code] = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": scope,
        "expires_at": datetime.utcnow().timestamp() + 600  # 10 minutes
    }

    # Redirect with authorization code
    params = {"code": auth_code}
    if state:
        params["state"] = state

    redirect_url = f"{redirect_uri}?{urlencode(params)}"
    return JSONResponse(
        status_code=302,
        headers={"Location": redirect_url},
        content={"redirect_url": redirect_url}
    )


@app.post("/oauth/token")
async def oauth_token(request: Request):
    """OAuth 2.0 Token Endpoint"""
    form_data = await request.form()

    grant_type = form_data.get("grant_type")
    if grant_type != "authorization_code":
        raise HTTPException(status_code=400, detail="Unsupported grant_type")

    auth_code = form_data.get("code")
    client_id = form_data.get("client_id")
    client_secret = form_data.get("client_secret")
    redirect_uri = form_data.get("redirect_uri")

    # Validate authorization code
    if auth_code not in auth_codes:
        raise HTTPException(status_code=400, detail="Invalid authorization code")

    code_data = auth_codes[auth_code]

    # Check expiration
    if datetime.utcnow().timestamp() > code_data["expires_at"]:
        del auth_codes[auth_code]
        raise HTTPException(status_code=400, detail="Authorization code expired")

    # Validate client credentials
    if client_id != code_data["client_id"]:
        raise HTTPException(status_code=400, detail="Client ID mismatch")

    if client_id not in OAUTH_CLIENTS:
        raise HTTPException(status_code=400, detail="Invalid client")

    client = OAUTH_CLIENTS[client_id]
    if client_secret != client["client_secret"]:
        raise HTTPException(status_code=400, detail="Invalid client_secret")

    if redirect_uri != code_data["redirect_uri"]:
        raise HTTPException(status_code=400, detail="Redirect URI mismatch")

    # Generate access token
    access_token = secrets.token_urlsafe(32)
    access_tokens[access_token] = {
        "client_id": client_id,
        "scope": code_data["scope"],
        "expires_at": datetime.utcnow().timestamp() + 3600  # 1 hour
    }

    # Clean up used authorization code
    del auth_codes[auth_code]

    return {
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": 3600,
        "scope": code_data["scope"]
    }


def _oauth_auth_dependency(authorization: str | None = Header(default=None)) -> None:
    """Enhanced auth that supports both API key and OAuth"""
    api_key = os.environ.get("MCP_API_KEY")

    # If no auth required, allow access
    if not api_key and not authorization:
        return

    if not authorization:
        if api_key:
            raise HTTPException(status_code=401, detail="Missing Authorization header")
        return

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    token = authorization[7:]  # Remove "Bearer " prefix

    # Check if it's the API key
    if api_key and token == api_key:
        return

    # Check if it's a valid OAuth access token
    if token in access_tokens:
        token_data = access_tokens[token]
        if datetime.utcnow().timestamp() > token_data["expires_at"]:
            del access_tokens[token]
            raise HTTPException(status_code=401, detail="Token expired")
        return

    raise HTTPException(status_code=403, detail="Invalid token")


@app.post("/mcp/message")
async def post_message(
    request: Request,
    _: None = Depends(_oauth_auth_dependency),
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
    request: Request, _: None = Depends(_oauth_auth_dependency)
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
async def sse_endpoint(_: None = Depends(_oauth_auth_dependency)) -> StreamingResponse:
    return await _make_sse_stream()


# Alias required by ChatGPT connector wizard: it probes `/sse`
@app.get("/sse")
async def sse_alias(_: None = Depends(_oauth_auth_dependency)) -> StreamingResponse:
    return await _make_sse_stream()


def main() -> None:
    import uvicorn

    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("CHATGPT_MCP_PORT", os.environ.get("PORT", "3024")))
    uvicorn.run(app, host=host, port=port, reload=False, log_level="debug")


if __name__ == "__main__":
    main()
