"""Load balancing and scaling infrastructure for MCP servers."""

import asyncio
import hashlib
import time
from collections.abc import Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any

import aiohttp

from ..observability.metrics import get_metrics_collector
from ..observability.structured_logging import get_logger

logger = get_logger(__name__)
metrics = get_metrics_collector()


class LoadBalancingAlgorithm(Enum):
    """Load balancing algorithm types."""

    ROUND_ROBIN = "round_robin"
    LEAST_CONNECTIONS = "least_connections"
    LEAST_RESPONSE_TIME = "least_response_time"
    WEIGHTED_ROUND_ROBIN = "weighted_round_robin"
    IP_HASH = "ip_hash"
    CONSISTENT_HASH = "consistent_hash"
    RESOURCE_BASED = "resource_based"


class ServerStatus(Enum):
    """Server health status."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    MAINTENANCE = "maintenance"
    OFFLINE = "offline"


@dataclass
class ServerNode:
    """Represents a backend server node."""

    id: str
    host: str
    port: int
    weight: float = 1.0
    max_connections: int = 1000

    # Runtime state
    current_connections: int = 0
    total_requests: int = 0
    failed_requests: int = 0
    avg_response_time: float = 0.0
    last_health_check: datetime | None = None
    status: ServerStatus = ServerStatus.HEALTHY

    # Resource metrics
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    disk_usage: float = 0.0
    network_io: dict[str, float] = field(default_factory=dict)

    @property
    def url(self) -> str:
        """Get server URL."""
        return f"http://{self.host}:{self.port}"

    @property
    def load_score(self) -> float:
        """Calculate server load score (0.0 = no load, 1.0 = full load)."""
        connection_load = self.current_connections / max(self.max_connections, 1)
        cpu_load = self.cpu_usage / 100.0
        memory_load = self.memory_usage / 100.0

        # Weighted average
        return connection_load * 0.4 + cpu_load * 0.3 + memory_load * 0.3

    @property
    def is_available(self) -> bool:
        """Check if server is available for requests."""
        return (
            self.status in [ServerStatus.HEALTHY, ServerStatus.DEGRADED]
            and self.current_connections < self.max_connections
        )

    def update_metrics(self, response_time: float, success: bool):
        """Update server metrics."""
        self.total_requests += 1
        if not success:
            self.failed_requests += 1

        # Exponential moving average for response time
        alpha = 0.1
        self.avg_response_time = (
            alpha * response_time + (1 - alpha) * self.avg_response_time
        )


class ConsistentHashRing:
    """Consistent hashing implementation for server selection."""

    def __init__(self, replicas: int = 150):
        self.replicas = replicas
        self.ring: dict[int, str] = {}
        self.nodes: list[str] = []

    def _hash(self, key: str) -> int:
        """Hash a key to a ring position."""
        return int(hashlib.md5(key.encode()).hexdigest(), 16)

    def add_node(self, node_id: str):
        """Add a node to the hash ring."""
        if node_id in self.nodes:
            return

        self.nodes.append(node_id)
        for i in range(self.replicas):
            replica_key = f"{node_id}:{i}"
            hash_value = self._hash(replica_key)
            self.ring[hash_value] = node_id

    def remove_node(self, node_id: str):
        """Remove a node from the hash ring."""
        if node_id not in self.nodes:
            return

        self.nodes.remove(node_id)
        keys_to_remove = [k for k, v in self.ring.items() if v == node_id]
        for key in keys_to_remove:
            del self.ring[key]

    def get_node(self, key: str) -> str | None:
        """Get the node for a given key."""
        if not self.ring:
            return None

        hash_value = self._hash(key)

        # Find the first node clockwise
        for ring_key in sorted(self.ring.keys()):
            if ring_key >= hash_value:
                return self.ring[ring_key]

        # Wrap around to the first node
        first_key = min(self.ring.keys())
        return self.ring[first_key]


class HealthChecker:
    """Health checking system for server nodes."""

    def __init__(self, check_interval: int = 30, timeout: int = 5):
        self.check_interval = check_interval
        self.timeout = timeout
        self.session: aiohttp.ClientSession | None = None
        self._running = False
        self._check_task: asyncio.Task | None = None

    async def start(self):
        """Start the health checker."""
        if self._running:
            return

        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.timeout)
        )
        self._running = True
        self._check_task = asyncio.create_task(self._health_check_loop())

        logger.info("Health checker started")

    async def stop(self):
        """Stop the health checker."""
        self._running = False

        if self._check_task:
            self._check_task.cancel()
            try:
                await self._check_task
            except asyncio.CancelledError:
                pass

        if self.session:
            await self.session.close()

        logger.info("Health checker stopped")

    async def _health_check_loop(self):
        """Main health checking loop."""
        while self._running:
            try:
                await asyncio.sleep(self.check_interval)
                # Health checks will be triggered by load balancer
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health check loop error: {e}")

    async def check_server_health(self, server: ServerNode) -> bool:
        """Check health of a single server."""
        if not self.session:
            return False

        try:
            health_url = f"{server.url}/health"

            start_time = time.time()
            async with self.session.get(health_url) as response:
                response_time = time.time() - start_time

                if response.status == 200:
                    # Update server metrics
                    server.update_metrics(response_time, True)
                    server.last_health_check = datetime.now()

                    # Try to get resource metrics from health endpoint
                    try:
                        health_data = await response.json()
                        if isinstance(health_data, dict):
                            server.cpu_usage = health_data.get("cpu_usage", 0.0)
                            server.memory_usage = health_data.get("memory_usage", 0.0)
                            server.disk_usage = health_data.get("disk_usage", 0.0)
                    except:
                        pass

                    return True
                else:
                    server.update_metrics(response_time, False)
                    return False

        except TimeoutError:
            logger.warning(f"Health check timeout for {server.url}")
            server.update_metrics(self.timeout, False)
            return False
        except Exception as e:
            logger.warning(f"Health check failed for {server.url}: {e}")
            server.update_metrics(0, False)
            return False


class LoadBalancer:
    """Advanced load balancer with multiple algorithms and health checking."""

    def __init__(
        self, algorithm: LoadBalancingAlgorithm = LoadBalancingAlgorithm.ROUND_ROBIN
    ):
        self.algorithm = algorithm
        self.servers: dict[str, ServerNode] = {}
        self.health_checker = HealthChecker()
        self.consistent_hash = ConsistentHashRing()

        # Algorithm state
        self._round_robin_index = 0
        self._response_times: dict[str, list[float]] = {}

        # Auto-scaling
        self.scaling_enabled = False
        self.min_servers = 1
        self.max_servers = 10
        self.scale_up_threshold = 0.8  # Scale up when average load > 80%
        self.scale_down_threshold = 0.3  # Scale down when average load < 30%

        logger.info(f"Load balancer initialized with {algorithm.value} algorithm")

    async def start(self):
        """Start the load balancer."""
        await self.health_checker.start()
        logger.info("Load balancer started")

    async def stop(self):
        """Stop the load balancer."""
        await self.health_checker.stop()
        logger.info("Load balancer stopped")

    def add_server(self, server: ServerNode):
        """Add a server to the pool."""
        self.servers[server.id] = server

        if self.algorithm == LoadBalancingAlgorithm.CONSISTENT_HASH:
            self.consistent_hash.add_node(server.id)

        logger.info(f"Added server {server.id} at {server.url}")

    def remove_server(self, server_id: str):
        """Remove a server from the pool."""
        if server_id in self.servers:
            del self.servers[server_id]

            if self.algorithm == LoadBalancingAlgorithm.CONSISTENT_HASH:
                self.consistent_hash.remove_node(server_id)

            logger.info(f"Removed server {server_id}")

    def get_available_servers(self) -> list[ServerNode]:
        """Get list of available servers."""
        return [server for server in self.servers.values() if server.is_available]

    async def select_server(
        self, client_ip: str | None = None, session_id: str | None = None
    ) -> ServerNode | None:
        """Select a server based on the configured algorithm."""
        available_servers = self.get_available_servers()

        if not available_servers:
            logger.warning("No available servers")
            return None

        # Run health checks periodically
        await self._periodic_health_checks()

        if self.algorithm == LoadBalancingAlgorithm.ROUND_ROBIN:
            return self._round_robin_select(available_servers)
        elif self.algorithm == LoadBalancingAlgorithm.LEAST_CONNECTIONS:
            return self._least_connections_select(available_servers)
        elif self.algorithm == LoadBalancingAlgorithm.LEAST_RESPONSE_TIME:
            return self._least_response_time_select(available_servers)
        elif self.algorithm == LoadBalancingAlgorithm.WEIGHTED_ROUND_ROBIN:
            return self._weighted_round_robin_select(available_servers)
        elif self.algorithm == LoadBalancingAlgorithm.IP_HASH:
            return self._ip_hash_select(available_servers, client_ip or "")
        elif self.algorithm == LoadBalancingAlgorithm.CONSISTENT_HASH:
            return self._consistent_hash_select(
                available_servers, session_id or client_ip or ""
            )
        elif self.algorithm == LoadBalancingAlgorithm.RESOURCE_BASED:
            return self._resource_based_select(available_servers)
        else:
            return available_servers[0]  # Fallback

    def _round_robin_select(self, servers: list[ServerNode]) -> ServerNode:
        """Round robin server selection."""
        server = servers[self._round_robin_index % len(servers)]
        self._round_robin_index += 1
        return server

    def _least_connections_select(self, servers: list[ServerNode]) -> ServerNode:
        """Select server with least connections."""
        return min(servers, key=lambda s: s.current_connections)

    def _least_response_time_select(self, servers: list[ServerNode]) -> ServerNode:
        """Select server with lowest average response time."""
        return min(servers, key=lambda s: s.avg_response_time)

    def _weighted_round_robin_select(self, servers: list[ServerNode]) -> ServerNode:
        """Weighted round robin selection."""
        # Simple weighted selection based on server weights
        total_weight = sum(s.weight for s in servers)
        if total_weight == 0:
            return servers[0]

        # Generate weighted list
        weighted_servers = []
        for server in servers:
            count = max(1, int(server.weight * 10))  # Scale weights
            weighted_servers.extend([server] * count)

        return weighted_servers[self._round_robin_index % len(weighted_servers)]

    def _ip_hash_select(self, servers: list[ServerNode], client_ip: str) -> ServerNode:
        """Select server based on client IP hash."""
        if not client_ip:
            return servers[0]

        hash_value = hash(client_ip)
        return servers[hash_value % len(servers)]

    def _consistent_hash_select(
        self, servers: list[ServerNode], key: str
    ) -> ServerNode | None:
        """Select server using consistent hashing."""
        if not key:
            return servers[0] if servers else None

        server_id = self.consistent_hash.get_node(key)
        if server_id and server_id in self.servers:
            server = self.servers[server_id]
            if server.is_available:
                return server

        # Fallback to first available server
        return servers[0] if servers else None

    def _resource_based_select(self, servers: list[ServerNode]) -> ServerNode:
        """Select server based on resource utilization."""
        return min(servers, key=lambda s: s.load_score)

    async def _periodic_health_checks(self):
        """Run periodic health checks on servers."""
        current_time = datetime.now()

        for server in self.servers.values():
            # Check if health check is due
            if (
                not server.last_health_check
                or current_time - server.last_health_check > timedelta(seconds=30)
            ):
                is_healthy = await self.health_checker.check_server_health(server)

                # Update server status
                if is_healthy:
                    if server.status == ServerStatus.UNHEALTHY:
                        server.status = ServerStatus.HEALTHY
                        logger.info(f"Server {server.id} recovered")
                elif server.status == ServerStatus.HEALTHY:
                    server.status = ServerStatus.UNHEALTHY
                    logger.warning(f"Server {server.id} marked unhealthy")

    async def request_completed(
        self, server_id: str, response_time: float, success: bool
    ):
        """Record completion of a request."""
        if server_id in self.servers:
            server = self.servers[server_id]
            server.update_metrics(response_time, success)
            server.current_connections = max(0, server.current_connections - 1)

            # Record metrics
            metrics.record_request(
                method="load_balanced",
                status="success" if success else "error",
                plugin="load_balancer",
                duration=response_time,
            )

    async def request_started(self, server_id: str):
        """Record start of a request."""
        if server_id in self.servers:
            self.servers[server_id].current_connections += 1

    def get_stats(self) -> dict[str, Any]:
        """Get load balancer statistics."""
        total_requests = sum(s.total_requests for s in self.servers.values())
        total_failed = sum(s.failed_requests for s in self.servers.values())

        server_stats = []
        for server in self.servers.values():
            server_stats.append(
                {
                    "id": server.id,
                    "url": server.url,
                    "status": server.status.value,
                    "connections": server.current_connections,
                    "requests": server.total_requests,
                    "failed_requests": server.failed_requests,
                    "avg_response_time": server.avg_response_time,
                    "load_score": server.load_score,
                    "weight": server.weight,
                }
            )

        return {
            "algorithm": self.algorithm.value,
            "total_servers": len(self.servers),
            "available_servers": len(self.get_available_servers()),
            "total_requests": total_requests,
            "failed_requests": total_failed,
            "success_rate": (total_requests - total_failed) / max(total_requests, 1),
            "servers": server_stats,
        }


class AutoScaler:
    """Automatic scaling system for server pools."""

    def __init__(
        self, load_balancer: LoadBalancer, scale_provider: Callable | None = None
    ):
        self.load_balancer = load_balancer
        self.scale_provider = scale_provider  # Function to create/destroy servers
        self.check_interval = 60  # seconds
        self.scale_cooldown = 300  # 5 minutes
        self.last_scale_action: datetime | None = None
        self._running = False
        self._scale_task: asyncio.Task | None = None

        logger.info("Auto-scaler initialized")

    async def start(self):
        """Start the auto-scaler."""
        if self._running or not self.scale_provider:
            return

        self._running = True
        self._scale_task = asyncio.create_task(self._scaling_loop())
        logger.info("Auto-scaler started")

    async def stop(self):
        """Stop the auto-scaler."""
        self._running = False

        if self._scale_task:
            self._scale_task.cancel()
            try:
                await self._scale_task
            except asyncio.CancelledError:
                pass

        logger.info("Auto-scaler stopped")

    async def _scaling_loop(self):
        """Main scaling loop."""
        while self._running:
            try:
                await asyncio.sleep(self.check_interval)
                await self._check_scaling_conditions()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Auto-scaling error: {e}")

    async def _check_scaling_conditions(self):
        """Check if scaling action is needed."""
        # Check cooldown
        if (
            self.last_scale_action
            and datetime.now() - self.last_scale_action
            < timedelta(seconds=self.scale_cooldown)
        ):
            return

        available_servers = self.load_balancer.get_available_servers()
        if not available_servers:
            return

        # Calculate average load
        avg_load = sum(s.load_score for s in available_servers) / len(available_servers)

        # Scale up condition
        if (
            avg_load > self.load_balancer.scale_up_threshold
            and len(available_servers) < self.load_balancer.max_servers
        ):
            await self._scale_up()

        # Scale down condition
        elif (
            avg_load < self.load_balancer.scale_down_threshold
            and len(available_servers) > self.load_balancer.min_servers
        ):
            await self._scale_down()

    async def _scale_up(self):
        """Scale up by adding a server."""
        try:
            if self.scale_provider:
                new_server = await self.scale_provider("create")
                if new_server:
                    self.load_balancer.add_server(new_server)
                    self.last_scale_action = datetime.now()
                    logger.info(f"Scaled up: added server {new_server.id}")
        except Exception as e:
            logger.error(f"Scale up failed: {e}")

    async def _scale_down(self):
        """Scale down by removing a server."""
        try:
            available_servers = self.load_balancer.get_available_servers()
            if len(available_servers) <= self.load_balancer.min_servers:
                return

            # Remove server with lowest load
            server_to_remove = min(
                available_servers, key=lambda s: s.current_connections
            )

            if self.scale_provider:
                await self.scale_provider("destroy", server_to_remove)

            self.load_balancer.remove_server(server_to_remove.id)
            self.last_scale_action = datetime.now()
            logger.info(f"Scaled down: removed server {server_to_remove.id}")

        except Exception as e:
            logger.error(f"Scale down failed: {e}")


# Global load balancer instance
_load_balancer: LoadBalancer | None = None


def get_load_balancer() -> LoadBalancer:
    """Get or create global load balancer instance."""
    global _load_balancer

    if _load_balancer is None:
        _load_balancer = LoadBalancer()

    return _load_balancer


@asynccontextmanager
async def load_balanced_request(
    client_ip: str | None = None, session_id: str | None = None
):
    """Context manager for load balanced requests."""
    lb = get_load_balancer()
    server = await lb.select_server(client_ip, session_id)

    if not server:
        raise RuntimeError("No available servers")

    start_time = time.time()
    await lb.request_started(server.id)

    try:
        yield server
        success = True
    except Exception:
        success = False
        raise
    finally:
        response_time = time.time() - start_time
        await lb.request_completed(server.id, response_time, success)
