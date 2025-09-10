"""Distributed task queue system with retry mechanisms for MCP.

This module is designed to run without hard dependencies on Redis/Celery at
import time so unit tests can inject mocks. Real connections are established
only during ``initialize()`` when no mock has been provided.
"""

import asyncio
import json
import logging
import time
import uuid
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from enum import Enum
from importlib import import_module
from typing import Any

# Import circuit_breaker if available, otherwise create a dummy decorator
try:
    from ..core.circuit_breakers import circuit_breaker
except ImportError:

    def circuit_breaker(
        _name: str, _config: Any | None = None
    ) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
        def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
            async def wrapper(*args: Any, **kwargs: Any) -> Any:
                # Transparent pass-through wrapper
                return await func(*args, **kwargs)  # type: ignore[misc]

            return wrapper

        return decorator


logger = logging.getLogger(__name__)

# Optional OpenTelemetry metrics
try:  # pragma: no cover - import guard
    from opentelemetry import metrics as _otel_metrics  # type: ignore

    _METER = _otel_metrics.get_meter("mcp.tasks")
    _otel_tool_counter = _METER.create_counter(
        name="mcp_tool_executions_total",
        unit="1",
        description="Total tool executions",
    )
    _otel_tool_duration = _METER.create_histogram(
        name="mcp_tool_execution_duration_seconds",
        unit="s",
        description="Tool execution duration",
    )
