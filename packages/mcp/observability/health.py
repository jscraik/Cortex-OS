"""Comprehensive health check system for MCP components."""

import asyncio
import sys
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import psutil

from .metrics import get_metrics_collector
from .structured_logging import get_logger

logger = get_logger("mcp.health")


class HealthStatus(Enum):
    """Health check status levels."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class HealthCheckResult:
    """Result of a health check."""

    name: str
    status: HealthStatus
    message: str = ""
    details: dict[str, Any] = field(default_factory=dict)
    duration_ms: float = 0.0
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "name": self.name,
            "status": self.status.value,
            "message": self.message,
            "details": self.details,
            "duration_ms": round(self.duration_ms, 2),
            "timestamp": self.timestamp,
        }


class HealthChecker:
    """Base class for health checkers."""

    def __init__(self, name: str, timeout: float = 5.0):
        self.name = name
        self.timeout = timeout

    async def check(self) -> HealthCheckResult:
        """Perform health check with timeout."""
        start_time = time.time()

        try:
            result = await asyncio.wait_for(self._perform_check(), timeout=self.timeout)
            result.duration_ms = (time.time() - start_time) * 1000
            return result

        except TimeoutError:
            duration_ms = (time.time() - start_time) * 1000
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.UNHEALTHY,
                message=f"Health check timed out after {self.timeout}s",
                duration_ms=duration_ms,
            )
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.UNHEALTHY,
                message=f"Health check failed: {str(e)}",
                duration_ms=duration_ms,
            )

    async def _perform_check(self) -> HealthCheckResult:
        """Implement specific health check logic."""
        raise NotImplementedError


class DatabaseHealthChecker(HealthChecker):
    """Database connectivity health checker."""

    def __init__(self, db_pool=None, timeout: float = 5.0):
        super().__init__("database", timeout)
        self.db_pool = db_pool

    async def _perform_check(self) -> HealthCheckResult:
        if not self.db_pool:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.UNKNOWN,
                message="No database pool configured",
            )

        try:
            # Simple connectivity test
            async with self.db_pool.acquire() as conn:
                result = await conn.fetchval("SELECT 1")

                if result == 1:
                    return HealthCheckResult(
                        name=self.name,
                        status=HealthStatus.HEALTHY,
                        message="Database connection successful",
                        details={
                            "pool_size": self.db_pool.get_size(),
                            "idle_connections": self.db_pool.get_idle_size(),
                        },
                    )
                else:
                    return HealthCheckResult(
                        name=self.name,
                        status=HealthStatus.UNHEALTHY,
                        message="Database query returned unexpected result",
                    )

        except Exception as e:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.UNHEALTHY,
                message=f"Database connection failed: {str(e)}",
            )


class RedisHealthChecker(HealthChecker):
    """Redis connectivity health checker."""

    def __init__(self, redis_client=None, timeout: float = 5.0):
        super().__init__("redis", timeout)
        self.redis_client = redis_client

    async def _perform_check(self) -> HealthCheckResult:
        if not self.redis_client:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.UNKNOWN,
                message="No Redis client configured",
            )

        try:
            # Simple ping test
            pong = await self.redis_client.ping()

            if pong:
                # Get Redis info
                info = await self.redis_client.info()

                return HealthCheckResult(
                    name=self.name,
                    status=HealthStatus.HEALTHY,
                    message="Redis connection successful",
                    details={
                        "version": info.get("redis_version", "unknown"),
                        "connected_clients": info.get("connected_clients", 0),
                        "used_memory": info.get("used_memory_human", "unknown"),
                        "uptime_seconds": info.get("uptime_in_seconds", 0),
                    },
                )
            else:
                return HealthCheckResult(
                    name=self.name,
                    status=HealthStatus.UNHEALTHY,
                    message="Redis ping failed",
                )

        except Exception as e:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.UNHEALTHY,
                message=f"Redis connection failed: {str(e)}",
            )


class PluginHealthChecker(HealthChecker):
    """Plugin system health checker."""

    def __init__(self, plugin_manager=None, timeout: float = 5.0):
        super().__init__("plugins", timeout)
        self.plugin_manager = plugin_manager

    async def _perform_check(self) -> HealthCheckResult:
        if not self.plugin_manager:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.UNKNOWN,
                message="No plugin manager configured",
            )

        try:
            plugins = self.plugin_manager.list_plugins()
            loaded_plugins = [p for p in plugins if self.plugin_manager.is_loaded(p)]
            failed_plugins = [p for p in plugins if self.plugin_manager.has_failed(p)]

            status = HealthStatus.HEALTHY
            if failed_plugins:
                status = (
                    HealthStatus.DEGRADED if loaded_plugins else HealthStatus.UNHEALTHY
                )

            return HealthCheckResult(
                name=self.name,
                status=status,
                message=f"{len(loaded_plugins)}/{len(plugins)} plugins healthy",
                details={
                    "total_plugins": len(plugins),
                    "loaded_plugins": len(loaded_plugins),
                    "failed_plugins": len(failed_plugins),
                    "failed_plugin_names": failed_plugins,
                },
            )

        except Exception as e:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.UNHEALTHY,
                message=f"Plugin health check failed: {str(e)}",
            )


class TransportHealthChecker(HealthChecker):
    """Transport layer health checker."""

    def __init__(self, connection_pool=None, timeout: float = 5.0):
        super().__init__("transport", timeout)
        self.connection_pool = connection_pool

    async def _perform_check(self) -> HealthCheckResult:
        if not self.connection_pool:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.UNKNOWN,
                message="No connection pool configured",
            )

        try:
            stats = self.connection_pool.get_pool_stats()

            # Determine status based on pool stats
            total_connections = stats.get("total_connections", 0)
            healthy_connections = stats.get("healthy_connections", 0)

            if healthy_connections == 0:
                status = HealthStatus.UNHEALTHY
                message = "No healthy transport connections"
            elif healthy_connections < total_connections:
                status = HealthStatus.DEGRADED
                message = (
                    f"{healthy_connections}/{total_connections} connections healthy"
                )
            else:
                status = HealthStatus.HEALTHY
                message = f"All {total_connections} connections healthy"

            return HealthCheckResult(
                name=self.name, status=status, message=message, details=stats
            )

        except Exception as e:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.UNHEALTHY,
                message=f"Transport health check failed: {str(e)}",
            )


class SystemResourcesHealthChecker(HealthChecker):
    """System resources health checker."""

    def __init__(
        self,
        cpu_threshold: float = 80.0,
        memory_threshold: float = 85.0,
        disk_threshold: float = 90.0,
        timeout: float = 5.0,
    ):
        super().__init__("system_resources", timeout)
        self.cpu_threshold = cpu_threshold
        self.memory_threshold = memory_threshold
        self.disk_threshold = disk_threshold

    async def _perform_check(self) -> HealthCheckResult:
        try:
            # Get system metrics
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage("/")

            # Check thresholds
            issues = []

            if cpu_percent > self.cpu_threshold:
                issues.append(f"High CPU usage: {cpu_percent:.1f}%")

            if memory.percent > self.memory_threshold:
                issues.append(f"High memory usage: {memory.percent:.1f}%")

            if disk.percent > self.disk_threshold:
                issues.append(f"High disk usage: {disk.percent:.1f}%")

            # Determine status
            if issues:
                status = (
                    HealthStatus.DEGRADED
                    if len(issues) <= 2
                    else HealthStatus.UNHEALTHY
                )
                message = "; ".join(issues)
            else:
                status = HealthStatus.HEALTHY
                message = "System resources within normal ranges"

            return HealthCheckResult(
                name=self.name,
                status=status,
                message=message,
                details={
                    "cpu_percent": round(cpu_percent, 1),
                    "memory_percent": round(memory.percent, 1),
                    "memory_available_gb": round(memory.available / (1024**3), 1),
                    "disk_percent": round(disk.percent, 1),
                    "disk_free_gb": round(disk.free / (1024**3), 1),
                    "python_version": sys.version,
                    "process_count": len(psutil.pids()),
                },
            )

        except Exception as e:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.UNHEALTHY,
                message=f"System resources check failed: {str(e)}",
            )


class CircuitBreakerHealthChecker(HealthChecker):
    """Circuit breaker health checker."""

    def __init__(self, circuit_breaker_registry=None, timeout: float = 5.0):
        super().__init__("circuit_breakers", timeout)
        self.registry = circuit_breaker_registry

    async def _perform_check(self) -> HealthCheckResult:
        if not self.registry:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.UNKNOWN,
                message="No circuit breaker registry configured",
            )

        try:
            breakers = self.registry.get_all_breakers()
            open_breakers = []
            half_open_breakers = []

            for name, breaker in breakers.items():
                if breaker.current_state == "open":
                    open_breakers.append(name)
                elif breaker.current_state == "half_open":
                    half_open_breakers.append(name)

            # Determine status
            if open_breakers:
                status = HealthStatus.DEGRADED
                message = f"{len(open_breakers)} circuit breakers open"
            elif half_open_breakers:
                status = HealthStatus.DEGRADED
                message = f"{len(half_open_breakers)} circuit breakers half-open"
            else:
                status = HealthStatus.HEALTHY
                message = f"All {len(breakers)} circuit breakers closed"

            return HealthCheckResult(
                name=self.name,
                status=status,
                message=message,
                details={
                    "total_breakers": len(breakers),
                    "open_breakers": open_breakers,
                    "half_open_breakers": half_open_breakers,
                    "closed_breakers": len(breakers)
                    - len(open_breakers)
                    - len(half_open_breakers),
                },
            )

        except Exception as e:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.UNHEALTHY,
                message=f"Circuit breaker health check failed: {str(e)}",
            )


class MCPDatabaseHealthChecker(HealthChecker):
    """MCP Database health checker with migration status."""

    def __init__(self, timeout: float = 10.0):
        super().__init__("mcp_database", timeout)

    async def _perform_check(self) -> HealthCheckResult:
        try:
            from ..infrastructure.database import get_database_manager

            db_manager = await get_database_manager()

            health_status = await db_manager.get_health_status()

            # Add migration status
            from ..infrastructure.migrations import get_migration_status

            migration_status = await get_migration_status()

            is_healthy = health_status.get("healthy", False)
            is_up_to_date = migration_status.get("up_to_date", False)

            status = (
                HealthStatus.HEALTHY
                if is_healthy and is_up_to_date
                else HealthStatus.UNHEALTHY
            )

            details = {**health_status, "migration_status": migration_status}

            return HealthCheckResult(
                name=self.name,
                status=status,
                message=f"Database {'healthy' if is_healthy else 'unhealthy'}, migrations {'up-to-date' if is_up_to_date else 'pending'}",
                details=details,
            )

        except Exception as e:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.UNHEALTHY,
                message=f"Database health check failed: {str(e)}",
            )


class CacheHealthChecker(HealthChecker):
    """Cache system health checker."""

    def __init__(self, timeout: float = 5.0):
        super().__init__("cache", timeout)

    async def _perform_check(self) -> HealthCheckResult:
        try:
            from ..core.caching import get_cache

            cache = get_cache()

            # Test cache operations
            test_key = "health_check_test"
            test_value = {"timestamp": time.time(), "test": True}

            # Set test value
            await cache.set(test_key, test_value, ttl=60)

            # Get test value
            retrieved = await cache.get(test_key)

            # Clean up
            await cache.delete(test_key)

            # Get cache stats
            stats = await cache.get_stats()

            is_healthy = retrieved is not None and retrieved.get("test") == True

            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.HEALTHY if is_healthy else HealthStatus.UNHEALTHY,
                message=f"Cache {'operational' if is_healthy else 'failed'}",
                details={
                    "backend": stats.get("backend", "unknown"),
                    "hit_rate": stats.get("hit_rate", 0),
                    "entry_count": stats.get("entry_count", 0),
                    "total_size_bytes": stats.get("total_size_bytes", 0),
                    "test_successful": is_healthy,
                },
            )

        except Exception as e:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.UNHEALTHY,
                message=f"Cache health check failed: {str(e)}",
            )


class RateLimitHealthChecker(HealthChecker):
    """Rate limiting health checker."""

    def __init__(self, timeout: float = 5.0):
        super().__init__("rate_limiting", timeout)

    async def _perform_check(self) -> HealthCheckResult:
        try:
            from ..core.rate_limiting import get_rate_limit_manager

            rate_limiter = await get_rate_limit_manager()

            # Test rate limiting with a test identifier
            test_identifier = "health_check_test"
            result = await rate_limiter.check_rate_limit(test_identifier, "api_default")

            # Get rules count
            rules = rate_limiter.list_rules()

            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.HEALTHY,
                message="Rate limiting operational",
                details={
                    "test_allowed": result.allowed,
                    "test_remaining": result.remaining,
                    "configured_rules": len(rules),
                    "backend_type": "redis",
                },
            )

        except Exception as e:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.UNHEALTHY,
                message=f"Rate limiting health check failed: {str(e)}",
            )


class HealthCheckManager:
    """Central health check management system."""

    def __init__(self):
        self.checkers: dict[str, HealthChecker] = {}
        self.custom_checkers: dict[str, Callable[[], Awaitable[HealthCheckResult]]] = {}
        self.last_results: dict[str, HealthCheckResult] = {}
        self.metrics_collector = get_metrics_collector()

        # Add default system health checkers
        self.add_checker(SystemResourcesHealthChecker())
        self.add_checker(MCPDatabaseHealthChecker())
        self.add_checker(CacheHealthChecker())
        self.add_checker(RateLimitHealthChecker())

    def add_checker(self, checker: HealthChecker):
        """Add a health checker."""
        self.checkers[checker.name] = checker
        logger.info(f"Added health checker: {checker.name}")

    def add_custom_checker(
        self, name: str, check_func: Callable[[], Awaitable[HealthCheckResult]]
    ):
        """Add a custom health check function."""
        self.custom_checkers[name] = check_func
        logger.info(f"Added custom health checker: {name}")

    def remove_checker(self, name: str):
        """Remove a health checker."""
        if name in self.checkers:
            del self.checkers[name]
            logger.info(f"Removed health checker: {name}")
        elif name in self.custom_checkers:
            del self.custom_checkers[name]
            logger.info(f"Removed custom health checker: {name}")

    async def check_health(
        self, checker_names: list[str] | None = None
    ) -> dict[str, HealthCheckResult]:
        """Run health checks for specified checkers or all if none specified."""
        if checker_names is None:
            checker_names = list(self.checkers.keys()) + list(
                self.custom_checkers.keys()
            )

        results = {}

        # Run standard checkers
        for name in checker_names:
            if name in self.checkers:
                try:
                    result = await self.checkers[name].check()
                    results[name] = result
                    self.last_results[name] = result

                    # Record metrics
                    self.metrics_collector.record_request(
                        method="health_check",
                        status=result.status.value,
                        plugin=name,
                        duration=result.duration_ms / 1000,
                    )

                except Exception as e:
                    logger.error(f"Health checker {name} failed", error=str(e))
                    result = HealthCheckResult(
                        name=name,
                        status=HealthStatus.UNHEALTHY,
                        message=f"Health checker failed: {str(e)}",
                    )
                    results[name] = result
                    self.last_results[name] = result

        # Run custom checkers
        for name in checker_names:
            if name in self.custom_checkers:
                try:
                    result = await self.custom_checkers[name]()
                    results[name] = result
                    self.last_results[name] = result

                except Exception as e:
                    logger.error(f"Custom health checker {name} failed", error=str(e))
                    result = HealthCheckResult(
                        name=name,
                        status=HealthStatus.UNHEALTHY,
                        message=f"Custom health checker failed: {str(e)}",
                    )
                    results[name] = result
                    self.last_results[name] = result

        return results

    async def get_overall_health(self) -> dict[str, Any]:
        """Get overall system health status."""
        results = await self.check_health()

        # Determine overall status
        statuses = [result.status for result in results.values()]

        if HealthStatus.UNHEALTHY in statuses:
            overall_status = HealthStatus.UNHEALTHY
        elif HealthStatus.DEGRADED in statuses:
            overall_status = HealthStatus.DEGRADED
        elif HealthStatus.UNKNOWN in statuses:
            overall_status = HealthStatus.UNKNOWN
        else:
            overall_status = HealthStatus.HEALTHY

        # Count statuses
        status_counts = {
            "healthy": sum(1 for s in statuses if s == HealthStatus.HEALTHY),
            "degraded": sum(1 for s in statuses if s == HealthStatus.DEGRADED),
            "unhealthy": sum(1 for s in statuses if s == HealthStatus.UNHEALTHY),
            "unknown": sum(1 for s in statuses if s == HealthStatus.UNKNOWN),
        }

        return {
            "status": overall_status.value,
            "timestamp": time.time(),
            "checks": {name: result.to_dict() for name, result in results.items()},
            "summary": {
                "total_checks": len(results),
                "status_counts": status_counts,
                "unhealthy_checks": [
                    name
                    for name, result in results.items()
                    if result.status == HealthStatus.UNHEALTHY
                ],
                "degraded_checks": [
                    name
                    for name, result in results.items()
                    if result.status == HealthStatus.DEGRADED
                ],
            },
        }

    def get_last_results(self) -> dict[str, HealthCheckResult]:
        """Get last health check results without running new checks."""
        return self.last_results.copy()

    async def get_readiness(self) -> bool:
        """Check if system is ready to serve traffic."""
        results = await self.check_health()

        # System is ready if no critical components are unhealthy
        critical_components = ["database", "redis", "transport"]

        for component in critical_components:
            if (
                component in results
                and results[component].status == HealthStatus.UNHEALTHY
            ):
                return False

        return True

    async def get_liveness(self) -> bool:
        """Check if system is alive (basic health check)."""
        try:
            # Just check system resources as a basic liveness check
            system_check = await self.checkers.get(
                "system_resources", SystemResourcesHealthChecker()
            ).check()
            return system_check.status != HealthStatus.UNHEALTHY
        except Exception:
            return False


# Global health check manager
health_manager = HealthCheckManager()


def get_health_manager() -> HealthCheckManager:
    """Get the global health check manager."""
    return health_manager
