"""Unit tests for the advanced task queue system."""

import asyncio
import time
from unittest.mock import AsyncMock

import pytest

from ...tasks.task_queue import (
    TaskDefinition,
    TaskPriority,
    TaskQueue,
    TaskRegistry,
    TaskResult,
    TaskStatus,
)


class TestTaskRegistry:
    """Test the task registry functionality."""

    def test_register_function(self):
        """Test function registration."""
        registry = TaskRegistry()

        def test_func():
            return "test"

        registry.register("test", test_func)
        assert registry.get("test") == test_func
        assert "test" in registry.list_functions()

    def test_unregister_function(self):
        """Test function unregistration."""
        registry = TaskRegistry()

        def test_func():
            return "test"

        registry.register("test", test_func)
        registry.unregister("test")

        assert registry.get("test") is None
        assert "test" not in registry.list_functions()


class TestTaskDefinition:
    """Test task definition functionality."""

    def test_task_definition_creation(self, sample_task_data):
        """Test creating a task definition."""
        task_def = TaskDefinition(**sample_task_data)

        assert task_def.task_id == sample_task_data["task_id"]
        assert task_def.function_name == sample_task_data["function_name"]
        assert task_def.args == sample_task_data["args"]
        assert task_def.kwargs == sample_task_data["kwargs"]

    def test_task_definition_serialization(self, sample_task_data):
        """Test task definition serialization."""
        task_def = TaskDefinition(**sample_task_data)

        task_dict = task_def.to_dict()
        assert isinstance(task_dict, dict)
        assert task_dict["task_id"] == sample_task_data["task_id"]

        # Test deserialization
        restored_task = TaskDefinition.from_dict(task_dict)
        assert restored_task.task_id == task_def.task_id
        assert restored_task.function_name == task_def.function_name

    def test_task_priority_enum(self):
        """Test task priority enumeration."""
        task_def = TaskDefinition(
            task_id="test", function_name="test", priority=TaskPriority.HIGH
        )

        assert task_def.priority == TaskPriority.HIGH
        assert task_def.priority.value == 3


class TestTaskResult:
    """Test task result functionality."""

    def test_task_result_creation(self):
        """Test creating a task result."""
        result = TaskResult(
            task_id="test-123", status=TaskStatus.COMPLETED, result="test_result"
        )

        assert result.task_id == "test-123"
        assert result.status == TaskStatus.COMPLETED
        assert result.result == "test_result"

    def test_task_result_serialization(self):
        """Test task result serialization."""
        result = TaskResult(
            task_id="test-123",
            status=TaskStatus.COMPLETED,
            result="test_result",
            execution_time=1.5,
        )

        result_dict = result.to_dict()
        assert isinstance(result_dict, dict)
        assert result_dict["task_id"] == "test-123"
        assert result_dict["status"] == "completed"
        assert result_dict["execution_time"] == 1.5


