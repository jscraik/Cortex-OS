"""Advanced metrics collection system for MCP with Prometheus integration."""

import logging
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any

from prometheus_client import (
    CollectorRegistry,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)

logger = logging.getLogger(__name__)


@dataclass
class MetricData:
    """Data class for custom metrics."""

    name: str
    value: float
    labels: dict[str, str] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)


class MetricsCollector:
    """Advanced metrics collection system with Prometheus integration."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        """Singleton pattern for metrics collector."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, "initialized"):
            return

        self.registry = CollectorRegistry()
        self.logger = logging.getLogger(__name__)

        # Core MCP metrics
        self.request_counter = Counter(
            "mcp_requests_total",
            "Total number of MCP requests",
            ["method", "status", "plugin", "transport"],
            registry=self.registry,
        )

        self.request_duration = Histogram(
            "mcp_request_duration_seconds",
            "Time spent processing MCP requests",
            ["method", "plugin", "transport"],
            buckets=(
                0.005,
                0.01,
                0.025,
                0.05,
                0.075,
                0.1,
                0.25,
                0.5,
                0.75,
                1.0,
                2.5,
                5.0,
                7.5,
                10.0,
            ),
            registry=self.registry,
        )

        self.active_connections = Gauge(
            "mcp_active_connections",
            "Number of active connections",
            ["transport", "plugin"],
            registry=self.registry,
        )

        self.connection_pool_size = Gauge(
            "mcp_connection_pool_size",
            "Size of connection pools",
            ["pool_name", "state"],
            registry=self.registry,
        )

        # Task queue metrics
        self.task_queue_size = Gauge(
            "mcp_task_queue_size",
            "Number of tasks in queue",
            ["priority", "status"],
            registry=self.registry,
        )

        self.task_execution_counter = Counter(
            "mcp_task_executions_total",
            "Total number of task executions",
            ["task_name", "status"],
            registry=self.registry,
        )

        self.task_execution_duration = Histogram(
            "mcp_task_execution_duration_seconds",
            "Time spent executing tasks",
            ["task_name"],
            buckets=(0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0, 120.0),
            registry=self.registry,
        )

        # Plugin metrics
        self.plugin_counter = Counter(
            "mcp_plugin_operations_total",
            "Total plugin operations",
            ["plugin_name", "operation", "status"],
            registry=self.registry,
        )

        self.plugin_load_time = Histogram(
            "mcp_plugin_load_time_seconds",
            "Time to load plugins",
            ["plugin_name"],
            registry=self.registry,
        )

        # Security metrics
        self.auth_attempts = Counter(
            "mcp_auth_attempts_total",
            "Authentication attempts",
            ["username", "result", "method"],
            registry=self.registry,
        )

        self.rate_limit_hits = Counter(
            "mcp_rate_limit_hits_total",
            "Rate limit violations",
            ["endpoint", "identifier_type"],
            registry=self.registry,
        )

        # System metrics
        self.error_counter = Counter(
            "mcp_errors_total",
            "Total errors by type",
            ["error_type", "component"],
            registry=self.registry,
        )

        self.circuit_breaker_state = Gauge(
            "mcp_circuit_breaker_state",
            "Circuit breaker state (0=closed, 1=half-open, 2=open)",
            ["breaker_name"],
            registry=self.registry,
        )

        # Custom metrics storage
        self.custom_metrics: dict[str, Any] = {}
        self.initialized = True

    def record_request(
        self,
        method: str,
        status: str,
        plugin: str,
        duration: float,
        transport: str = "http",
    ):
        """Record a request metric."""
        try:
            self.request_counter.labels(
                method=method, status=status, plugin=plugin, transport=transport
            ).inc()

            self.request_duration.labels(
                method=method, plugin=plugin, transport=transport
            ).observe(duration)

        except Exception as e:
            self.logger.error(f"Error recording request metric: {e}")

    def set_active_connections(self, transport: str, plugin: str, count: int):
        """Set active connections count."""
        try:
            self.active_connections.labels(transport=transport, plugin=plugin).set(
                count
            )
        except Exception as e:
            self.logger.error(f"Error setting active connections: {e}")

    def set_connection_pool_size(self, pool_name: str, state: str, size: int):
        """Set connection pool size metrics."""
        try:
            self.connection_pool_size.labels(pool_name=pool_name, state=state).set(size)
        except Exception as e:
            self.logger.error(f"Error setting connection pool size: {e}")

    def record_task_execution(self, task_name: str, status: str, duration: float):
        """Record task execution metrics."""
        try:
            self.task_execution_counter.labels(task_name=task_name, status=status).inc()
            self.task_execution_duration.labels(task_name=task_name).observe(duration)
        except Exception as e:
            self.logger.error(f"Error recording task execution: {e}")

    def set_task_queue_size(self, priority: str, status: str, size: int):
        """Set task queue size metrics."""
        try:
            self.task_queue_size.labels(priority=priority, status=status).set(size)
        except Exception as e:
            self.logger.error(f"Error setting task queue size: {e}")

    def record_plugin_operation(self, plugin_name: str, operation: str, status: str):
        """Record plugin operation."""
        try:
            self.plugin_counter.labels(
                plugin_name=plugin_name, operation=operation, status=status
            ).inc()
        except Exception as e:
            self.logger.error(f"Error recording plugin operation: {e}")

    def record_plugin_load_time(self, plugin_name: str, duration: float):
        """Record plugin load time."""
        try:
            self.plugin_load_time.labels(plugin_name=plugin_name).observe(duration)
        except Exception as e:
            self.logger.error(f"Error recording plugin load time: {e}")

    def record_auth_attempt(self, username: str, result: str, method: str = "jwt"):
        """Record authentication attempt."""
        try:
            self.auth_attempts.labels(
                username=username, result=result, method=method
            ).inc()
        except Exception as e:
            self.logger.error(f"Error recording auth attempt: {e}")

    def record_rate_limit_hit(self, endpoint: str, identifier_type: str = "ip"):
        """Record rate limit violation."""
        try:
            self.rate_limit_hits.labels(
                endpoint=endpoint, identifier_type=identifier_type
            ).inc()
        except Exception as e:
            self.logger.error(f"Error recording rate limit hit: {e}")

    def record_error(self, error_type: str, component: str):
        """Record system error."""
        try:
            self.error_counter.labels(error_type=error_type, component=component).inc()
        except Exception as e:
            self.logger.error(f"Error recording error metric: {e}")

    def set_circuit_breaker_state(self, breaker_name: str, state: str):
        """Set circuit breaker state (closed=0, half_open=1, open=2)."""
        try:
            state_values = {"closed": 0, "half_open": 1, "open": 2}
            state_value = state_values.get(state, 0)
            self.circuit_breaker_state.labels(breaker_name=breaker_name).set(
                state_value
            )
        except Exception as e:
            self.logger.error(f"Error setting circuit breaker state: {e}")

    @contextmanager
    def time_operation(
        self, operation_name: str, _labels: dict[str, str] | None = None
    ):
        """Context manager to time operations."""
        start_time = time.time()
        try:
            yield
        finally:
            duration = time.time() - start_time
            # This could be extended to use different metrics based on operation_name
            self.logger.debug(f"Operation {operation_name} took {duration:.3f}s")

    def add_custom_metric(
        self,
        name: str,
        metric_type: str,
        description: str,
        labels: list[str] = None,
        **kwargs,
    ):
        """Add a custom metric."""
        try:
            labels = labels or []

            if metric_type == "counter":
                self.custom_metrics[name] = Counter(
                    name, description, labels, registry=self.registry, **kwargs
                )
            elif metric_type == "gauge":
                self.custom_metrics[name] = Gauge(
                    name, description, labels, registry=self.registry, **kwargs
                )
            elif metric_type == "histogram":
                self.custom_metrics[name] = Histogram(
                    name, description, labels, registry=self.registry, **kwargs
                )
            else:
                raise ValueError(f"Unsupported metric type: {metric_type}")

            self.logger.info(f"Added custom metric: {name} ({metric_type})")

        except Exception as e:
            self.logger.error(f"Error adding custom metric {name}: {e}")

    def get_custom_metric(self, name: str):
        """Get a custom metric by name."""
        return self.custom_metrics.get(name)

    def get_prometheus_metrics(self) -> str:
        """Get Prometheus-formatted metrics."""
        try:
            return generate_latest(self.registry).decode("utf-8")
        except Exception as e:
            self.logger.error(f"Error generating Prometheus metrics: {e}")
            return ""

    def get_metrics_summary(self) -> dict[str, Any]:
        """Get a summary of current metrics."""
        try:
            return {
                "prometheus_metrics_available": True,
                "custom_metrics_count": len(self.custom_metrics),
                "registry_collectors": len(
                    list(self.registry._collector_to_names.keys())
                ),
                "timestamp": time.time(),
            }
        except Exception as e:
            self.logger.error(f"Error getting metrics summary: {e}")
            return {"error": str(e)}

    def reset_metrics(self):
        """Reset all metrics (use with caution, primarily for testing)."""
        try:
            # Clear custom metrics
            self.custom_metrics.clear()

            # Create new registry
            self.registry = CollectorRegistry()

            # Re-initialize core metrics
            self.__init__()

            self.logger.warning("All metrics have been reset")

        except Exception as e:
            self.logger.error(f"Error resetting metrics: {e}")


# Global metrics collector instance
metrics_collector = MetricsCollector()


def get_metrics_collector() -> MetricsCollector:
    """Get the global metrics collector instance."""
    return metrics_collector
