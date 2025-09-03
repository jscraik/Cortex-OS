"""A2A (Agent-to-Agent) integration bridge for MCP."""

import asyncio
import json
import logging
import time
import uuid
from collections.abc import Callable
from typing import Any

from ..core.circuit_breakers import circuit_breaker
from ..tasks.task_queue import TaskPriority, TaskQueue

logger = logging.getLogger(__name__)


class A2AEvent:
    """A2A event wrapper for MCP integration."""

    def __init__(
        self,
        event_type: str,
        payload: dict[str, Any],
        source: str = "mcp",
        correlation_id: str | None = None,
        timestamp: float | None = None,
        priority: int = 5,
    ):
        self.event_type = event_type
        self.payload = payload
        self.source = source
        self.correlation_id = correlation_id or str(uuid.uuid4())
        self.timestamp = timestamp or time.time()
        self.priority = priority

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "event_type": self.event_type,
            "payload": self.payload,
            "source": self.source,
            "correlation_id": self.correlation_id,
            "timestamp": self.timestamp,
            "priority": self.priority,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "A2AEvent":
        """Create from dictionary."""
        return cls(
            event_type=data["event_type"],
            payload=data["payload"],
            source=data.get("source", "unknown"),
            correlation_id=data.get("correlation_id"),
            timestamp=data.get("timestamp"),
            priority=data.get("priority", 5),
        )


class A2AEventHandler:
    """Handler for processing A2A events in MCP context."""

    def __init__(self, task_queue: TaskQueue | None = None):
        self.task_queue = task_queue
        self.event_handlers: dict[str, list[Callable]] = {}
        self.middleware: list[Callable] = []

        # Metrics
        self.events_processed = 0
        self.events_failed = 0
        self.last_event_time: float | None = None

    def register_handler(self, event_type: str, handler: Callable) -> None:
        """Register an event handler for specific event type."""
        if event_type not in self.event_handlers:
            self.event_handlers[event_type] = []

        self.event_handlers[event_type].append(handler)
        logger.info(f"Registered A2A handler for event type: {event_type}")

    def add_middleware(self, middleware: Callable) -> None:
        """Add middleware for event processing."""
        self.middleware.append(middleware)
        logger.info("Added A2A event middleware")

    async def handle_event(self, event: A2AEvent) -> dict[str, Any]:
        """Handle incoming A2A event."""
        start_time = time.time()
        self.last_event_time = start_time

        try:
            # Apply middleware
            for middleware_func in self.middleware:
                event = await middleware_func(event) or event

            # Get handlers for event type
            handlers = self.event_handlers.get(event.event_type, [])
            if not handlers:
                logger.warning(
                    f"No handlers registered for event type: {event.event_type}"
                )
                return {
                    "status": "unhandled",
                    "event_type": event.event_type,
                    "correlation_id": event.correlation_id,
                }

            # Execute handlers
            results = []
            for handler in handlers:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        result = await handler(event)
                    else:
                        result = handler(event)
                    results.append(result)
                except Exception as e:
                    logger.error(f"Handler error for {event.event_type}: {e}")
                    results.append({"error": str(e)})

            self.events_processed += 1
            execution_time = time.time() - start_time

            return {
                "status": "handled",
                "event_type": event.event_type,
                "correlation_id": event.correlation_id,
                "results": results,
                "execution_time": execution_time,
            }

        except Exception as e:
            self.events_failed += 1
            logger.error(f"Event handling failed: {e}")
            return {
                "status": "failed",
                "event_type": event.event_type,
                "correlation_id": event.correlation_id,
                "error": str(e),
            }

    def get_metrics(self) -> dict[str, Any]:
        """Get event handler metrics."""
        return {
            "events_processed": self.events_processed,
            "events_failed": self.events_failed,
            "success_rate": (
                (self.events_processed - self.events_failed) / self.events_processed
                if self.events_processed > 0
                else 0
            ),
            "registered_handlers": {
                event_type: len(handlers)
                for event_type, handlers in self.event_handlers.items()
            },
            "middleware_count": len(self.middleware),
            "last_event_time": self.last_event_time,
        }