class TestTaskQueue:
    """Test the main task queue functionality."""

    @pytest.fixture
    async def task_queue(self, mock_redis):
        """Create task queue for testing."""
        queue = TaskQueue(
            redis_url="redis://localhost:6379",
            queue_name="test_queue",
            max_workers=2,
            enable_celery=False,
        )
        queue.redis = mock_redis
        await queue.initialize()
        return queue

    async def test_queue_initialization(self, task_queue):
        """Test queue initialization."""
        assert task_queue.running is True
        assert task_queue.redis is not None
        assert isinstance(task_queue.registry, TaskRegistry)

    async def test_builtin_tasks_registration(self, task_queue):
        """Test that built-in tasks are registered."""
        functions = task_queue.registry.list_functions()
        assert "echo" in functions
        assert "health_check" in functions
        assert "tool_execution" in functions

    async def test_task_submission(self, task_queue):
        """Test task submission."""
        task_id = await task_queue.submit_task(
            "echo", "test message", priority=TaskPriority.HIGH
        )

        assert isinstance(task_id, str)
        assert task_id in task_queue.active_tasks

        task_result = task_queue.active_tasks[task_id]
        assert task_result.status == TaskStatus.PENDING

    async def test_task_execution(self, task_queue):
        """Test task execution."""

        # Register a test function
        async def test_func(message):
            return f"processed: {message}"

        task_queue.registry.register("test_func", test_func)

        # Create and execute task
        task_def = TaskDefinition(
            task_id="test-exec", function_name="test_func", args=("hello",)
        )

        result = await task_queue.execute_task(task_def)

        assert result.status == TaskStatus.COMPLETED
        assert result.result == "processed: hello"
        assert result.execution_time > 0

    async def test_task_execution_with_timeout(self, task_queue):
        """Test task execution with timeout."""

        # Register a slow function
        async def slow_func():
            await asyncio.sleep(2)
            return "done"

        task_queue.registry.register("slow_func", slow_func)

        # Create task with timeout
        task_def = TaskDefinition(
            task_id="test-timeout",
            function_name="slow_func",
            timeout=0.1,  # Very short timeout
        )

        result = await task_queue.execute_task(task_def)

        assert result.status == TaskStatus.FAILED
        assert "timeout" in result.error.lower()

    async def test_task_retry_logic(self, task_queue):
        """Test task retry logic."""
        call_count = 0

        async def failing_func():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise RuntimeError("Simulated failure")
            return "success after retry"

        task_queue.registry.register("failing_func", failing_func)

        task_def = TaskDefinition(
            task_id="test-retry", function_name="failing_func", max_retries=3
        )

        result = await task_queue.execute_task(task_def)

        assert result.status == TaskStatus.COMPLETED
        assert result.result == "success after retry"
        assert result.attempts == 2  # Failed twice, succeeded on third attempt

    async def test_task_cancellation(self, task_queue):
        """Test task cancellation."""
        task_id = await task_queue.submit_task("echo", "test")

        # Cancel the task
        cancelled = await task_queue.cancel_task(task_id)
        assert cancelled is True

        # Check task status
        result = await task_queue.get_task_result(task_id)
        assert result.status == TaskStatus.CANCELLED

    async def test_queue_status(self, task_queue):
        """Test getting queue status."""
        status = await task_queue.get_status()

        assert isinstance(status, dict)
        assert "running" in status
        assert "workers" in status
        assert "active_tasks" in status
        assert "metrics" in status

        assert status["running"] is True

    async def test_task_priority_handling(self, task_queue, mock_redis):
        """Test priority-based task handling."""
        # Submit tasks with different priorities
        low_task = await task_queue.submit_task(
            "echo", "low", priority=TaskPriority.LOW
        )
        high_task = await task_queue.submit_task(
            "echo", "high", priority=TaskPriority.HIGH
        )
        normal_task = await task_queue.submit_task(
            "echo", "normal", priority=TaskPriority.NORMAL
        )

        # Verify Redis calls were made with correct priority queues
        mock_redis.lpush.assert_called()

        # Check that different priority queues were used
        calls = mock_redis.lpush.call_args_list
        queue_keys = [call[0][0] for call in calls]

        assert "test_queue:priority:1" in queue_keys  # LOW
        assert "test_queue:priority:2" in queue_keys  # NORMAL
        assert "test_queue:priority:3" in queue_keys  # HIGH

    async def test_health_check_task(self, task_queue):
        """Test built-in health check task."""
        # Mock the get_queue_size method
        task_queue.get_queue_size = AsyncMock(return_value=5)

        health_func = task_queue.registry.get("health_check")
        result = await health_func()

        assert isinstance(result, dict)
        assert result["status"] == "healthy"
        assert "timestamp" in result
        assert result["queue_size"] == 5

    async def test_echo_task(self, task_queue):
        """Test built-in echo task."""
        echo_func = task_queue.registry.get("echo")
        result = await echo_func("hello world")

        assert result == "Echo: hello world"

    async def test_queue_size_tracking(self, task_queue, mock_redis):
        """Test queue size tracking."""
        # Mock Redis llen to return different sizes for different priorities
        mock_redis.llen.side_effect = lambda key: {
            "test_queue:priority:1": 2,  # LOW
            "test_queue:priority:2": 3,  # NORMAL
            "test_queue:priority:3": 1,  # HIGH
            "test_queue:priority:4": 0,  # CRITICAL
        }.get(key, 0)

        total_size = await task_queue.get_queue_size()
        assert total_size == 6  # 2 + 3 + 1 + 0

    async def test_task_purging(self, task_queue):
        """Test purging old completed tasks."""
        # Add some old completed tasks
        old_result = TaskResult(
            task_id="old-task",
            status=TaskStatus.COMPLETED,
            completed_at=time.time() - 48 * 3600,  # 48 hours ago
        )
        recent_result = TaskResult(
            task_id="recent-task",
            status=TaskStatus.COMPLETED,
            completed_at=time.time() - 1 * 3600,  # 1 hour ago
        )

        task_queue.completed_tasks["old-task"] = old_result
        task_queue.completed_tasks["recent-task"] = recent_result

        # Purge tasks older than 24 hours
        purged_count = await task_queue.purge_completed_tasks(older_than_hours=24)

        assert purged_count == 1
        assert "old-task" not in task_queue.completed_tasks
        assert "recent-task" in task_queue.completed_tasks

    async def test_worker_startup(self, task_queue):
        """Test worker startup and management."""
        # Clear any existing workers
        for worker in task_queue.workers:
            worker.cancel()
        task_queue.workers.clear()

        # Start workers
        await task_queue.start_workers(num_workers=3)

        assert len(task_queue.workers) == 3

        # Verify all workers are running
        for worker in task_queue.workers:
            assert not worker.done()

    async def test_circuit_breaker_integration(self, task_queue):
        """Test circuit breaker integration."""

        # Register a function that always fails
        async def always_fails():
            raise RuntimeError("Always fails")

        task_queue.registry.register("always_fails", always_fails)

        task_def = TaskDefinition(
            task_id="test-circuit-breaker", function_name="always_fails", max_retries=0
        )

        result = await task_queue.execute_task(task_def)

        assert result.status == TaskStatus.FAILED
        assert "Always fails" in result.error

    async def test_queue_shutdown(self, task_queue):
        """Test graceful queue shutdown."""
        await task_queue.shutdown()

        assert task_queue.running is False

        # Verify all workers are cancelled
        for worker in task_queue.workers:
            assert worker.cancelled() or worker.done()


