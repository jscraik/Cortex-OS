from fastapi.testclient import TestClient

from py_mlx_server.main import app

client = TestClient(app)


def test_ping_returns_pong():
    response = client.get("/ping")
    assert response.status_code == 200
    assert response.json() == {"message": "pong"}


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
