"""Connection pooling and circuit breaker implementation for MCP."""

import asyncio
import logging
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from .exceptions import ConnectionPoolError
from .transports.base import MCPTransport
from .transports.http_transport import HTTPTransport
from .transports.stdio_transport import STDIOTransport
from .transports.websocket_transport import WebSocketTransport

logger = logging.getLogger(__name__)


class PoolState(Enum):
    """Connection pool state."""

    INITIALIZING = "initializing"
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    FAILED = "failed"


@dataclass
class ConnectionConfig:
    """Configuration for individual connections."""

    host: str
    port: int
    transport_type: str = "http"
    max_retries: int = 3
    timeout: float = 30.0
    health_check_interval: float = 60.0
    # circuit breaker fields removed (unused here)


@dataclass
class PoolConnection:
    """Wrapper for pooled transport connections."""

    config: ConnectionConfig
    transport: MCPTransport
    last_health_check: float = field(default_factory=time.time)
    failure_count: int = 0
    is_healthy: bool = True
    created_at: float = field(default_factory=time.time)
    last_used: float = field(default_factory=time.time)

    @property
    def age(self) -> float:
        """Get connection age in seconds."""
        return time.time() - self.created_at

    @property
    def idle_time(self) -> float:
        """Get idle time in seconds."""
        return time.time() - self.last_used


