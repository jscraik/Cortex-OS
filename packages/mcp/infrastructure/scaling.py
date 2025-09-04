"""Dynamic scaling and resource management for MCP infrastructure."""

import asyncio
import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Optional, cast
from contextlib import suppress

import docker  # type: ignore[reportMissingTypeStubs]
import psutil  # type: ignore[reportMissingTypeStubs]
from kubernetes import client, config  # type: ignore[reportMissingTypeStubs]

from ..observability.metrics import get_metrics_collector
from ..observability.structured_logging import get_logger
from .load_balancer import LoadBalancer, ServerNode

logger = get_logger(__name__)
metrics = get_metrics_collector()


class ScalingMode(Enum):
    """Scaling operation modes."""

    MANUAL = "manual"
    AUTOMATIC = "automatic"
    SCHEDULED = "scheduled"
    PREDICTIVE = "predictive"


class ResourceType(Enum):
    """Types of resources that can be scaled."""

    CPU = "cpu"
    MEMORY = "memory"
    STORAGE = "storage"
    NETWORK = "network"
    CONNECTIONS = "connections"
    THROUGHPUT = "throughput"


class ScalingAction(Enum):
    """Scaling action types."""

    SCALE_UP = "scale_up"
    SCALE_DOWN = "scale_down"
    SCALE_OUT = "scale_out"  # Horizontal scaling out
    SCALE_IN = "scale_in"  # Horizontal scaling in
    NO_ACTION = "no_action"


@dataclass
class ScalingMetric:
    """Represents a metric used for scaling decisions."""

    name: str
    current_value: float
    threshold_up: float
    threshold_down: float
    weight: float = 1.0
    resource_type: ResourceType = ResourceType.CPU

    @property
    def utilization_ratio(self) -> float:
        """Calculate utilization as a ratio (0.0 to 1.0+)."""
        return self.current_value / max(self.threshold_up, 1.0)

    @property
    def should_scale_up(self) -> bool:
        """Check if metric indicates scale up needed."""
        return self.current_value > self.threshold_up

    @property
    def should_scale_down(self) -> bool:
        """Check if metric indicates scale down possible."""
        return self.current_value < self.threshold_down


@dataclass
class ScalingPolicy:
    """Scaling policy configuration."""

    name: str
    enabled: bool = True
    mode: ScalingMode = ScalingMode.AUTOMATIC

    # Scaling limits
    min_instances: int = 1
    max_instances: int = 10
    min_cpu_cores: int = 1
    max_cpu_cores: int = 8
    min_memory_gb: int = 1
    max_memory_gb: int = 32

    # Timing controls
    cooldown_period: timedelta = field(default_factory=lambda: timedelta(minutes=5))
    evaluation_period: timedelta = field(default_factory=lambda: timedelta(minutes=1))

    # Scaling behavior
    scale_up_factor: float = 1.5  # Scale up by 50%
    scale_down_factor: float = 0.75  # Scale down by 25%
    max_scale_step: int = 2  # Maximum instances to add/remove at once

    # Metrics and thresholds
    metrics: list[ScalingMetric] = field(default_factory=list)

    def should_scale(self) -> tuple[ScalingAction, float]:
        """Determine if scaling action is needed."""
        if not self.enabled or not self.metrics:
            return ScalingAction.NO_ACTION, 0.0

        # Calculate weighted average utilization
        total_weight = sum(m.weight for m in self.metrics)
        if total_weight == 0:
            return ScalingAction.NO_ACTION, 0.0

        weighted_utilization = (
            sum(m.utilization_ratio * m.weight for m in self.metrics) / total_weight
        )

        # Check for scale up
        scale_up_count = sum(1 for m in self.metrics if m.should_scale_up)
        scale_down_count = sum(1 for m in self.metrics if m.should_scale_down)

        # Require majority of metrics to agree
        threshold = len(self.metrics) // 2 + 1

        if scale_up_count >= threshold:
            return ScalingAction.SCALE_UP, weighted_utilization
        elif scale_down_count >= threshold:
            return ScalingAction.SCALE_DOWN, weighted_utilization

        return ScalingAction.NO_ACTION, weighted_utilization


