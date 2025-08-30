from unittest.mock import patch

import httpx
import pytest
from brainwav_memories.client import MemoriesClient
from brainwav_memories.models import Memory


@pytest.fixture
def sample_memory_data():
    return {
        "id": "m1",
        "kind": "note",
        "text": "hello",
        "vector": None,
        "tags": [],
        "ttl": None,
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-01T00:00:00Z",
        "provenance": {"source": "user", "actor": "u1"},
        "policy": {"pii": False, "scope": "user"},
        "embedding_model": None,
    }


def test_save_posts_and_returns_memory(sample_memory_data):
    client = MemoriesClient("https://api.test", token="t123")

    resp = httpx.Response(
        200,
        json=sample_memory_data,
        request=httpx.Request("POST", "https://api.test/memories"),
    )

    with patch("httpx.post", return_value=resp) as mock_post:
        m = Memory.model_validate(sample_memory_data)
        result = client.save(m)
        mock_post.assert_called_once()
        assert isinstance(result, Memory)
        assert result.id == "m1"


def test_get_returns_none_on_404(sample_memory_data):
    client = MemoriesClient("https://api.test")
    resp = httpx.Response(
        404, json={}, request=httpx.Request("GET", "https://api.test/memories/m1")
    )

    with patch("httpx.get", return_value=resp) as mock_get:
        result = client.get("m1")
        mock_get.assert_called_once()
        assert result is None


def test_headers_and_base_url_handling(sample_memory_data):
    client = MemoriesClient("https://api.test/", token="t-token")
    assert client.base_url == "https://api.test"
    assert client.headers == {"Authorization": "Bearer t-token"}

    # Ensure save uses client headers
    resp = httpx.Response(
        200,
        json=sample_memory_data,
        request=httpx.Request("POST", "https://api.test/memories"),
    )
    with patch("httpx.post", return_value=resp) as mock_post:
        m = Memory.model_validate(sample_memory_data)
        client.save(m)
        called_headers = mock_post.call_args.kwargs.get("headers")
        assert called_headers == client.headers
