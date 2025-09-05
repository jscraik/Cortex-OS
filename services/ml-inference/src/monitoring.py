"""
Advanced monitoring and observability for ML inference service.

Provides detailed performance analytics, alerting, distributed tracing, and real-time metrics.
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Callable
from collections import defaultdict, deque
import json

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

from prometheus_client import (
    Counter, Histogram, Gauge, Summary,
    CollectorRegistry, generate_latest,
    CONTENT_TYPE_LATEST
)

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetrics:
    """Performance metrics collection."""
    request_count: int = 0
    total_latency: float = 0.0
    min_latency: float = float('inf')
    max_latency: float = 0.0
    error_count: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    tokens_generated: int = 0
    memory_usage_mb: float = 0.0
    cpu_usage_percent: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)

    @property
    def avg_latency(self) -> float:
        """Calculate average latency."""
        return self.total_latency / max(1, self.request_count)

    @property
    def error_rate(self) -> float:
        """Calculate error rate percentage."""
        return (self.error_count / max(1, self.request_count)) * 100

    @property
    def cache_hit_rate(self) -> float:
        """Calculate cache hit rate percentage."""
        total_cache_requests = self.cache_hits + self.cache_misses
        return (self.cache_hits / max(1, total_cache_requests)) * 100


@dataclass
class AlertRule:
    """Alert rule configuration."""
    name: str
    metric: str
    threshold: float
    operator: str  # 'gt', 'lt', 'eq', 'gte', 'lte'
    severity: str  # 'low', 'medium', 'high', 'critical'
    description: str
    enabled: bool = True
    cooldown_seconds: int = 300  # 5 minutes default cooldown


@dataclass
class Alert:
    """Alert instance."""
    rule_name: str
    severity: str
    message: str
    value: float
    threshold: float
    timestamp: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None


class PrometheusMetrics:
    """Prometheus metrics collector."""

    def __init__(self, registry: Optional[CollectorRegistry] = None):
        self.registry = registry or CollectorRegistry()

        # Request metrics
        self.request_total = Counter(
            'inference_requests_total',
            'Total inference requests',
            ['method', 'status'],
            registry=self.registry
        )

        self.request_duration = Histogram(
            'inference_request_duration_seconds',
            'Request duration in seconds',
            ['method'],
            registry=self.registry
        )

        self.tokens_generated_total = Counter(
            'inference_tokens_generated_total',
            'Total tokens generated',
            registry=self.registry
        )

        # Model metrics
        self.model_loading_duration = Histogram(
            'model_loading_duration_seconds',
            'Model loading duration in seconds',
            registry=self.registry
        )

        self.active_models = Gauge(
            'active_models_count',
            'Number of active models',
            registry=self.registry
        )

        # System metrics
        self.memory_usage = Gauge(
            'system_memory_usage_bytes',
            'System memory usage in bytes',
            registry=self.registry
        )

        self.cpu_usage = Gauge(
            'system_cpu_usage_percent',
            'System CPU usage percentage',
            registry=self.registry
        )

        # Cache metrics
        self.cache_hits = Counter(
            'inference_cache_hits_total',
            'Cache hits',
            registry=self.registry
        )

        self.cache_misses = Counter(
            'inference_cache_misses_total',
            'Cache misses',
            registry=self.registry
        )

        # Error metrics
        self.errors_total = Counter(
            'inference_errors_total',
            'Total errors',
            ['error_type'],
            registry=self.registry
        )

        # Circuit breaker metrics
        self.circuit_breaker_state = Gauge(
            'circuit_breaker_state',
            'Circuit breaker state (0=closed, 1=open, 2=half-open)',
            registry=self.registry
        )

        self.circuit_breaker_failures = Counter(
            'circuit_breaker_failures_total',
            'Circuit breaker failures',
            registry=self.registry
        )

    def record_request(self, method: str, status: str, duration: float):
        """Record a request."""
        self.request_total.labels(method=method, status=status).inc()
        self.request_duration.labels(method=method).observe(duration)

    def record_tokens(self, count: int):
        """Record tokens generated."""
        self.tokens_generated_total.inc(count)

    def record_error(self, error_type: str):
        """Record an error."""
        self.errors_total.labels(error_type=error_type).inc()

    def record_cache_hit(self):
        """Record cache hit."""
        self.cache_hits.inc()

    def record_cache_miss(self):
        """Record cache miss."""
        self.cache_misses.inc()

    def update_system_metrics(self):
        """Update system metrics."""
        if PSUTIL_AVAILABLE:
            memory = psutil.virtual_memory()
            self.memory_usage.set(memory.used)
            self.cpu_usage.set(psutil.cpu_percent())

    def generate_metrics(self) -> str:
        """Generate Prometheus metrics."""
        return generate_latest(self.registry)


class AlertManager:
    """Alert management system."""

    def __init__(self):
        self.rules: Dict[str, AlertRule] = {}
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: deque = deque(maxlen=1000)
        self.last_alert_time: Dict[str, datetime] = {}
        self.alert_handlers: List[Callable[[Alert], None]] = []

    def add_rule(self, rule: AlertRule):
        """Add an alert rule."""
        self.rules[rule.name] = rule
        logger.info(f"Added alert rule: {rule.name}")

    def add_handler(self, handler: Callable[[Alert], None]):
        """Add an alert handler."""
        self.alert_handlers.append(handler)

    def check_metric(self, metric_name: str, value: float):
        """Check a metric against all relevant rules."""
        for rule_name, rule in self.rules.items():
            if rule.metric == metric_name and rule.enabled:
                self._evaluate_rule(rule, value)

    def _evaluate_rule(self, rule: AlertRule, value: float):
        """Evaluate a rule against a value."""
        triggered = False

        if rule.operator == 'gt' and value > rule.threshold:
            triggered = True
        elif rule.operator == 'gte' and value >= rule.threshold:
            triggered = True
        elif rule.operator == 'lt' and value < rule.threshold:
            triggered = True
        elif rule.operator == 'lte' and value <= rule.threshold:
            triggered = True
        elif rule.operator == 'eq' and value == rule.threshold:
            triggered = True

        if triggered:
            self._trigger_alert(rule, value)
        else:
            self._resolve_alert(rule.name)

    def _trigger_alert(self, rule: AlertRule, value: float):
        """Trigger an alert."""
        now = datetime.now()

        # Check cooldown
        if rule.name in self.last_alert_time:
            time_diff = now - self.last_alert_time[rule.name]
            if time_diff.total_seconds() < rule.cooldown_seconds:
                return

        alert = Alert(
            rule_name=rule.name,
            severity=rule.severity,
            message=f"{rule.description} (value: {value}, threshold: {rule.threshold})",
            value=value,
            threshold=rule.threshold,
            timestamp=now
        )

        self.active_alerts[rule.name] = alert
        self.alert_history.append(alert)
        self.last_alert_time[rule.name] = now

        # Notify handlers
        for handler in self.alert_handlers:
            try:
                handler(alert)
            except Exception as e:
                logger.error(f"Alert handler error: {e}")

        logger.warning(f"ALERT: {alert.message}")

    def _resolve_alert(self, rule_name: str):
        """Resolve an alert."""
        if rule_name in self.active_alerts:
            alert = self.active_alerts[rule_name]
            alert.resolved = True
            alert.resolved_at = datetime.now()

            del self.active_alerts[rule_name]
            logger.info(f"RESOLVED: {rule_name}")

    def get_active_alerts(self) -> List[Alert]:
        """Get all active alerts."""
        return list(self.active_alerts.values())

    def get_alert_summary(self) -> Dict[str, Any]:
        """Get alert summary."""
        severity_counts = defaultdict(int)
        for alert in self.active_alerts.values():
            severity_counts[alert.severity] += 1

        return {
            "total_active": len(self.active_alerts),
            "by_severity": dict(severity_counts),
            "total_rules": len(self.rules),
            "enabled_rules": sum(1 for rule in self.rules.values() if rule.enabled)
        }


class PerformanceAnalyzer:
    """Advanced performance analysis."""

    def __init__(self, window_size: int = 100):
        self.window_size = window_size
        self.metrics_history: deque = deque(maxlen=window_size)
        self.current_metrics = PerformanceMetrics()

    def record_request(
        self,
        latency: float,
        success: bool,
        cache_hit: bool,
        tokens: int = 0,
        error_type: Optional[str] = None
    ):
        """Record a request for analysis."""
        self.current_metrics.request_count += 1
        self.current_metrics.total_latency += latency
        self.current_metrics.min_latency = min(self.current_metrics.min_latency, latency)
        self.current_metrics.max_latency = max(self.current_metrics.max_latency, latency)

        if not success:
            self.current_metrics.error_count += 1

        if cache_hit:
            self.current_metrics.cache_hits += 1
        else:
            self.current_metrics.cache_misses += 1

        self.current_metrics.tokens_generated += tokens

        # Update system metrics
        if PSUTIL_AVAILABLE:
            memory = psutil.virtual_memory()
            self.current_metrics.memory_usage_mb = memory.used / (1024 * 1024)
            self.current_metrics.cpu_usage_percent = psutil.cpu_percent()

    def get_current_metrics(self) -> PerformanceMetrics:
        """Get current metrics snapshot."""
        return self.current_metrics

    def get_percentiles(self, percentiles: List[float] = [50, 90, 95, 99]) -> Dict[str, float]:
        """Calculate latency percentiles from recent history."""
        if not self.metrics_history:
            return {f"p{p}": 0.0 for p in percentiles}

        latencies = [m.avg_latency for m in self.metrics_history if m.request_count > 0]
        if not latencies:
            return {f"p{p}": 0.0 for p in percentiles}

        latencies.sort()
        result = {}

        for p in percentiles:
            index = int((p / 100) * len(latencies))
            index = min(index, len(latencies) - 1)
            result[f"p{p}"] = latencies[index]

        return result

    def detect_anomalies(self) -> List[str]:
        """Detect performance anomalies."""
        anomalies = []

        if len(self.metrics_history) < 10:
            return anomalies

        recent_metrics = list(self.metrics_history)[-10:]

        # Calculate baseline
        avg_latency = sum(m.avg_latency for m in recent_metrics if m.request_count > 0) / len(recent_metrics)
        avg_error_rate = sum(m.error_rate for m in recent_metrics) / len(recent_metrics)

        current = self.current_metrics

        # Latency spike detection
        if current.avg_latency > avg_latency * 2:
            anomalies.append(f"Latency spike: {current.avg_latency:.2f}ms (baseline: {avg_latency:.2f}ms)")

        # Error rate spike detection
        if current.error_rate > avg_error_rate * 2 and current.error_rate > 5:
            anomalies.append(f"Error rate spike: {current.error_rate:.1f}% (baseline: {avg_error_rate:.1f}%)")

        # Memory usage check
        if PSUTIL_AVAILABLE and current.memory_usage_mb > 0:
            if current.memory_usage_mb > 1000:  # > 1GB
                anomalies.append(f"High memory usage: {current.memory_usage_mb:.1f}MB")

        return anomalies

    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report."""
        current = self.current_metrics
        percentiles = self.get_percentiles()
        anomalies = self.detect_anomalies()

        return {
            "timestamp": datetime.now().isoformat(),
            "current_metrics": {
                "requests": current.request_count,
                "avg_latency_ms": current.avg_latency,
                "min_latency_ms": current.min_latency if current.min_latency != float('inf') else 0,
                "max_latency_ms": current.max_latency,
                "error_rate_percent": current.error_rate,
                "cache_hit_rate_percent": current.cache_hit_rate,
                "tokens_generated": current.tokens_generated,
                "memory_usage_mb": current.memory_usage_mb,
                "cpu_usage_percent": current.cpu_usage_percent
            },
            "percentiles": percentiles,
            "anomalies": anomalies,
            "health_score": self._calculate_health_score(current)
        }

    def _calculate_health_score(self, metrics: PerformanceMetrics) -> float:
        """Calculate overall health score (0-100)."""
        score = 100.0

        # Penalize high error rates
        if metrics.error_rate > 0:
            score -= min(metrics.error_rate * 2, 30)

        # Penalize high latency (assuming target < 100ms)
        if metrics.avg_latency > 100:
            penalty = min((metrics.avg_latency - 100) / 10, 20)
            score -= penalty

        # Penalize low cache hit rate
        if metrics.cache_hit_rate < 50:
            score -= (50 - metrics.cache_hit_rate) / 2

        # Penalize high resource usage
        if PSUTIL_AVAILABLE:
            if metrics.cpu_usage_percent > 80:
                score -= (metrics.cpu_usage_percent - 80) / 2
            if metrics.memory_usage_mb > 500:  # > 500MB
                score -= min((metrics.memory_usage_mb - 500) / 100, 10)

        return max(0.0, score)


