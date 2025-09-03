"""Distributed task queue system with retry mechanisms for MCP."""

import asyncio
import json
import logging
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import aioredis
from celery import Celery

from ..core.circuit_breakers import circuit_breaker

logger = logging.getLogger(__name__)


class TaskStatus(Enum):
    """Task execution status."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    CANCELLED = "cancelled"


class TaskPriority(Enum):
    """Task priority levels."""

    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class TaskResult:
    """Task execution result."""

    task_id: str
    status: TaskStatus
    result: Any | None = None
    error: str | None = None
    execution_time: float | None = None
    attempts: int = 0
    created_at: float = field(default_factory=time.time)
    started_at: float | None = None
    completed_at: float | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "task_id": self.task_id,
            "status": self.status.value,
            "result": self.result,
            "error": self.error,
            "execution_time": self.execution_time,
            "attempts": self.attempts,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
        }


@dataclass
class TaskDefinition:
    """Task definition with execution parameters."""

    task_id: str
    function_name: str
    args: tuple = field(default_factory=tuple)
    kwargs: dict = field(default_factory=dict)
    priority: TaskPriority = TaskPriority.NORMAL
    max_retries: int = 3
    retry_delay: float = 1.0
    timeout: float | None = None
    created_at: float = field(default_factory=time.time)
    scheduled_at: float | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "task_id": self.task_id,
            "function_name": self.function_name,
            "args": self.args,
            "kwargs": self.kwargs,
            "priority": self.priority.value,
            "max_retries": self.max_retries,
            "retry_delay": self.retry_delay,
            "timeout": self.timeout,
            "created_at": self.created_at,
            "scheduled_at": self.scheduled_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "TaskDefinition":
        """Create from dictionary."""
        return cls(
            task_id=data["task_id"],
            function_name=data["function_name"],
            args=data.get("args", ()),
            kwargs=data.get("kwargs", {}),
            priority=TaskPriority(data.get("priority", TaskPriority.NORMAL.value)),
            max_retries=data.get("max_retries", 3),
            retry_delay=data.get("retry_delay", 1.0),
            timeout=data.get("timeout"),
            created_at=data.get("created_at", time.time()),
            scheduled_at=data.get("scheduled_at"),
        )


class TaskRegistry:
    """Registry for task functions."""

    def __init__(self):
        self._functions: dict[str, Callable] = {}

    def register(self, name: str, func: Callable) -> None:
        """Register a task function."""
        self._functions[name] = func
        logger.info(f"Registered task function: {name}")

    def get(self, name: str) -> Callable | None:
        """Get registered task function."""
        return self._functions.get(name)

    def list_functions(self) -> list[str]:
        """List all registered function names."""
        return list(self._functions.keys())

    def unregister(self, name: str) -> None:
        """Unregister a task function."""
        self._functions.pop(name, None)
        logger.info(f"Unregistered task function: {name}")


class TaskQueue:
    """Distributed task queue with Redis backend and Celery integration."""

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        queue_name: str = "mcp_tasks",
        max_workers: int = 4,
        enable_celery: bool = True,
    ):
        self.redis_url = redis_url
        self.queue_name = queue_name
        self.max_workers = max_workers
        self.enable_celery = enable_celery

        self.redis: aioredis.Redis | None = None
        self.celery_app: Celery | None = None
        self.registry = TaskRegistry()

        # Task tracking
        self.active_tasks: dict[str, TaskResult] = {}
        self.completed_tasks: dict[str, TaskResult] = {}

        # Worker management
        self.workers: list[asyncio.Task] = []
        self.running = False

        # Metrics
        self.total_tasks_processed = 0
        self.total_tasks_failed = 0
        self.total_execution_time = 0.0

    async def initialize(self) -> None:
        """Initialize the task queue system."""
        logger.info("Initializing task queue system")

        # Connect to Redis
        self.redis = aioredis.from_url(self.redis_url)
        await self.redis.ping()
        logger.info("Connected to Redis")

        # Initialize Celery if enabled
        if self.enable_celery:
            self.celery_app = Celery(
                "mcp_tasks",
                broker=self.redis_url,
                backend=self.redis_url,
            )

            # Configure Celery
            self.celery_app.conf.update(
                task_serializer="json",
                accept_content=["json"],
                result_serializer="json",
                timezone="UTC",
                enable_utc=True,
                task_track_started=True,
                task_time_limit=300,  # 5 minutes
                task_soft_time_limit=240,  # 4 minutes
                worker_prefetch_multiplier=1,
                task_acks_late=True,
                worker_disable_rate_limits=False,
                task_compression="gzip",
                result_compression="gzip",
            )

            logger.info("Celery app initialized")

        # Register built-in task functions
        self._register_builtin_tasks()

        self.running = True
        logger.info("Task queue system initialized successfully")

    async def shutdown(self) -> None:
        """Shutdown the task queue system."""
        logger.info("Shutting down task queue system")

        self.running = False

        # Cancel all workers
        for worker in self.workers:
            worker.cancel()

        # Wait for workers to finish
        if self.workers:
            await asyncio.gather(*self.workers, return_exceptions=True)

        # Close Redis connection
        if self.redis:
            await self.redis.close()

        logger.info("Task queue system shutdown complete")

    def _register_builtin_tasks(self) -> None:
        """Register built-in task functions."""

        async def echo_task(message: str) -> str:
            """Simple echo task for testing."""
            await asyncio.sleep(0.1)  # Simulate work
            return f"Echo: {message}"

        async def health_check_task() -> dict[str, Any]:
            """Health check task."""
            return {
                "status": "healthy",
                "timestamp": time.time(),
                "queue_size": await self.get_queue_size(),
            }

        # Register the functions after definition
        self.registry.register("echo", echo_task)
        self.registry.register("health_check", health_check_task)

        # Register tool execution task after function definition
        self.registry.register("tool_execution", tool_execution_task)


# Define the tool execution task function outside the method
async def tool_execution_task(
    tool_name: str, parameters: dict[str, Any]
) -> dict[str, Any]:
    """Execute MCP tool task."""
    # This would integrate with the MCP server
    # For now, return a placeholder
    return {
        "tool": tool_name,
        "parameters": parameters,
        "result": f"Executed {tool_name} with parameters {parameters}",
        "execution_time": time.time(),
    }

    async def submit_task(
        self,
        function_name: str,
        *args,
        priority: TaskPriority = TaskPriority.NORMAL,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        timeout: float | None = None,
        scheduled_at: float | None = None,
        **kwargs,
    ) -> str:
        """Submit a task to the queue."""
        task_id = str(uuid.uuid4())

        task_def = TaskDefinition(
            task_id=task_id,
            function_name=function_name,
            args=args,
            kwargs=kwargs,
            priority=priority,
            max_retries=max_retries,
            retry_delay=retry_delay,
            timeout=timeout,
            scheduled_at=scheduled_at,
        )

        if self.enable_celery and self.celery_app:
            # Use Celery for distributed execution
            celery_task = self.celery_app.send_task(
                "execute_mcp_task",
                args=[task_def.to_dict()],
                priority=priority.value,
                countdown=scheduled_at - time.time() if scheduled_at else 0,
            )
            task_id = celery_task.id
        else:
            # Use local queue
            queue_key = f"{self.queue_name}:priority:{priority.value}"
            await self.redis.lpush(queue_key, json.dumps(task_def.to_dict()))

        # Track task
        task_result = TaskResult(task_id=task_id, status=TaskStatus.PENDING)
        self.active_tasks[task_id] = task_result

        logger.info(f"Submitted task {task_id}: {function_name}")
        return task_id

    @circuit_breaker("task_execution")
    async def execute_task(self, task_def: TaskDefinition) -> TaskResult:
        """Execute a single task with error handling and retries."""
        task_result = TaskResult(task_id=task_def.task_id, status=TaskStatus.RUNNING)
        task_result.started_at = time.time()

        try:
            # Get task function
            func = self.registry.get(task_def.function_name)
            if not func:
                raise ValueError(f"Unknown task function: {task_def.function_name}")

            # Execute with timeout
            if task_def.timeout:
                result = await asyncio.wait_for(
                    func(*task_def.args, **task_def.kwargs), timeout=task_def.timeout
                )
            else:
                result = await func(*task_def.args, **task_def.kwargs)

            # Success
            task_result.status = TaskStatus.COMPLETED
            task_result.result = result
            task_result.completed_at = time.time()
            task_result.execution_time = (
                task_result.completed_at - task_result.started_at
            )

            self.total_tasks_processed += 1
            self.total_execution_time += task_result.execution_time

            logger.info(
                f"Task {task_def.task_id} completed successfully in {task_result.execution_time:.3f}s"
            )

        except Exception as e:
            task_result.status = TaskStatus.FAILED
            task_result.error = str(e)
            task_result.completed_at = time.time()
            task_result.execution_time = (
                task_result.completed_at - task_result.started_at
            )

            self.total_tasks_failed += 1
            logger.error(f"Task {task_def.task_id} failed: {e}")

            # Retry logic
            if task_result.attempts < task_def.max_retries:
                task_result.status = TaskStatus.RETRYING
                task_result.attempts += 1

                # Schedule retry
                await asyncio.sleep(
                    task_def.retry_delay * (2**task_result.attempts)
                )  # Exponential backoff
                return await self.execute_task(task_def)

        return task_result

    async def start_workers(self, num_workers: int | None = None) -> None:
        """Start worker processes to consume tasks."""
        if not self.running:
            return

        num_workers = num_workers or self.max_workers

        for i in range(num_workers):
            worker = asyncio.create_task(self._worker_loop(f"worker-{i}"))
            self.workers.append(worker)

        logger.info(f"Started {num_workers} task workers")

    async def _worker_loop(self, worker_name: str) -> None:
        """Main worker loop to process tasks."""
        logger.info(f"Worker {worker_name} started")

        while self.running:
            try:
                # Get task from highest priority queue
                task_data = None
                for priority in [
                    TaskPriority.CRITICAL,
                    TaskPriority.HIGH,
                    TaskPriority.NORMAL,
                    TaskPriority.LOW,
                ]:
                    queue_key = f"{self.queue_name}:priority:{priority.value}"
                    result = await self.redis.brpop(queue_key, timeout=1)
                    if result:
                        task_data = json.loads(result[1])
                        break

                if not task_data:
                    continue

                # Execute task
                task_def = TaskDefinition.from_dict(task_data)
                task_result = await self.execute_task(task_def)

                # Store result
                await self._store_task_result(task_result)

            except Exception as e:
                logger.error(f"Worker {worker_name} error: {e}")
                await asyncio.sleep(1)  # Brief pause before retrying

        logger.info(f"Worker {worker_name} stopped")

    async def _store_task_result(self, task_result: TaskResult) -> None:
        """Store task result in Redis."""
        result_key = f"{self.queue_name}:results:{task_result.task_id}"
        await self.redis.setex(
            result_key,
            3600,  # 1 hour TTL
            json.dumps(task_result.to_dict()),
        )

        # Move from active to completed
        if task_result.task_id in self.active_tasks:
            del self.active_tasks[task_result.task_id]
        self.completed_tasks[task_result.task_id] = task_result

        # Limit completed tasks in memory
        if len(self.completed_tasks) > 1000:
            # Remove oldest
            oldest_id = min(
                self.completed_tasks.keys(),
                key=lambda x: self.completed_tasks[x].completed_at or 0,
            )
            del self.completed_tasks[oldest_id]

    async def get_task_result(self, task_id: str) -> TaskResult | None:
        """Get task result by ID."""
        # Check active tasks first
        if task_id in self.active_tasks:
            return self.active_tasks[task_id]

        # Check completed tasks
        if task_id in self.completed_tasks:
            return self.completed_tasks[task_id]

        # Check Redis
        result_key = f"{self.queue_name}:results:{task_id}"
        result_data = await self.redis.get(result_key)
        if result_data:
            result_dict = json.loads(result_data)
            return TaskResult(
                task_id=result_dict["task_id"],
                status=TaskStatus(result_dict["status"]),
                result=result_dict.get("result"),
                error=result_dict.get("error"),
                execution_time=result_dict.get("execution_time"),
                attempts=result_dict.get("attempts", 0),
                created_at=result_dict.get("created_at", 0),
                started_at=result_dict.get("started_at"),
                completed_at=result_dict.get("completed_at"),
            )

        return None

    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a pending or running task."""
        if task_id in self.active_tasks:
            task_result = self.active_tasks[task_id]
            if task_result.status in [TaskStatus.PENDING, TaskStatus.RETRYING]:
                task_result.status = TaskStatus.CANCELLED
                task_result.completed_at = time.time()
                await self._store_task_result(task_result)
                logger.info(f"Cancelled task {task_id}")
                return True

        return False

    async def get_queue_size(self) -> int:
        """Get total number of pending tasks."""
        total = 0
        for priority in TaskPriority:
            queue_key = f"{self.queue_name}:priority:{priority.value}"
            size = await self.redis.llen(queue_key)
            total += size
        return total

    async def get_status(self) -> dict[str, Any]:
        """Get comprehensive queue status."""
        queue_sizes = {}
        for priority in TaskPriority:
            queue_key = f"{self.queue_name}:priority:{priority.value}"
            size = await self.redis.llen(queue_key)
            queue_sizes[priority.name.lower()] = size

        return {
            "running": self.running,
            "workers": len(self.workers),
            "active_tasks": len(self.active_tasks),
            "completed_tasks": len(self.completed_tasks),
            "queue_sizes": queue_sizes,
            "total_queue_size": sum(queue_sizes.values()),
            "registered_functions": len(self.registry.list_functions()),
            "metrics": {
                "total_processed": self.total_tasks_processed,
                "total_failed": self.total_tasks_failed,
                "success_rate": (
                    (self.total_tasks_processed - self.total_tasks_failed)
                    / self.total_tasks_processed
                    if self.total_tasks_processed > 0
                    else 0
                ),
                "average_execution_time": (
                    self.total_execution_time / self.total_tasks_processed
                    if self.total_tasks_processed > 0
                    else 0
                ),
            },
            "registered_functions": self.registry.list_functions(),
        }

    async def purge_completed_tasks(self, older_than_hours: int = 24) -> int:
        """Purge completed tasks older than specified hours."""
        cutoff_time = time.time() - (older_than_hours * 3600)
        purged_count = 0

        for task_id in list(self.completed_tasks.keys()):
            task_result = self.completed_tasks[task_id]
            if task_result.completed_at and task_result.completed_at < cutoff_time:
                del self.completed_tasks[task_id]

                # Remove from Redis too
                result_key = f"{self.queue_name}:results:{task_id}"
                await self.redis.delete(result_key)
                purged_count += 1

        logger.info(
            f"Purged {purged_count} completed tasks older than {older_than_hours} hours"
        )
        return purged_count


# Task execution decorator for easy task registration
def task(
    queue: TaskQueue,
    name: str | None = None,
    priority: TaskPriority = TaskPriority.NORMAL,
    max_retries: int = 3,
    retry_delay: float = 1.0,
    timeout: float | None = None,
):
    """Decorator to register a function as a task."""

    def decorator(func):
        task_name = name or func.__name__
        queue.registry.register(task_name, func)

        async def submit_task(*args, **kwargs):
            return await queue.submit_task(
                task_name,
                *args,
                priority=priority,
                max_retries=max_retries,
                retry_delay=retry_delay,
                timeout=timeout,
                **kwargs,
            )

        # Add submit method to function
        func.submit = submit_task
        return func

    return decorator
