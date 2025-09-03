"""Test configuration and fixtures."""

import asyncio
import shutil
import tempfile
from collections.abc import AsyncGenerator, Generator
from typing import Any
from unittest.mock import AsyncMock

import pytest

from mcp.core.protocol import MCPProtocolHandler


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def temp_directory() -> AsyncGenerator[str, None]:
    """Create temporary directory for tests."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture(scope="function")
async def mock_redis() -> AsyncMock:
    """Mock Redis client."""
    redis_mock = AsyncMock()
    redis_data: dict[str, Any] = {}

    async def mock_get(key: str) -> Any | None:
        await asyncio.sleep(0)
        return redis_data.get(key)

    async def mock_set(key: str, value: Any, ex: int | None = None) -> bool:
        await asyncio.sleep(0)
        redis_data[key] = value
        return True

    redis_mock.get.side_effect = mock_get
    redis_mock.set.side_effect = mock_set
    redis_mock.ping.return_value = b"PONG"

    return redis_mock


@pytest.fixture
def sample_task_data() -> dict[str, Any]:
    """Sample task data for testing."""
    return {
        "task_id": "test-123",
        "function_name": "test_func",
        "args": ("arg1",),
        "kwargs": {"param": "value"},
    }


@pytest.fixture
def handler() -> MCPProtocolHandler:
    """Provide a protocol handler for tests that need one."""
    return MCPProtocolHandler()