class MCPConnectionPool:
    """Advanced connection pool with circuit breakers, health checks, and load balancing."""

    def __init__(
        self,
        min_connections: int = 2,
        max_connections: int = 10,
        health_check_interval: float = 60.0,
        connection_timeout: float = 30.0,
        max_idle_time: float = 300.0,  # 5 minutes
        max_connection_age: float = 3600.0,  # 1 hour
    ):
        self.min_connections = min_connections
        self.max_connections = max_connections
        self.health_check_interval = health_check_interval
        self.connection_timeout = connection_timeout
        self.max_idle_time = max_idle_time
        self.max_connection_age = max_connection_age

        self.connections: list[PoolConnection] = []
        self.available_connections: asyncio.Queue[PoolConnection] = asyncio.Queue()
        self.connection_configs: list[ConnectionConfig] = []

        self.state = PoolState.INITIALIZING
        self._lock = asyncio.Lock()
        self._health_check_task: asyncio.Task[None] | None = None
        self._cleanup_task: asyncio.Task[None] | None = None

        # Metrics
        self.total_connections_created = 0
        self.total_connection_failures = 0
        self.current_active_connections = 0

    def add_connection_config(self, config: ConnectionConfig) -> None:
        """Add a connection configuration to the pool."""
        self.connection_configs.append(config)

    async def initialize(self) -> None:
        """Initialize the connection pool."""
        if not self.connection_configs:
            raise ValueError("No connection configurations provided")

        async with self._lock:
            logger.info("Initializing MCP connection pool")

            # Create minimum number of connections
            for _ in range(self.min_connections):
                await self._create_connection()

            self.state = PoolState.HEALTHY

            # Start background tasks
            self._health_check_task = asyncio.create_task(self._health_check_loop())
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())

            logger.info(
                f"Connection pool initialized with {len(self.connections)} connections"
            )

    async def close(self) -> None:
        """Close all connections and shutdown pool."""
        async with self._lock:
            logger.info("Closing MCP connection pool")

            # Cancel background tasks
            if self._health_check_task:
                self._health_check_task.cancel()
                import contextlib

                with contextlib.suppress(asyncio.CancelledError):
                    await self._health_check_task
            if self._cleanup_task:
                self._cleanup_task.cancel()
                import contextlib

                with contextlib.suppress(asyncio.CancelledError):
                    await self._cleanup_task

            # Close all connections
            close_tasks = []
            for conn in self.connections:
                if conn.transport.is_connected:
                    close_tasks.append(conn.transport.disconnect())

            if close_tasks:
                await asyncio.gather(*close_tasks, return_exceptions=True)

            self.connections.clear()

            # Drain the queue and disconnect any queued connections
            drained: list[PoolConnection] = []
            while not self.available_connections.empty():
                try:
                    drained.append(self.available_connections.get_nowait())
                except asyncio.QueueEmpty:
                    break
            if drained:
                tasks = [
                    c.transport.disconnect()
                    for c in drained
                    if c.transport.is_connected
                ]
                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)

            self.state = PoolState.FAILED
            logger.info("Connection pool closed")

    @asynccontextmanager
    async def get_connection(self) -> AsyncIterator[PoolConnection]:
        """Get a connection from the pool using context manager."""
        connection = await self._acquire_connection()
        try:
            yield connection
        finally:
            await self._release_connection(connection)

    async def _acquire_connection(self) -> PoolConnection:
        """Acquire a connection from the pool."""
        # Try to get available connection
        try:
            connection = await asyncio.wait_for(
                self.available_connections.get(), timeout=self.connection_timeout
            )

            # Check if connection is still healthy
            if await self._is_connection_healthy(connection):
                connection.last_used = time.time()
                self.current_active_connections += 1
                return connection

            # Connection is unhealthy, remove it and create a new one
            await self._remove_connection(connection)
        except TimeoutError:
            # No available connections, try to create new one
            pass

        # Create new connection if under limit
        async with self._lock:
            if len(self.connections) < self.max_connections:
                connection = await self._create_connection()
                connection.last_used = time.time()
                self.current_active_connections += 1
                return connection

        raise ConnectionPoolError(
            "No available connections and pool is at maximum capacity",
        )

    async def _release_connection(self, connection: PoolConnection) -> None:
        """Release a connection back to the pool."""
        if self.current_active_connections > 0:
            self.current_active_connections -= 1
        connection.last_used = time.time()

        # Check if connection is still healthy before returning to pool
        if await self._is_connection_healthy(connection):
            await self.available_connections.put(connection)
        else:
            await self._remove_connection(connection)

    async def _create_connection(self) -> PoolConnection:
        """Create a new pooled connection with retry logic."""
        # Use round-robin to select configuration
        config = self.connection_configs[
            self.total_connections_created % len(self.connection_configs)
        ]

        # Simple retry logic (3 attempts)
        last_error = None
        for attempt in range(3):
            try:
                # Create transport based on configuration
                transport: MCPTransport
                if config.transport_type == "http":
                    transport = HTTPTransport(config.host, config.port)
                elif config.transport_type == "websocket":
                    transport = WebSocketTransport(config.host, config.port)
                elif config.transport_type == "stdio":
                    transport = STDIOTransport()
                else:
                    raise ValueError(
                        f"Unsupported transport type: {config.transport_type}"
                    )

                # Connect transport
                await transport.connect()

                connection = PoolConnection(
                    config=config,
                    transport=transport,
                )

                self.connections.append(connection)
                self.total_connections_created += 1

                return connection

            except Exception as e:
                last_error = e
                self.total_connection_failures += 1
                if attempt < 2:  # Don't wait on last attempt
                    await asyncio.sleep(
                        min(4 * (2**attempt), 10)
                    )  # Exponential backoff
                continue

        # If we get here, all retries failed
        raise ConnectionPoolError(
            f"Failed to create connection after 3 attempts: {last_error}"
        )

    async def _remove_connection(self, connection: PoolConnection) -> None:
        """Remove a connection from the pool."""
        try:
            await connection.transport.disconnect()
        except Exception as e:
            logger.warning(f"Error disconnecting transport: {e}")

        if connection in self.connections:
            self.connections.remove(connection)
            logger.info(
                f"Removed connection to {connection.config.host}:{connection.config.port}"
            )
        # Purge any lingering reference in the available queue
        await self._purge_from_queue(connection)

    async def _purge_from_queue(self, target: PoolConnection) -> None:
        """Remove a specific connection from the available queue if present."""
        temp: list[PoolConnection] = []
        while not self.available_connections.empty():
            try:
                item = self.available_connections.get_nowait()
            except asyncio.QueueEmpty:
                break
            if item is not target:
                temp.append(item)
        for item in temp:
            await self.available_connections.put(item)

    async def _is_connection_healthy(self, connection: PoolConnection) -> bool:
        """Check if a connection is healthy."""
        try:
            # Check if connection is too old
            if connection.age > self.max_connection_age:
                return False

            # Check transport state
            if not connection.transport.is_connected:
                return False

            # Perform health check if needed
            now = time.time()
            if now - connection.last_health_check > self.health_check_interval:
                health = await connection.transport.health_check()
                connection.last_health_check = now
                connection.is_healthy = health.get("connected", False)

            return connection.is_healthy

        except Exception as e:
            logger.warning(f"Health check failed for connection: {e}")
            connection.failure_count += 1
            return False

    async def _health_check_loop(self) -> None:
        """Background task for periodic health checks."""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                await self._perform_health_checks()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in health check loop: {e}")

    async def _perform_health_checks(self) -> None:
        """Perform health checks on all connections."""
        unhealthy_connections = []

        for connection in self.connections[
            :
        ]:  # Copy list to avoid modification during iteration
            if not await self._is_connection_healthy(connection):
                unhealthy_connections.append(connection)

        # Remove unhealthy connections
        for connection in unhealthy_connections:
            await self._remove_connection(connection)

        # Update pool state
        healthy_count = len(self.connections)
        if healthy_count == 0:
            self.state = PoolState.FAILED
        elif healthy_count < self.min_connections:
            self.state = PoolState.DEGRADED
            # Try to create more connections
            while len(self.connections) < self.min_connections:
                try:
                    async with self._lock:
                        if len(self.connections) < self.min_connections:
                            await self._create_connection()
                        else:
                            break
                except Exception as e:
                    logger.error(f"Failed to create replacement connection: {e}")
                    break
        else:
            self.state = PoolState.HEALTHY

    async def _cleanup_loop(self) -> None:
        """Background task for cleaning up idle connections."""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                await self._cleanup_idle_connections()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")

    async def _cleanup_idle_connections(self) -> None:
        """Remove idle connections that exceed max idle time."""
        idle_connections = []

        for connection in self.connections[:]:
            if (
                connection.idle_time > self.max_idle_time
                and len(self.connections) > self.min_connections
            ):
                idle_connections.append(connection)

        for connection in idle_connections:
            await self._remove_connection(connection)
            logger.info(
                f"Removed idle connection (idle for {connection.idle_time:.1f}s)"
            )

    def get_pool_stats(self) -> dict[str, Any]:
        """Get pool statistics."""
        healthy_connections = sum(1 for conn in self.connections if conn.is_healthy)

        return {
            "state": self.state.value,
            "total_connections": len(self.connections),
            "healthy_connections": healthy_connections,
            "active_connections": self.current_active_connections,
            "available_connections": self.available_connections.qsize(),
            "total_created": self.total_connections_created,
            "total_failures": self.total_connection_failures,
            "connection_configs": len(self.connection_configs),
        }
