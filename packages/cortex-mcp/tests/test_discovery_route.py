"""Tests for the discovery manifest route exposed by the FastMCP server."""

import importlib.util
from pathlib import Path
from types import ModuleType
from typing import Any, cast
import sys

from fastmcp import FastMCP
from fastmcp.server.http import StarletteWithLifespan
from starlette.testclient import TestClient

MODULE_PATH = Path(__file__).resolve().parents[1] / "cortex_fastmcp_server_v2.py"


def _load_server_module() -> ModuleType:
    spec = importlib.util.spec_from_file_location(
        "cortex_fastmcp_server_v2", MODULE_PATH
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load cortex_fastmcp_server_v2 module")
    module = importlib.util.module_from_spec(spec)
    sys.modules.setdefault(spec.name, module)

    if "jwt" not in sys.modules:
        jwt_stub = ModuleType("jwt")

        class _InvalidTokenError(Exception):
            """Fallback InvalidTokenError for test environments."""

        jwt_stub.InvalidTokenError = _InvalidTokenError

        def _decode_stub(*_args: Any, **_kwargs: Any) -> None:
            raise _InvalidTokenError("jwt decode unavailable in tests")

        jwt_stub.decode = _decode_stub  # type: ignore[attr-defined]
        sys.modules["jwt"] = jwt_stub

    spec.loader.exec_module(module)
    return module


def test_discovery_route_returns_brainwav_manifest() -> None:
    """Ensure the manifest is served via the FastMCP custom route API."""
    module = _load_server_module()
    expected_transport = getattr(module, "DEFAULT_TRANSPORT", "streamable-http")
    create_server = cast(Any, module.create_server)
    server = cast(FastMCP, create_server())
    app = cast(StarletteWithLifespan, server.http_app(transport="http"))
    client = TestClient(app)

    response = client.get("/.well-known/mcp.json")

    assert response.status_code == 200
    payload = cast(dict[str, Any], response.json())
    assert payload["branding"]["provider"] == "brAInwav"
    assert payload["servers"], "Expected at least one server entry"
    first_server = cast(dict[str, Any], payload["servers"][0])
    assert first_server["endpoint"] == "https://cortex-mcp.brainwav.io/mcp"
    assert first_server["transport"] == expected_transport

    assert payload["tools"], "Expected at least one tool entry"
    first_tool = cast(dict[str, Any], payload["tools"][0])
    assert first_tool["transport"] == expected_transport
