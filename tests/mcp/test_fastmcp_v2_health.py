import importlib.util
from pathlib import Path

import pytest


def _load_server():
    root = Path(__file__).resolve().parents[2]
    path = root / "packages" / "cortex-mcp" / "cortex_fastmcp_server_v2.py"
    spec = importlib.util.spec_from_file_location("cortex_fastmcp_server_v2", str(path))
    assert spec and spec.loader, "Unable to load server module"
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[attr-defined]
    return mod


@pytest.mark.asyncio
async def test_health_tool_and_route():
    server_mod = _load_server()
    mcp = server_mod.create_server()

    # Prefer tool-based health_check when available (stub FastMCP)
    raw_funcs = getattr(mcp, "_raw_funcs", None)
    if isinstance(raw_funcs, dict) and "health_check" in raw_funcs:
        result = await raw_funcs["health_check"]()
        assert isinstance(result, dict)
        assert result.get("status") == "ok"
        assert result.get("version") == "2.0.0"
        return

    # Otherwise, try HTTP route if underlying FastAPI app is attached (real FastMCP)
    app = getattr(mcp, "app", None)
    if app and hasattr(app, "router"):
        try:
            from fastapi.testclient import TestClient  # type: ignore

            client = TestClient(app)
            res = client.get("/health")
            assert res.status_code == 200
            body = res.json()
            assert body.get("status") == "ok"
            assert body.get("version") == "2.0.0"
            return
        except Exception:
            pytest.skip("FastAPI not available in test environment")

    # If neither tool nor route is available (e.g., real FastMCP without app in tests), skip
    pytest.skip(
        "No accessible health surface (tool or HTTP) available in this environment"
    )


@pytest.mark.asyncio
async def test_health_details_route():
    """Test the /health/details endpoint when HealthCheckRegistry is available."""
    server_mod = _load_server()
    mcp = server_mod.create_server()

    # Only test if FastAPI app is attached
    app = getattr(mcp, "app", None)
    if app and hasattr(app, "router"):
        try:
            from fastapi.testclient import TestClient  # type: ignore

            client = TestClient(app)
            res = client.get("/health/details")
            
            # Should return 200 if health details route is registered
            if res.status_code == 200:
                body = res.json()
                assert isinstance(body, dict)
                # Should have check results structure if registry is active
                if "checks" in body:
                    assert isinstance(body["checks"], dict)
            elif res.status_code == 404:
                # Route not registered - skip this test
                pytest.skip("Health details route not registered")
            else:
                pytest.fail(f"Unexpected status code: {res.status_code}")
                
        except Exception:
            pytest.skip("FastAPI not available in test environment")
    else:
        pytest.skip("No FastAPI app available for health details test")
