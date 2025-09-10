import pytest
from fastapi.testclient import TestClient

from mcp.webui.app import app


def test_api_metrics_includes_tool_metrics():
    # Create client to run app lifespan (initializes task_queue)
    client = TestClient(app)

    # Inject predictable tool metrics after startup
    from mcp.webui import app as app_module

    assert app_module.task_queue is not None
    app_module.task_queue.tool_metrics.clear()
    app_module.task_queue.tool_metrics.update(
        {"t1": {"count": 2, "total_latency": 0.3}, "t2": {"count": 1, "total_latency": 0.1}}
    )

    resp = client.get("/api/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert "tools" in data
    assert data["tools"]["t1"]["avg_latency"] == pytest.approx(0.15, rel=1e-2)