except Exception:  # pragma: no cover - proceed without OTEL
    _otel_tool_counter = None
    _otel_tool_duration = None


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
    args: tuple[Any, ...] = field(default_factory=tuple)
    kwargs: dict[str, Any] = field(default_factory=dict)
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
    """Registry for task functions with optional allowlist."""

    def __init__(self, allowed_tools: Iterable[str] | None = None) -> None:
        self._functions: dict[str, Callable[..., Any]] = {}
        self.allowed_tools = set(allowed_tools) if allowed_tools is not None else None

    def register(self, name: str, func: Callable[..., Any]) -> None:
        """Register a task function."""
        self._functions[name] = func
        logger.info(f"Registered task function: {name}")

    def get(self, name: str) -> Callable[..., Any] | None:
        """Get registered task function if allowlisted."""
        if self.allowed_tools is not None and name not in self.allowed_tools:
            raise PermissionError(f"Tool {name} not allowlisted")
        return self._functions.get(name)

    def list_functions(self) -> list[str]:
        """List allowlisted function names."""
        if self.allowed_tools is None:
            return list(self._functions.keys())
        return [name for name in self._functions if name in self.allowed_tools]

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
        allowed_tools: Iterable[str] | None = None,
    ):
        self.redis_url = redis_url
        self.queue_name = queue_name
        self.max_workers = max_workers
        self.enable_celery = enable_celery

        self.redis: Any | None = None
        self.celery_app: Any | None = None
        self.registry = TaskRegistry(allowed_tools=allowed_tools)

        # Task tracking
        self.active_tasks: dict[str, TaskResult] = {}
        self.completed_tasks: dict[str, TaskResult] = {}

        # Worker management
        self.workers: list[asyncio.Task[Any]] = []
        self.running = False

        # Metrics
        self.total_tasks_processed = 0
        self.total_tasks_failed = 0
        self.total_execution_time = 0.0
        # Per-tool metrics
        self.tool_metrics: dict[str, dict[str, float | int]] = {}

    async def initialize(self) -> None:
        """Initialize the task queue system."""
        logger.info("Initializing task queue system")

        # Connect to Redis if not injected by tests
        if self.redis is None:
            # Dynamically import a Redis client implementation
            try:
                _redis_mod = import_module("redis.asyncio")
            except Exception:
                try:
                    _redis_mod = import_module("aioredis")
                except Exception as e:  # pragma: no cover - only hits without deps
                    raise RuntimeError(
                        "Redis client not installed. Install 'redis' or 'aioredis'."
                    ) from e

            self.redis = _redis_mod.from_url(self.redis_url)

        # Verify connection if ping() exists
        if hasattr(self.redis, "ping"):
            await self.redis.ping()
        logger.info("Connected to Redis (mock or real)")

        # Initialize Celery if enabled
        if self.enable_celery:
            # Lazy import Celery only when enabled
            try:  # pragma: no cover - exercised in integration
                celery_class = import_module("celery").Celery  # type: ignore[attr-defined]
            except Exception as e:
                raise RuntimeError(
                    "Celery is not installed. Install 'celery[redis]' to enable."
                ) from e

            self.celery_app = celery_class(
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

        async def echo_task(message: str) -> str:
            """Echo task for testing."""
            # Tests expect a simple string response
            await asyncio.sleep(0)  # keep async contract
            return "Echo: " + message

        async def health_check_task() -> dict[str, Any]:
            """Health check task."""
            return {
                "status": "healthy",
                "timestamp": time.time(),
                # get_queue_size returns a total integer; tests may stub it
                "queue_size": await self.get_queue_size(),
            }

        async def tool_execution_wrapper(
            tool_name: str, parameters: dict[str, Any]
        ) -> dict[str, Any]:
            return await tool_execution_task(self, tool_name, parameters)

        # Register the functions after definition
        self.registry.register("echo", echo_task)
        self.registry.register("health_check", health_check_task)
        self.registry.register("tool_execution", tool_execution_wrapper)

    async def submit_task(
        self,
        function_name: str,
        *args: Any,
        priority: TaskPriority = TaskPriority.NORMAL,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        timeout: float | None = None,
        scheduled_at: float | None = None,
        **kwargs: Any,
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
            assert self.redis is not None
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
                try:
                    result = await asyncio.wait_for(
                        func(*task_def.args, **task_def.kwargs),
                        timeout=task_def.timeout,
                    )
                except TimeoutError as te:
                    # Normalize timeout error message for tests
                    raise RuntimeError("Task execution timeout") from te
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
                    assert self.redis is not None
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
        assert self.redis is not None
        await self.redis.set(
            result_key,
            json.dumps(task_result.to_dict()),
            ex=3600,  # Expire after 1 hour
        )

    async def get_queue_size(self) -> int:
        """Get total queue size across all priorities.

        Tests expect an integer total; individual sizes are not currently
        required. We can add a verbose variant later if needed.
        """
        total = 0
        for priority in TaskPriority:
            queue_key = f"{self.queue_name}:priority:{priority.value}"
            assert self.redis is not None
            size = await self.redis.llen(queue_key)
            total += size
        return total

    async def get_task_result(self, task_id: str) -> TaskResult | None:
        """Retrieve a task result from memory or Redis if available."""
        # Prefer in-memory state first
        if task_id in self.completed_tasks:
            return self.completed_tasks[task_id]
        if task_id in self.active_tasks:
            return self.active_tasks[task_id]

        # Fallback to Redis stored result
        result_key = f"{self.queue_name}:results:{task_id}"
        if hasattr(self.redis, "get"):
            assert self.redis is not None
            raw = await self.redis.get(result_key)
            if raw:
                try:
                    data = json.loads(raw)
                    return TaskResult(
                        task_id=data.get("task_id", task_id),
                        status=TaskStatus(data.get("status", TaskStatus.FAILED.value)),
                        result=data.get("result"),
                        error=data.get("error"),
                        execution_time=data.get("execution_time"),
                        attempts=data.get("attempts", 0),
                        created_at=data.get("created_at", time.time()),
                        started_at=data.get("started_at"),
                        completed_at=data.get("completed_at"),
                    )
                except Exception:  # pragma: no cover - defensive
                    return None
        return None

    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a pending task by marking it as cancelled and storing result."""
        result = self.active_tasks.get(task_id)
        if not result:
            # Nothing to cancel
            return False

        result.status = TaskStatus.CANCELLED
        result.completed_at = time.time()
        result.execution_time = (
            (result.completed_at - (result.started_at or result.created_at))
            if (result.completed_at and (result.started_at or result.created_at))
            else None
        )

        # Persist and move to completed
        await self._store_result(result)
        self.completed_tasks[task_id] = result
        self.active_tasks.pop(task_id, None)
        return True

    async def get_status(self) -> dict[str, Any]:
        """Return current queue status and metrics."""
        await asyncio.sleep(0)
        return {
            "running": self.running,
            "workers": len(self.workers),
            "active_tasks": len(self.active_tasks),
            "completed_tasks": len(self.completed_tasks),
            "metrics": {
                "total_tasks_processed": self.total_tasks_processed,
                "total_tasks_failed": self.total_tasks_failed,
                "total_execution_time": self.total_execution_time,
                "tools": self.tool_metrics,
            },
        }

    async def purge_completed_tasks(self, older_than_hours: int = 24) -> int:
        """Purge completed task records older than a threshold.

        Returns the number of purged tasks.
        """
        await asyncio.sleep(0)
        cutoff = time.time() - older_than_hours * 3600
        to_delete: list[str] = []
        for task_id, result in self.completed_tasks.items():
            if result.completed_at and result.completed_at < cutoff:
                to_delete.append(task_id)

        for task_id in to_delete:
            self.completed_tasks.pop(task_id, None)
        return len(to_delete)

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
            if hasattr(self.redis, "aclose"):
                await self.redis.aclose()
            elif hasattr(self.redis, "close"):
                # Some clients expose sync close; call in thread if needed
                from contextlib import suppress

                with suppress(Exception):
                    await asyncio.to_thread(self.redis.close)

        logger.info("Task queue system shut down")


# Define the tool execution task function outside the class
async def tool_execution_task(
    queue: "TaskQueue", tool_name: str, parameters: dict[str, Any]
) -> dict[str, Any]:
    """Execute MCP tool task with registry lookup and allowlist enforcement."""
    try:
        func = queue.registry.get(tool_name)
    except PermissionError as e:
        # Preserve PermissionError to honor tests and signal authorization issues
        raise e
    if func is None:
        raise ValueError(f"Function {tool_name} not registered")
    start = time.time()
    result = await func(**parameters)
    duration = time.time() - start
    # Update per-tool metrics
    tm = queue.tool_metrics.setdefault(tool_name, {"count": 0, "total_latency": 0.0})
    tm["count"] = int(tm.get("count", 0)) + 1
    tm["total_latency"] = float(tm.get("total_latency", 0.0)) + float(duration)
    # Prometheus-style metrics
    try:
        from ..observability.metrics import get_metrics_collector

        get_metrics_collector().record_tool_execution(tool_name, duration)
    except Exception:  # pragma: no cover
        pass
    # OpenTelemetry metrics (optional)
    if _otel_tool_counter and _otel_tool_duration:  # pragma: no cover - env dependent
        try:
            _otel_tool_counter.add(1, {"tool_name": tool_name})
            _otel_tool_duration.record(duration, {"tool_name": tool_name})
        except Exception:
            pass
    return {
        "tool": tool_name,
        "parameters": parameters,
        "result": result,
        "execution_time": duration,
    }

def get_tool_metrics(queue: "TaskQueue") -> dict[str, dict[str, float | int]]:
    """Expose per-tool metrics snapshot."""
    return queue.tool_metrics


def task(
    queue: TaskQueue,
    name: str | None = None,
    priority: TaskPriority = TaskPriority.NORMAL,
    max_retries: int = 3,
    retry_delay: float = 1.0,
    timeout: float | None = None,
) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """Decorator to register a function as a task."""

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        task_name = name or func.__name__
        queue.registry.register(task_name, func)

        async def submit_task(*args: Any, **kwargs: Any) -> str:
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
        func.submit = submit_task  # type: ignore[attr-defined]
        return func

    return decorator
