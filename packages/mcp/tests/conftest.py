"""Test configuration and fixtures."""

import asyncio
import shutil
import tempfile
from unittest.mock import AsyncMock

import pytest


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def temp_directory():
    """Create temporary directory for tests."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture(scope="function")
async def mock_redis():
    """Mock Redis client."""
    redis_mock = AsyncMock()
    redis_data = {}

    async def mock_get(key):
        return redis_data.get(key)

    async def mock_set(key, value, ex=None):
        redis_data[key] = value
        return True

    redis_mock.get.side_effect = mock_get
    redis_mock.set.side_effect = mock_set
    redis_mock.ping.return_value = b"PONG"

    return redis_mock


@pytest.fixture
def sample_task_data():
    """Sample task data for testing."""
    return {
        "task_id": "test-123",
        "function_name": "test_func",
        "args": ("arg1",),
        "kwargs": {"param": "value"},
    }
