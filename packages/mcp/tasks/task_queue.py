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

try:
    # Prefer redis.asyncio (newer, maintained)
    import redis.asyncio as redis_client
except ImportError:
    # Fallback to aioredis if redis package not available
    import aioredis as redis_client
from celery import Celery

# Import circuit_breaker if available, otherwise create a dummy decorator
try:
    from ..core.circuit_breakers import circuit_breaker
except ImportError:

    def circuit_breaker(name):
        def decorator(func):
            return func

        return decorator


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

        self.redis: Any | None = None
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
        self.redis = redis_client.from_url(self.redis_url)
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

    def _register_builtin_tasks(self) -> None:
        """Register built-in task functions."""

        async def echo_task(message: str) -> dict[str, Any]:
            """Echo task for testing."""
            return {"echo": message, "timestamp": time.time()}

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
        self.registry.register("tool_execution", tool_execution_task)

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
            # Get the function
            func = self.registry.get(task_def.function_name)
            if not func:
                raise ValueError(f"Function {task_def.function_name} not registered")

            # Execute with timeout
            if task_def.timeout:
                result = await asyncio.wait_for(
                    func(*task_def.args, **task_def.kwargs),
                    timeout=task_def.timeout,
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

            # Update metrics
            self.total_tasks_processed += 1
            self.total_execution_time += task_result.execution_time

            logger.info(f"Task {task_def.task_id} completed successfully")

        except Exception as e:
            # Handle errors
            task_result.status = TaskStatus.FAILED
            task_result.error = str(e)
            task_result.completed_at = time.time()
            task_result.execution_time = (
                task_result.completed_at - task_result.started_at
            )

            # Update metrics
            self.total_tasks_failed += 1

            logger.error(f"Task {task_def.task_id} failed: {e}")

            # Retry logic
            if task_result.attempts < task_def.max_retries:
                task_result.status = TaskStatus.RETRYING
                task_result.attempts += 1
                logger.info(
                    f"Retrying task {task_def.task_id} (attempt {task_result.attempts})"
                )

                # Schedule retry
                await asyncio.sleep(task_def.retry_delay)
                return await self.execute_task(task_def)

        return task_result

    async def start_workers(self, num_workers: int | None = None) -> None:
        """Start worker tasks."""
        if not self.running:
            raise RuntimeError("Queue not initialized")

        num_workers = num_workers or self.max_workers

        for i in range(num_workers):
            worker = asyncio.create_task(self._worker_loop(f"worker-{i}"))
            self.workers.append(worker)

        logger.info(f"Started {num_workers} workers")

    async def _worker_loop(self, worker_id: str) -> None:
        """Main worker loop."""
        logger.info(f"Worker {worker_id} started")

        while self.running:
            try:
                # Get tasks from priority queues (highest first)
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

                if task_data:
                    task_def = TaskDefinition.from_dict(task_data)
                    logger.info(
                        f"Worker {worker_id} processing task {task_def.task_id}"
                    )

                    # Execute task
                    task_result = await self.execute_task(task_def)

                    # Store result
                    await self._store_result(task_result)

                    # Move from active to completed
                    if task_def.task_id in self.active_tasks:
                        del self.active_tasks[task_def.task_id]
                    self.completed_tasks[task_def.task_id] = task_result

            except Exception as e:
                logger.error(f"Worker {worker_id} error: {e}")
                await asyncio.sleep(1)

        logger.info(f"Worker {worker_id} stopped")

    async def _store_result(self, task_result: TaskResult) -> None:
        """Store task result in Redis."""
        result_key = f"{self.queue_name}:results:{task_result.task_id}"
        await self.redis.set(
            result_key,
            json.dumps(task_result.to_dict()),
            ex=3600,  # Expire after 1 hour
        )

    async def get_queue_size(self) -> dict[str, int]:
        """Get queue sizes by priority."""
        sizes = {}
        for priority in TaskPriority:
            queue_key = f"{self.queue_name}:priority:{priority.value}"
            size = await self.redis.llen(queue_key)
            sizes[priority.name] = size
        return sizes

    async def shutdown(self) -> None:
        """Shutdown the task queue system."""
        logger.info("Shutting down task queue system")
        self.running = False

        # Cancel all workers
        for worker in self.workers:
            worker.cancel()

        # Wait for workers to stop
        if self.workers:
            await asyncio.gather(*self.workers, return_exceptions=True)

        # Close Redis connection
        if self.redis:
            await self.redis.aclose()

        logger.info("Task queue system shut down")


# Define the tool execution task function outside the class
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