def create_default_alert_rules() -> List[AlertRule]:
    """Create default alert rules."""
    return [
        AlertRule(
            name="high_error_rate",
            metric="error_rate",
            threshold=5.0,
            operator="gt",
            severity="high",
            description="Error rate exceeded 5%"
        ),
        AlertRule(
            name="high_latency",
            metric="avg_latency",
            threshold=1000.0,  # 1 second
            operator="gt",
            severity="medium",
            description="Average latency exceeded 1 second"
        ),
        AlertRule(
            name="low_cache_hit_rate",
            metric="cache_hit_rate",
            threshold=20.0,
            operator="lt",
            severity="low",
            description="Cache hit rate below 20%"
        ),
        AlertRule(
            name="high_memory_usage",
            metric="memory_usage_mb",
            threshold=1000.0,  # 1GB
            operator="gt",
            severity="medium",
            description="Memory usage exceeded 1GB"
        ),
        AlertRule(
            name="critical_error_rate",
            metric="error_rate",
            threshold=20.0,
            operator="gt",
            severity="critical",
            description="Critical error rate exceeded 20%"
        )
    ]


def log_alert_handler(alert: Alert):
    """Simple log-based alert handler."""
    level = {
        'low': logging.INFO,
        'medium': logging.WARNING,
        'high': logging.ERROR,
        'critical': logging.CRITICAL
    }.get(alert.severity, logging.WARNING)

    logger.log(level, f"ALERT [{alert.severity.upper()}]: {alert.message}")