@pytest.mark.integration
class TestTaskQueueIntegration:
    """Integration tests for task queue with real dependencies."""

    @pytest.mark.slow
    async def test_end_to_end_task_processing(self, mock_redis):
        """Test complete end-to-end task processing."""
        queue = TaskQueue(
            redis_url="redis://localhost:6379",
            queue_name="integration_test",
            max_workers=1,
            enable_celery=False,
        )
        queue.redis = mock_redis

        try:
            await queue.initialize()
            await queue.start_workers(num_workers=1)

            # Submit a task
            task_id = await queue.submit_task("echo", "integration test")

            # Wait a bit for processing
            await asyncio.sleep(0.1)

            # Check result
            result = await queue.get_task_result(task_id)

            # Task should be processed or at least moved from pending
            assert result is not None

        finally:
            await queue.shutdown()

    async def test_high_throughput_processing(self, mock_redis):
        """Test high throughput task processing."""
        queue = TaskQueue(
            redis_url="redis://localhost:6379",
            queue_name="throughput_test",
            max_workers=4,
            enable_celery=False,
        )
        queue.redis = mock_redis

        try:
            await queue.initialize()
            await queue.start_workers()

            # Submit many tasks
            task_ids = []
            for i in range(50):
                task_id = await queue.submit_task("echo", f"message {i}")
                task_ids.append(task_id)

            # Wait for some processing
            await asyncio.sleep(0.5)

            # Check that tasks are being processed
            completed_count = 0
            for task_id in task_ids:
                result = await queue.get_task_result(task_id)
                if result and result.status == TaskStatus.COMPLETED:
                    completed_count += 1

            # At least some tasks should be completed
            assert completed_count > 0

        finally:
            await queue.shutdown()


@pytest.mark.performance
class TestTaskQueuePerformance:
    """Performance tests for task queue."""

    async def test_task_submission_performance(self, mock_redis):
        """Test task submission performance."""
        queue = TaskQueue(
            redis_url="redis://localhost:6379",
            queue_name="perf_test",
            enable_celery=False,
        )
        queue.redis = mock_redis
        await queue.initialize()

        try:
            # Measure submission time
            start_time = time.time()

            for i in range(100):
                await queue.submit_task("echo", f"perf test {i}")

            end_time = time.time()
            submission_time = end_time - start_time

            # Should be able to submit 100 tasks in under 1 second
            assert submission_time < 1.0

            # Calculate throughput
            throughput = 100 / submission_time
            assert throughput > 100  # At least 100 tasks/second

        finally:
            await queue.shutdown()

    async def test_memory_usage_stability(self, mock_redis):
        """Test memory usage remains stable."""
        import gc

        import psutil

        queue = TaskQueue(
            redis_url="redis://localhost:6379",
            queue_name="memory_test",
            enable_celery=False,
        )
        queue.redis = mock_redis
        await queue.initialize()

        try:
            process = psutil.Process()
            initial_memory = process.memory_info().rss

            # Submit and process many tasks
            for batch in range(10):
                for i in range(20):
                    await queue.submit_task("echo", f"batch {batch} task {i}")

                # Force garbage collection
                gc.collect()
                await asyncio.sleep(0.1)

            final_memory = process.memory_info().rss
            memory_increase = final_memory - initial_memory

            # Memory increase should be reasonable (less than 50MB)
            assert memory_increase < 50 * 1024 * 1024

        finally:
            await queue.shutdown()
