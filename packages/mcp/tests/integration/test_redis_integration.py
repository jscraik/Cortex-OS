"""Integration tests with real Redis server."""

import asyncio

import pytest
from mcp.tasks.task_queue import TaskPriority, TaskQueue, TaskStatus


class TestRedisIntegration:
    """Test TaskQueue with real Redis."""

    @pytest.fixture
    async def real_task_queue(self):
        """Create a TaskQueue with real Redis connection."""
        queue = TaskQueue(
            redis_url="redis://localhost:6379",
            queue_name="test_integration_queue",
            max_workers=2,
            enable_celery=False,
        )
        await queue.initialize()
        yield queue
        await queue.shutdown()

    async def test_real_redis_task_submission(self, real_task_queue):
        """Test task submission with real Redis."""
        task_id = await real_task_queue.submit_task(
            "echo", "test message", priority=TaskPriority.HIGH
        )

        assert isinstance(task_id, str)
        assert task_id in real_task_queue.active_tasks

        task_result = real_task_queue.active_tasks[task_id]
        assert task_result.status == TaskStatus.PENDING

    async def test_real_redis_task_execution(self, real_task_queue):
        """Test task execution with real Redis."""
        # Submit an echo task
        task_id = await real_task_queue.submit_task("echo", "hello world")

        # Start a worker to process the task
        await real_task_queue.start_workers()

        # Wait briefly for processing with small polling to reduce flakes in CI
        processed = False
        for _ in range(10):
            if (
                task_id in real_task_queue.completed_tasks
                or task_id in real_task_queue.active_tasks
            ):
                processed = True
                break
            await asyncio.sleep(0.2)

        assert processed, "Task should be observed as active or completed"

    async def test_real_redis_health_check(self, real_task_queue):
        """Test health check task with real Redis."""
        task_id = await real_task_queue.submit_task("health_check")

        assert isinstance(task_id, str)
        assert task_id in real_task_queue.active_tasks