class A2ABridge:
    """Bridge between MCP and Cortex-OS A2A event system."""

    def __init__(
        self,
        task_queue: TaskQueue | None = None,
        event_bus_url: str = "redis://localhost:6379/1",
        bridge_name: str = "mcp-bridge",
    ):
        self.task_queue = task_queue
        self.event_bus_url = event_bus_url
        self.bridge_name = bridge_name

        # Event handling
        self.event_handler = A2AEventHandler(task_queue)
        self.subscription_handlers: dict[str, Callable] = {}

        # Connection management
        self.redis_client: Any | None = None
        self.running = False
        self.subscription_tasks: list[asyncio.Task] = []

        # Metrics
        self.events_published = 0
        self.events_received = 0
        self.connection_errors = 0

        self._setup_default_handlers()

    def _setup_default_handlers(self) -> None:
        """Setup default event handlers for MCP integration."""

        @self.event_handler.register_handler("tool.execute")
        async def handle_tool_execution(event: A2AEvent) -> dict[str, Any]:
            """Handle tool execution requests from A2A."""
            payload = event.payload
            tool_name = payload.get("tool_name")
            parameters = payload.get("parameters", {})

            if not tool_name:
                return {"error": "Missing tool_name in payload"}

            # Submit to task queue if available
            if self.task_queue:
                task_id = await self.task_queue.submit_task(
                    "tool_execution",
                    tool_name,
                    parameters,
                    priority=TaskPriority.HIGH,
                )

                return {
                    "task_id": task_id,
                    "tool_name": tool_name,
                    "status": "queued",
                }
            else:
                # Direct execution (not recommended for production)
                return {
                    "tool_name": tool_name,
                    "parameters": parameters,
                    "result": f"Executed {tool_name} directly",
                    "execution_time": time.time(),
                }

        @self.event_handler.register_handler("plugin.reload")
        async def handle_plugin_reload(event: A2AEvent) -> dict[str, Any]:
            """Handle plugin reload requests from A2A."""
            payload = event.payload
            plugin_name = payload.get("plugin_name")

            if not plugin_name:
                return {"error": "Missing plugin_name in payload"}

            # Submit to task queue
            if self.task_queue:
                task_id = await self.task_queue.submit_task(
                    "plugin_reload",
                    plugin_name,
                    priority=TaskPriority.NORMAL,
                )

                return {
                    "task_id": task_id,
                    "plugin_name": plugin_name,
                    "status": "reload_queued",
                }

            return {"error": "Task queue not available"}

        @self.event_handler.register_handler("health.check")
        async def handle_health_check(event: A2AEvent) -> dict[str, Any]:
            """Handle health check requests from A2A."""
            return {
                "status": "healthy",
                "bridge_name": self.bridge_name,
                "timestamp": time.time(),
                "metrics": self.get_metrics(),
            }

        # Add authentication middleware
        @self.event_handler.add_middleware
        async def auth_middleware(event: A2AEvent) -> A2AEvent:
            """Authentication middleware for A2A events."""
            # Check if event has valid authentication
            auth_token = event.payload.get("auth_token")
            if not auth_token and event.event_type not in ["health.check"]:
                logger.warning(f"Unauthenticated A2A event: {event.event_type}")
                # You could raise an exception here to block the event

            return event

        # Add logging middleware
        @self.event_handler.add_middleware
        async def logging_middleware(event: A2AEvent) -> A2AEvent:
            """Logging middleware for A2A events."""
            logger.info(
                f"Processing A2A event: {event.event_type} "
                f"from {event.source} "
                f"(correlation_id: {event.correlation_id})"
            )
            return event

    async def initialize(self) -> None:
        """Initialize the A2A bridge."""
        logger.info("Initializing A2A bridge")

        try:
            import aioredis

            self.redis_client = aioredis.from_url(self.event_bus_url)
            await self.redis_client.ping()

            self.running = True
            logger.info("A2A bridge initialized successfully")

        except Exception as e:
            self.connection_errors += 1
            logger.error(f"Failed to initialize A2A bridge: {e}")
            raise

    async def shutdown(self) -> None:
        """Shutdown the A2A bridge."""
        logger.info("Shutting down A2A bridge")

        self.running = False

        # Cancel subscription tasks
        for task in self.subscription_tasks:
            task.cancel()

        # Wait for tasks to complete
        if self.subscription_tasks:
            await asyncio.gather(*self.subscription_tasks, return_exceptions=True)

        # Close Redis connection
        if self.redis_client:
            await self.redis_client.close()

        logger.info("A2A bridge shutdown complete")

    @circuit_breaker("a2a_publish")
    async def publish_event(
        self,
        event_type: str,
        payload: dict[str, Any],
        target_agents: list[str] | None = None,
        priority: int = 5,
    ) -> str:
        """Publish an event to the A2A event bus."""
        if not self.running:
            raise RuntimeError("A2A bridge not initialized")

        event = A2AEvent(
            event_type=event_type,
            payload=payload,
            source=self.bridge_name,
            priority=priority,
        )

        try:
            # Determine channel based on target agents
            if target_agents:
                channels = [f"a2a:agent:{agent}" for agent in target_agents]
            else:
                channels = [f"a2a:broadcast:{event_type}"]

            # Publish to all target channels
            for channel in channels:
                await self.redis_client.lpush(channel, json.dumps(event.to_dict()))

            self.events_published += 1
            logger.info(f"Published A2A event {event.correlation_id}: {event_type}")

            return event.correlation_id

        except Exception as e:
            self.connection_errors += 1
            logger.error(f"Failed to publish A2A event: {e}")
            raise

    async def subscribe_to_events(
        self,
        event_types: list[str],
        handler: Callable | None = None,
    ) -> None:
        """Subscribe to specific event types from A2A bus."""
        if not self.running:
            raise RuntimeError("A2A bridge not initialized")

        for event_type in event_types:
            channel = f"a2a:mcp:{event_type}"

            if handler:
                # Use custom handler
                subscription_task = asyncio.create_task(
                    self._subscription_loop(channel, handler)
                )
            else:
                # Use default event handler
                subscription_task = asyncio.create_task(
                    self._subscription_loop(channel, self._default_event_processor)
                )

            self.subscription_tasks.append(subscription_task)
            logger.info(f"Subscribed to A2A events: {event_type} on {channel}")

    async def _subscription_loop(self, channel: str, handler: Callable) -> None:
        """Main subscription loop for A2A events."""
        logger.info(f"Starting A2A subscription loop for {channel}")

        while self.running:
            try:
                # Block and wait for events
                result = await self.redis_client.brpop(channel, timeout=1)

                if result:
                    _, event_data = result
                    event_dict = json.loads(event_data)
                    event = A2AEvent.from_dict(event_dict)

                    self.events_received += 1

                    # Process event
                    if asyncio.iscoroutinefunction(handler):
                        await handler(event)
                    else:
                        handler(event)

            except asyncio.CancelledError:
                break
            except Exception as e:
                self.connection_errors += 1
                logger.error(f"Error in A2A subscription loop: {e}")
                await asyncio.sleep(1)  # Brief pause before retrying

        logger.info(f"A2A subscription loop for {channel} stopped")

    async def _default_event_processor(self, event: A2AEvent) -> None:
        """Default processor for incoming A2A events."""
        result = await self.event_handler.handle_event(event)

        # Publish response if correlation_id is present
        if event.correlation_id and result.get("status") != "unhandled":
            response_event = A2AEvent(
                event_type=f"{event.event_type}.response",
                payload=result,
                source=self.bridge_name,
                correlation_id=event.correlation_id,
            )

            # Publish response back to originating agent
            response_channel = f"a2a:response:{event.source}"
            await self.redis_client.lpush(
                response_channel, json.dumps(response_event.to_dict())
            )

    async def publish_tool_result(
        self,
        tool_name: str,
        result: Any,
        execution_time: float,
        correlation_id: str | None = None,
    ) -> str:
        """Publish tool execution result to A2A bus."""
        return await self.publish_event(
            "tool.result",
            {
                "tool_name": tool_name,
                "result": result,
                "execution_time": execution_time,
                "timestamp": time.time(),
            },
            priority=6,  # Higher priority for results
        )

    async def publish_plugin_event(
        self,
        plugin_name: str,
        event_type: str,
        details: dict[str, Any],
    ) -> str:
        """Publish plugin-related events to A2A bus."""
        return await self.publish_event(
            f"plugin.{event_type}",
            {
                "plugin_name": plugin_name,
                "details": details,
                "timestamp": time.time(),
            },
        )

    async def request_agent_capability(
        self,
        agent_name: str,
        capability: str,
        parameters: dict[str, Any],
        timeout: float = 30.0,
    ) -> dict[str, Any] | None:
        """Request a capability from another agent via A2A."""
        correlation_id = str(uuid.uuid4())

        # Publish request
        await self.publish_event(
            "capability.request",
            {
                "capability": capability,
                "parameters": parameters,
                "response_channel": f"a2a:response:{self.bridge_name}",
            },
            target_agents=[agent_name],
        )

        # Wait for response
        response_channel = f"a2a:response:{self.bridge_name}"

        try:
            # Wait for response with timeout
            result = await asyncio.wait_for(
                self.redis_client.brpop(response_channel, timeout=int(timeout)),
                timeout=timeout,
            )

            if result:
                _, response_data = result
                response_dict = json.loads(response_data)
                response_event = A2AEvent.from_dict(response_dict)

                if response_event.correlation_id == correlation_id:
                    return response_event.payload

        except TimeoutError:
            logger.warning(f"Timeout waiting for capability response from {agent_name}")

        return None

    def get_metrics(self) -> dict[str, Any]:
        """Get A2A bridge metrics."""
        handler_metrics = self.event_handler.get_metrics()

        return {
            "bridge_name": self.bridge_name,
            "running": self.running,
            "events_published": self.events_published,
            "events_received": self.events_received,
            "connection_errors": self.connection_errors,
            "subscriptions": len(self.subscription_tasks),
            "handler_metrics": handler_metrics,
        }

    def register_event_handler(self, event_type: str, handler: Callable) -> None:
        """Register a custom event handler."""
        self.event_handler.register_handler(event_type, handler)

    async def health_check(self) -> dict[str, Any]:
        """Perform health check on A2A bridge."""
        try:
            if self.redis_client:
                await self.redis_client.ping()
                redis_healthy = True
            else:
                redis_healthy = False

            return {
                "status": "healthy" if self.running and redis_healthy else "unhealthy",
                "redis_connection": redis_healthy,
                "bridge_running": self.running,
                "metrics": self.get_metrics(),
            }

        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "metrics": self.get_metrics(),
            }