class ResourceMonitor:
    """Monitors system resources for scaling decisions."""

    def __init__(self, collection_interval: int = 30) -> None:
        self.collection_interval = collection_interval
        self._running = False
        self._monitor_task: asyncio.Task[Any] | None = None
        self.current_metrics: dict[str, float] = {}
        self.metric_history: dict[str, list[tuple[datetime, float]]] = {}
        self.history_retention = timedelta(hours=24)

    async def start(self) -> None:
        """Start resource monitoring."""
        if self._running:
            return

        self._running = True
        self._monitor_task = asyncio.create_task(self._monitoring_loop())
        logger.info("Resource monitor started")

    async def stop(self) -> None:
        """Stop resource monitoring."""
        self._running = False

        if self._monitor_task:
            self._monitor_task.cancel()
            with suppress(asyncio.CancelledError):
                await self._monitor_task

        logger.info("Resource monitor stopped")

    async def _monitoring_loop(self) -> None:
        """Main monitoring loop."""
        while self._running:
            try:
                await self._collect_metrics()
                await asyncio.sleep(self.collection_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Resource monitoring error: {e}")

    async def _collect_metrics(self) -> None:
        """Collect system metrics."""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            _cpu_count = psutil.cpu_count()
            load_avg = os.getloadavg()[0] if hasattr(os, "getloadavg") else 0

            # Memory metrics
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()

            # Disk metrics
            disk = psutil.disk_usage("/")
            disk_io = psutil.disk_io_counters()

            # Network metrics
            network_io = psutil.net_io_counters()

            # Process metrics
            process_count = len(psutil.pids())

            # Update current metrics
            timestamp = datetime.now()
            metric_values: dict[str, float] = {
                "cpu_percent": cpu_percent,
                "cpu_load": load_avg,
                "memory_percent": memory.percent,
                "memory_used_gb": memory.used / (1024**3),
                "memory_available_gb": memory.available / (1024**3),
                "swap_percent": swap.percent,
                "disk_percent": (disk.used / disk.total) * 100,
                "disk_free_gb": disk.free / (1024**3),
                "process_count": float(process_count),
            }

            if disk_io:
                metric_values.update(
                    {
                        "disk_read_mb_s": disk_io.read_bytes
                        / (1024**2)
                        / self.collection_interval,
                        "disk_write_mb_s": disk_io.write_bytes
                        / (1024**2)
                        / self.collection_interval,
                    }
                )

            if network_io:
                metric_values.update(
                    {
                        "network_recv_mb_s": network_io.bytes_recv
                        / (1024**2)
                        / self.collection_interval,
                        "network_sent_mb_s": network_io.bytes_sent
                        / (1024**2)
                        / self.collection_interval,
                    }
                )

            self.current_metrics = metric_values

            # Store in history
            for metric_name, value in metric_values.items():
                if metric_name not in self.metric_history:
                    self.metric_history[metric_name] = []

                self.metric_history[metric_name].append((timestamp, value))

                # Cleanup old history
                cutoff_time = timestamp - self.history_retention
                self.metric_history[metric_name] = [
                    (ts, val)
                    for ts, val in self.metric_history[metric_name]
                    if ts > cutoff_time
                ]

            # Record Prometheus metrics
            for metric_name, value in metric_values.items():
                metric_id = f"resource_{metric_name}"
                gauge = metrics.get_custom_metric(metric_id)
                if gauge is None:
                    metrics.add_custom_metric(
                        metric_id,
                        "gauge",
                        f"Resource metric {metric_name}",
                    )
                    gauge = metrics.get_custom_metric(metric_id)
                try:
                    # Prometheus Gauge without labels supports .set(value)
                    gauge.set(value)
                except Exception as e:  # Defensive: do not break monitor on metrics errors
                    logger.debug(f"Metric update failed for {metric_id}: {e}")

        except Exception as e:
            logger.error(f"Failed to collect metrics: {e}")

    def get_metric_average(self, metric_name: str, period: timedelta) -> float | None:
        """Get average value of a metric over a period."""
        if metric_name not in self.metric_history:
            return None

        cutoff_time = datetime.now() - period
        recent_values = [
            value
            for timestamp, value in self.metric_history[metric_name]
            if timestamp > cutoff_time
        ]

        if not recent_values:
            return None

        return sum(recent_values) / len(recent_values)

    def get_metric_trend(self, metric_name: str, period: timedelta) -> str | None:
        """Get trend direction of a metric (up/down/stable)."""
        if metric_name not in self.metric_history:
            return None

        cutoff_time = datetime.now() - period
        recent_data = [
            (timestamp, value)
            for timestamp, value in self.metric_history[metric_name]
            if timestamp > cutoff_time
        ]

        if len(recent_data) < 2:
            return "stable"

        # Calculate simple linear trend
        first_half = recent_data[: len(recent_data) // 2]
        second_half = recent_data[len(recent_data) // 2 :]

        first_avg = sum(value for _, value in first_half) / len(first_half)
        second_avg = sum(value for _, value in second_half) / len(second_half)

        change_percent = ((second_avg - first_avg) / first_avg) * 100

        if change_percent > 5:
            return "up"
        elif change_percent < -5:
            return "down"
        else:
            return "stable"


class ContainerScaler:
    """Docker container scaling implementation."""

    def __init__(self) -> None:
        self.docker_client: Optional[Any] = None
        self._initialize_docker()

    def _initialize_docker(self) -> None:
        """Initialize Docker client."""
        try:
            self.docker_client = cast(Any, docker).from_env()  # type: ignore[attr-defined]
            logger.info("Docker client initialized")
        except Exception as e:
            logger.warning(f"Docker not available: {e}")

    async def create_container(
        self,
        image: str,
        name: str,
        port: int,
        environment: dict[str, str] | None = None,
    ) -> ServerNode | None:
        """Create a new container instance."""
        if not self.docker_client:
            return None

        try:
            container = self.docker_client.containers.run(
                image,
                detach=True,
                name=name,
                ports={"8000/tcp": port},
                environment=environment or {},
            )

            # Wait for container to be ready
            await asyncio.sleep(5)

            # Create server node
            server_node = ServerNode(
                id=container.id[:12], host="localhost", port=port, weight=1.0
            )

            logger.info(f"Created container {name} on port {port}")
            return server_node

        except Exception as e:
            logger.error(f"Failed to create container: {e}")
            return None

    async def destroy_container(self, server_node: ServerNode) -> None:
        """Destroy a container instance."""
        if not self.docker_client:
            return

        try:
            container = self.docker_client.containers.get(server_node.id)
            container.stop()
            container.remove()
            logger.info(f"Destroyed container {server_node.id}")

        except Exception as e:
            logger.error(f"Failed to destroy container: {e}")


class KubernetesScaler:
    """Kubernetes deployment scaling implementation."""

    def __init__(self, namespace: str = "default") -> None:
        self.namespace = namespace
        self.k8s_client: Optional[Any] = None
        self._initialize_k8s()

    def _initialize_k8s(self) -> None:
        """Initialize Kubernetes client."""
        try:
            # Try to load in-cluster config first
            try:
                config.load_incluster_config()
            except Exception:
                # Fall back to local config
                config.load_kube_config()

            self.k8s_client = client.AppsV1Api()
            logger.info("Kubernetes client initialized")

        except Exception as e:
            logger.warning(f"Kubernetes not available: {e}")

    async def scale_deployment(self, deployment_name: str, replicas: int) -> bool:
        """Scale a Kubernetes deployment."""
        if not self.k8s_client:
            return False

        try:
            # Patch the deployment
            body = {"spec": {"replicas": replicas}}
            self.k8s_client.patch_namespaced_deployment_scale(
                name=deployment_name, namespace=self.namespace, body=body
            )

            logger.info(f"Scaled deployment {deployment_name} to {replicas} replicas")
            return True

        except Exception as e:
            logger.error(f"Failed to scale deployment: {e}")
            return False

    async def get_deployment_status(
        self, deployment_name: str
    ) -> dict[str, Any] | None:
        """Get deployment status."""
        if not self.k8s_client:
            return None

        try:
            deployment = self.k8s_client.read_namespaced_deployment(
                name=deployment_name, namespace=self.namespace
            )

            return {
                "name": deployment.metadata.name,
                "replicas": deployment.spec.replicas,
                "ready_replicas": deployment.status.ready_replicas or 0,
                "available_replicas": deployment.status.available_replicas or 0,
                "unavailable_replicas": deployment.status.unavailable_replicas or 0,
            }

        except Exception as e:
            logger.error(f"Failed to get deployment status: {e}")
            return None


class PredictiveScaler:
    """Predictive scaling based on historical patterns."""

    def __init__(self, resource_monitor: ResourceMonitor) -> None:
        self.resource_monitor = resource_monitor
        self.prediction_window = timedelta(minutes=15)
        self.history_window = timedelta(days=7)

    def predict_resource_demand(self, metric_name: str) -> float | None:
        """Predict future resource demand based on patterns."""
        if metric_name not in self.resource_monitor.metric_history:
            return None

        history = self.resource_monitor.metric_history[metric_name]
        if len(history) < 10:  # Need minimum data points
            return None

        # Simple pattern-based prediction
        current_time = datetime.now()

        # Look for similar time patterns in history
        same_hour_values = []
        same_day_values = []

        for timestamp, value in history:
            time_diff = current_time - timestamp

            # Same hour of day (within 1 hour)
            if abs(time_diff.seconds % 86400 - current_time.hour * 3600) < 3600:
                same_hour_values.append(value)

            # Same day of week
            if timestamp.weekday() == current_time.weekday():
                same_day_values.append(value)

        # Calculate weighted prediction
        hour_avg = (
            sum(same_hour_values) / len(same_hour_values) if same_hour_values else 0
        )
        day_avg = sum(same_day_values) / len(same_day_values) if same_day_values else 0
        overall_avg = sum(value for _, value in history[-50:]) / min(len(history), 50)

        # Weight recent patterns more heavily
        prediction = hour_avg * 0.5 + day_avg * 0.3 + overall_avg * 0.2

        return max(0, prediction)


class DynamicScalingManager:
    """Main dynamic scaling coordinator."""

    def __init__(self, load_balancer: LoadBalancer) -> None:
        self.load_balancer = load_balancer
        self.resource_monitor = ResourceMonitor()
        self.container_scaler = ContainerScaler()
        self.k8s_scaler = KubernetesScaler()
        self.predictive_scaler = PredictiveScaler(self.resource_monitor)

        # Scaling configuration
        self.policies: dict[str, ScalingPolicy] = {}
        self.last_scaling_action: datetime | None = None
        self.scaling_history: list[dict[str, Any]] = []

        # Control
        self._running = False
        self._scaling_task: asyncio.Task[Any] | None = None

        # Default policy
        self._create_default_policy()

        logger.info("Dynamic scaling manager initialized")

    def _create_default_policy(self) -> None:
        """Create default scaling policy."""
        default_metrics = [
            ScalingMetric("cpu_percent", 0, 80, 30, 1.0, ResourceType.CPU),
            ScalingMetric("memory_percent", 0, 85, 40, 0.8, ResourceType.MEMORY),
            ScalingMetric("cpu_load", 0, 2.0, 0.5, 0.6, ResourceType.CPU),
        ]

        default_policy = ScalingPolicy(
            name="default",
            enabled=True,
            mode=ScalingMode.AUTOMATIC,
            min_instances=1,
            max_instances=5,
            metrics=default_metrics,
        )

        self.policies["default"] = default_policy

    async def start(self) -> None:
        """Start the scaling manager."""
        if self._running:
            return

        await self.resource_monitor.start()
        self._running = True
        self._scaling_task = asyncio.create_task(self._scaling_loop())
        logger.info("Dynamic scaling manager started")

    async def stop(self) -> None:
        """Stop the scaling manager."""
        self._running = False

        if self._scaling_task:
            self._scaling_task.cancel()
            with suppress(asyncio.CancelledError):
                await self._scaling_task

        await self.resource_monitor.stop()
        logger.info("Dynamic scaling manager stopped")

    async def _scaling_loop(self) -> None:
        """Main scaling evaluation loop."""
        while self._running:
            try:
                await self._evaluate_scaling_policies()
                await asyncio.sleep(30)  # Check every 30 seconds
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Scaling loop error: {e}")

    async def _evaluate_scaling_policies(self) -> None:
        """Evaluate all scaling policies and take action if needed."""
        for _policy_name, policy in self.policies.items():
            if not policy.enabled:
                continue

            # Update metrics from resource monitor
            await self._update_policy_metrics(policy)

            # Get scaling recommendation
            action, utilization = policy.should_scale()

            if action == ScalingAction.NO_ACTION:
                continue

            # Check cooldown
            if (
                self.last_scaling_action
                and datetime.now() - self.last_scaling_action < policy.cooldown_period
            ):
                continue

            # Execute scaling action
            if action in [ScalingAction.SCALE_UP, ScalingAction.SCALE_OUT]:
                await self._scale_up(policy, utilization)
            elif action in [ScalingAction.SCALE_DOWN, ScalingAction.SCALE_IN]:
                await self._scale_down(policy, utilization)

    async def _update_policy_metrics(self, policy: ScalingPolicy) -> None:
        """Update policy metrics from resource monitor."""
        current_metrics = self.resource_monitor.current_metrics

        for metric in policy.metrics:
            if metric.name in current_metrics:
                metric.current_value = current_metrics[metric.name]

    async def _scale_up(self, policy: ScalingPolicy, utilization: float) -> None:
        """Scale up resources."""
        try:
            current_servers = len(self.load_balancer.get_available_servers())

            if current_servers >= policy.max_instances:
                logger.info(f"Maximum instances ({policy.max_instances}) reached")
                return

            # Create new server instance
            new_port = 8000 + current_servers + 1
            server_node = await self.container_scaler.create_container(
                image="mcp-server:latest",
                name=f"mcp-server-{current_servers + 1}",
                port=new_port,
            )

            if server_node:
                self.load_balancer.add_server(server_node)
                self.last_scaling_action = datetime.now()

                # Record scaling event
                self._record_scaling_event(
                    "scale_up", policy.name, utilization, current_servers + 1
                )

                logger.info(
                    f"Scaled up: added server {server_node.id} (utilization: {utilization:.1%})"
                )

        except Exception as e:
            logger.error(f"Scale up failed: {e}")

    async def _scale_down(self, policy: ScalingPolicy, utilization: float) -> None:
        """Scale down resources."""
        try:
            available_servers = self.load_balancer.get_available_servers()

            if len(available_servers) <= policy.min_instances:
                logger.info(f"Minimum instances ({policy.min_instances}) reached")
                return

            # Find server with least connections to remove
            server_to_remove = min(
                available_servers, key=lambda s: s.current_connections
            )

                for metric_name, value in metric_values.items():
                    metric_id = f"resource_{metric_name}"
                    gauge = metrics.get_custom_metric(metric_id)
                    if gauge is None:
                        metrics.add_custom_metric(
                            metric_id,
                            "gauge",
                            f"Resource metric {metric_name}",
                        )
                        gauge = metrics.get_custom_metric(metric_id)
                    try:
                        if gauge is not None and hasattr(gauge, "set"):
                            cast(Any, gauge).set(value)
                    except Exception as e:  # Defensive: do not break monitor on metrics errors
                        logger.debug(f"Metric update failed for {metric_id}: {e}")
            )

        except Exception as e:
            logger.error(f"Scale down failed: {e}")

    def _record_scaling_event(
        self, action: str, policy: str, utilization: float, new_count: int
    ) -> None:
        """Record a scaling event."""
        event = {
            "timestamp": datetime.now().isoformat(),
            "action": action,
            "policy": policy,
            "utilization": utilization,
            "instance_count": new_count,
            "metrics": dict(self.resource_monitor.current_metrics),
        }

        self.scaling_history.append(event)

        # Keep only recent history
        if len(self.scaling_history) > 1000:
            self.scaling_history = self.scaling_history[-500:]

        # Record metrics via a custom counter
        counter_name = f"scaling_action_{action}"
        counter = metrics.get_custom_metric(counter_name)
        if counter is None:
            metrics.add_custom_metric(
                counter_name,
                "counter",
                f"Number of '{action}' scaling actions",
            )
            counter = metrics.get_custom_metric(counter_name)
        try:
            if counter is not None and hasattr(counter, "inc"):
                cast(Any, counter).inc()
        except Exception as e:
            logger.debug(f"Counter update failed for {counter_name}: {e}")

    def add_policy(self, policy: ScalingPolicy) -> None:
        """Add a scaling policy."""
        self.policies[policy.name] = policy
        logger.info(f"Added scaling policy: {policy.name}")

    def remove_policy(self, policy_name: str) -> None:
        """Remove a scaling policy."""
        if policy_name in self.policies:
            del self.policies[policy_name]
            logger.info(f"Removed scaling policy: {policy_name}")

    def get_scaling_status(self) -> dict[str, Any]:
        """Get current scaling status."""
        return {
            "running": self._running,
            "policies": {
                name: {
                    "enabled": policy.enabled,
                    "mode": policy.mode.value,
                    "min_instances": policy.min_instances,
                    "max_instances": policy.max_instances,
                    "current_utilization": sum(
                        m.utilization_ratio for m in policy.metrics
                    )
                    / len(policy.metrics)
                    if policy.metrics
                    else 0,
                }
                for name, policy in self.policies.items()
            },
            "current_instances": len(self.load_balancer.get_available_servers()),
            "last_scaling_action": self.last_scaling_action.isoformat()
            if self.last_scaling_action
            else None,
            "resource_metrics": dict(self.resource_monitor.current_metrics),
            "recent_scaling_events": self.scaling_history[-10:],
        }


# Global scaling manager instance
_scaling_manager: DynamicScalingManager | None = None


def get_scaling_manager(
    load_balancer: LoadBalancer | None = None,
) -> DynamicScalingManager:
    """Get or create global scaling manager instance."""
    global _scaling_manager

    if _scaling_manager is None:
        from .load_balancer import get_load_balancer

        lb = load_balancer or get_load_balancer()
        _scaling_manager = DynamicScalingManager(lb)

    return _scaling_manager
