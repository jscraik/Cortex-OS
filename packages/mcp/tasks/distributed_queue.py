"""Distributed task queue implementation with Celery backend."""

import logging
import os
import time
from typing import Any

from celery import Celery
from celery.result import AsyncResult
from kombu import Queue

logger = logging.getLogger(__name__)


class CeleryTaskQueue:
    """Celery-based distributed task queue for production deployments."""

    def __init__(
        self,
        broker_url: str = "redis://localhost:6379/0",
        result_backend: str = "redis://localhost:6379/0",
        app_name: str = "mcp_distributed_tasks",
    ):
        self.broker_url = broker_url
        self.result_backend = result_backend
        self.app_name = app_name

        self.celery_app = self._create_celery_app()
        self._register_tasks()

    def _create_celery_app(self) -> Celery:
        """Create and configure Celery application."""
        app = Celery(self.app_name)

        # Configuration
        app.conf.update(
            broker_url=self.broker_url,
            result_backend=self.result_backend,
            # Serialization
            task_serializer="json",
            accept_content=["json"],
            result_serializer="json",
            # Timezone
            timezone="UTC",
            enable_utc=True,
            # Task routing
            task_routes={
                "mcp.tasks.tool_execution": {"queue": "tools"},
                "mcp.tasks.plugin_operation": {"queue": "plugins"},
                "mcp.tasks.health_check": {"queue": "monitoring"},
                "mcp.tasks.batch_operation": {"queue": "batch"},
            },
            # Queue configuration
            task_default_queue="default",
            task_queues=(
                Queue("default", routing_key="default"),
                Queue("tools", routing_key="tools"),
                Queue("plugins", routing_key="plugins"),
                Queue("monitoring", routing_key="monitoring"),
                Queue("batch", routing_key="batch"),
                Queue("priority", routing_key="priority"),
            ),
            # Worker configuration
            worker_prefetch_multiplier=4,
            task_acks_late=True,
            worker_disable_rate_limits=False,
            task_track_started=True,
            # Timeouts
            task_time_limit=300,  # 5 minutes hard limit
            task_soft_time_limit=240,  # 4 minutes soft limit
            # Retry configuration
            task_retry_delay=60,  # 1 minute
            task_max_retries=3,
            # Compression
            task_compression="gzip",
            result_compression="gzip",
            # Security (for production)
            task_always_eager=False,
            task_store_eager_result=False,
            # Monitoring
            worker_send_task_events=True,
            task_send_sent_event=True,
            # Result expiration
            result_expires=3600,  # 1 hour
            # Worker configuration
            worker_max_tasks_per_child=1000,
            worker_max_memory_per_child=200000,  # 200MB
        )

        return app

    def _register_tasks(self) -> None:
        """Register Celery tasks."""

        @self.celery_app.task(name="mcp.tasks.execute_tool", bind=True)
        def execute_tool_task(
            self, tool_name: str, parameters: dict[str, Any]
        ) -> dict[str, Any]:
            """Execute MCP tool via Celery task."""
            import time

            start_time = time.time()

            try:
                # This would integrate with the actual MCP tool execution
                # For now, simulate tool execution
                result = {
                    "tool": tool_name,
                    "parameters": parameters,
                    "status": "completed",
                    "timestamp": start_time,
                }

                # Simulate execution time
                import random

                execution_time = random.uniform(0.1, 2.0)
                time.sleep(execution_time)

                result["execution_time"] = time.time() - start_time

                return result

            except Exception as e:
                # Retry logic
                if self.request.retries < 3:
                    raise self.retry(
                        exc=e,
                        countdown=60 * (2**self.request.retries),  # Exponential backoff
                        max_retries=3,
                    ) from e
                raise

        @self.celery_app.task(name="mcp.tasks.reload_plugin", bind=True)
        def reload_plugin_task(self, plugin_name: str) -> dict[str, Any]:
            """Reload MCP plugin via Celery task."""
            try:
                # This would integrate with the actual plugin reloader
                result = {
                    "plugin": plugin_name,
                    "status": "reloaded",
                    "timestamp": time.time(),
                }

                return result

            except Exception as e:
                if self.request.retries < 2:  # Fewer retries for plugin operations
                    raise self.retry(
                        exc=e, countdown=30 * (2**self.request.retries), max_retries=2
                    ) from e
                raise

        @self.celery_app.task(name="mcp.tasks.health_check")
        def health_check_task() -> dict[str, Any]:
            """Health check task for monitoring."""
            import time

            import psutil

            return {
                "status": "healthy",
                "timestamp": time.time(),
                "system": {
                    "cpu_percent": psutil.cpu_percent(),
                    "memory_percent": psutil.virtual_memory().percent,
                    "disk_percent": psutil.disk_usage("/").percent,
                },
                "worker_id": os.getenv("CELERY_WORKER_ID", "unknown"),
            }

        @self.celery_app.task(name="mcp.tasks.batch_operation", bind=True)
        def batch_operation_task(_self, operation: str, items: list) -> dict[str, Any]:
            """Execute batch operations."""
            import time

            start_time = time.time()

            results = []
            failed_items = []

            for item in items:
                try:
                    # Process each item
                    if operation == "validate":
                        # Simulate validation
                        time.sleep(0.01)
                        results.append({"item": item, "status": "valid"})
                    elif operation == "transform":
                        # Simulate transformation
                        time.sleep(0.02)
                        results.append(
                            {"item": item, "transformed": f"processed_{item}"}
                        )
                    else:
                        results.append({"item": item, "status": "unknown_operation"})

                except Exception as e:
                    failed_items.append({"item": item, "error": str(e)})

            return {
                "operation": operation,
                "total_items": len(items),
                "successful": len(results),
                "failed": len(failed_items),
                "results": results,
                "failed_items": failed_items,
                "execution_time": time.time() - start_time,
            }

    async def submit_tool_execution(
        self,
        tool_name: str,
        parameters: dict[str, Any],
        priority: int = 5,
        countdown: int = 0,
    ) -> str:
        """Submit tool execution task."""
        result = self.celery_app.send_task(
            "mcp.tasks.execute_tool",
            args=[tool_name, parameters],
            priority=priority,
            countdown=countdown,
            queue="tools",
        )

        logger.info(f"Submitted tool execution task {result.id}: {tool_name}")
        return result.id

    async def submit_plugin_reload(self, plugin_name: str) -> str:
        """Submit plugin reload task."""
        result = self.celery_app.send_task(
            "mcp.tasks.reload_plugin",
            args=[plugin_name],
            queue="plugins",
        )

        logger.info(f"Submitted plugin reload task {result.id}: {plugin_name}")
        return result.id

    async def submit_batch_operation(
        self,
        operation: str,
        items: list,
        chunk_size: int = 100,
    ) -> list:
        """Submit batch operation, splitting into chunks if necessary."""
        task_ids = []

        # Split large batches into chunks
        for i in range(0, len(items), chunk_size):
            chunk = items[i : i + chunk_size]
            result = self.celery_app.send_task(
                "mcp.tasks.batch_operation",
                args=[operation, chunk],
                queue="batch",
            )
            task_ids.append(result.id)

        logger.info(f"Submitted {len(task_ids)} batch operation tasks for {operation}")
        return task_ids

    async def get_task_result(self, task_id: str) -> dict[str, Any] | None:
        """Get task result by ID."""
        try:
            result = AsyncResult(task_id, app=self.celery_app)

            if result.ready():
                if result.successful():
                    return {
                        "task_id": task_id,
                        "status": "completed",
                        "result": result.result,
                        "execution_info": result.info,
                    }
                else:
                    return {
                        "task_id": task_id,
                        "status": "failed",
                        "error": str(result.info),
                        "traceback": result.traceback,
                    }
            else:
                return {
                    "task_id": task_id,
                    "status": "pending"
                    if result.state == "PENDING"
                    else result.state.lower(),
                    "info": result.info,
                }
        except Exception as e:
            logger.error(f"Error getting task result {task_id}: {e}")
            return None

    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a task."""
        try:
            self.celery_app.control.revoke(task_id, terminate=True)
            logger.info(f"Cancelled task {task_id}")
            return True
        except Exception as e:
            logger.error(f"Error cancelling task {task_id}: {e}")
            return False

    async def get_queue_stats(self) -> dict[str, Any]:
        """Get queue statistics."""
        try:
            # Get active tasks
            active_tasks = self.celery_app.control.inspect().active()

            # Get scheduled tasks
            scheduled_tasks = self.celery_app.control.inspect().scheduled()

            # Get reserved tasks
            reserved_tasks = self.celery_app.control.inspect().reserved()

            # Count tasks by queue
            queue_stats = {}
            total_active = 0
            total_scheduled = 0
            total_reserved = 0

            if active_tasks:
                for _worker, tasks in active_tasks.items():
                    total_active += len(tasks)
                    for task in tasks:
                        queue = task.get("delivery_info", {}).get(
                            "routing_key", "unknown"
                        )
                        queue_stats[queue] = queue_stats.get(
                            queue, {"active": 0, "scheduled": 0, "reserved": 0}
                        )
                        queue_stats[queue]["active"] += 1

            if scheduled_tasks:
                for _worker, tasks in scheduled_tasks.items():
                    total_scheduled += len(tasks)

            if reserved_tasks:
                for _worker, tasks in reserved_tasks.items():
                    total_reserved += len(tasks)

            return {
                "total_active": total_active,
                "total_scheduled": total_scheduled,
                "total_reserved": total_reserved,
                "queue_stats": queue_stats,
                "workers": len(active_tasks) if active_tasks else 0,
            }

        except Exception as e:
            logger.error(f"Error getting queue stats: {e}")
            return {"error": str(e)}

    async def get_worker_stats(self) -> dict[str, Any]:
        """Get worker statistics."""
        try:
            stats = self.celery_app.control.inspect().stats()

            if not stats:
                return {"workers": 0, "error": "No workers available"}

            worker_info = {}
            for worker_name, worker_stats in stats.items():
                worker_info[worker_name] = {
                    "total_tasks": worker_stats.get("total", {}),
                    "pool_stats": worker_stats.get("pool", {}),
                    "rusage": worker_stats.get("rusage", {}),
                }

            return {
                "workers": len(stats),
                "worker_info": worker_info,
            }

        except Exception as e:
            logger.error(f"Error getting worker stats: {e}")
            return {"error": str(e)}

    def start_worker(
        self,
        loglevel: str = "info",
        concurrency: int = 4,
        queues: list | None = None,
    ) -> None:
        """Start Celery worker (for development/testing)."""
        queues = queues or ["default", "tools", "plugins", "monitoring", "batch"]

        # Start worker programmatically
        worker = self.celery_app.Worker(
            loglevel=loglevel,
            concurrency=concurrency,
            queues=queues,
        )
        worker.start()

    def get_celery_app(self) -> Celery:
        """Get the Celery app instance for external use."""
        return self.celery_app


# CLI command for starting workers
def start_celery_worker():
    """CLI command to start Celery worker."""
    import sys

    # Default configuration from environment
    broker_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    result_backend = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

    queue = CeleryTaskQueue(broker_url=broker_url, result_backend=result_backend)

    # Worker configuration from command line or environment
    loglevel = os.getenv("CELERY_LOG_LEVEL", "info")
    concurrency = int(os.getenv("CELERY_CONCURRENCY", "4"))
    queues = os.getenv("CELERY_QUEUES", "default,tools,plugins,monitoring,batch").split(
        ","
    )

    print("Starting Celery worker with:")
    print(f"  Broker: {broker_url}")
    print(f"  Backend: {result_backend}")
    print(f"  Concurrency: {concurrency}")
    print(f"  Queues: {', '.join(queues)}")
    print(f"  Log Level: {loglevel}")

    try:
        queue.start_worker(loglevel=loglevel, concurrency=concurrency, queues=queues)
    except KeyboardInterrupt:
        print("\nWorker stopped by user")
        sys.exit(0)


if __name__ == "__main__":
    start_celery_worker()