class MonitoringService:
    """Comprehensive monitoring service."""

    def __init__(self):
        self.prometheus = PrometheusMetrics()
        self.alert_manager = AlertManager()
        self.performance_analyzer = PerformanceAnalyzer()

        # Setup default alert rules
        for rule in create_default_alert_rules():
            self.alert_manager.add_rule(rule)

        # Add default alert handler
        self.alert_manager.add_handler(log_alert_handler)

        # Background monitoring task
        self._monitoring_task: Optional[asyncio.Task] = None
        self._running = False

    async def start(self):
        """Start the monitoring service."""
        if self._running:
            return

        self._running = True
        self._monitoring_task = asyncio.create_task(self._monitoring_loop())
        logger.info("Monitoring service started")

    async def stop(self):
        """Stop the monitoring service."""
        self._running = False
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass
        logger.info("Monitoring service stopped")

    async def _monitoring_loop(self):
        """Background monitoring loop."""
        while self._running:
            try:
                # Update system metrics
                self.prometheus.update_system_metrics()

                # Check for alerts
                current_metrics = self.performance_analyzer.get_current_metrics()
                self.alert_manager.check_metric("error_rate", current_metrics.error_rate)
                self.alert_manager.check_metric("avg_latency", current_metrics.avg_latency)
                self.alert_manager.check_metric("cache_hit_rate", current_metrics.cache_hit_rate)
                self.alert_manager.check_metric("memory_usage_mb", current_metrics.memory_usage_mb)

                await asyncio.sleep(30)  # Check every 30 seconds

            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                await asyncio.sleep(5)

    def record_request(
        self,
        method: str,
        status: str,
        duration: float,
        success: bool,
        cache_hit: bool,
        tokens: int = 0,
        error_type: Optional[str] = None
    ):
        """Record a request across all monitoring systems."""
        # Prometheus metrics
        self.prometheus.record_request(method, status, duration)
        if tokens > 0:
            self.prometheus.record_tokens(tokens)
        if cache_hit:
            self.prometheus.record_cache_hit()
        else:
            self.prometheus.record_cache_miss()
        if error_type:
            self.prometheus.record_error(error_type)

        # Performance analysis
        self.performance_analyzer.record_request(
            duration * 1000,  # Convert to ms
            success,
            cache_hit,
            tokens,
            error_type
        )

    def get_metrics_export(self) -> str:
        """Get Prometheus metrics export."""
        return self.prometheus.generate_metrics()

    def get_performance_report(self) -> Dict[str, Any]:
        """Get comprehensive performance report."""
        return self.performance_analyzer.generate_report()

    def get_alert_summary(self) -> Dict[str, Any]:
        """Get alert summary."""
        return self.alert_manager.get_alert_summary()

    def get_health_status(self) -> Dict[str, Any]:
        """Get overall health status."""
        report = self.get_performance_report()
        alerts = self.get_alert_summary()

        return {
            "health_score": report["health_score"],
            "status": "healthy" if report["health_score"] > 80 else "degraded" if report["health_score"] > 50 else "unhealthy",
            "active_alerts": alerts["total_active"],
            "critical_alerts": alerts["by_severity"].get("critical", 0),
            "timestamp": datetime.now().isoformat()
        }


def create_monitoring_service() -> MonitoringService:
    """Factory function to create monitoring service."""
    return MonitoringService()
