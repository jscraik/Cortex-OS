"""Advanced monitoring and alerting system for MCP."""

import asyncio
import smtplib
import statistics
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from email.mime.multipart import MimeMultipart
from email.mime.text import MimeText
from enum import Enum
from typing import Any

from .metrics import get_metrics_collector
from .structured_logging import get_logger

logger = get_logger(__name__)
metrics = get_metrics_collector()


class AlertSeverity(Enum):
    """Alert severity levels."""

    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertStatus(Enum):
    """Alert status."""

    ACTIVE = "active"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"
    ACKNOWLEDGED = "acknowledged"


class MonitoringMetric(Enum):
    """Metrics being monitored."""

    CPU_USAGE = "cpu_usage"
    MEMORY_USAGE = "memory_usage"
    DISK_USAGE = "disk_usage"
    DATABASE_RESPONSE_TIME = "database_response_time"
    CACHE_HIT_RATE = "cache_hit_rate"
    ERROR_RATE = "error_rate"
    REQUEST_RATE = "request_rate"
    QUEUE_SIZE = "queue_size"
    CONNECTION_COUNT = "connection_count"


@dataclass
class AlertRule:
    """Configuration for monitoring alerts."""

    name: str
    metric: MonitoringMetric
    condition: str  # "greater_than", "less_than", "equals"
    threshold: float
    duration_minutes: int = 5  # How long condition must be true
    severity: AlertSeverity = AlertSeverity.WARNING

    # Alert settings
    enabled: bool = True
    suppress_duration_minutes: int = 60  # Suppress duplicate alerts
    auto_resolve: bool = True

    # Notification settings
    notify_email: bool = True
    notify_webhook: bool = False
    notify_slack: bool = False

    # Custom settings
    description: str = ""
    runbook_url: str | None = None
    tags: list[str] = field(default_factory=list)


@dataclass
class Alert:
    """Active alert instance."""

    alert_id: str
    rule_name: str
    metric: MonitoringMetric
    severity: AlertSeverity
    status: AlertStatus

    # Alert details
    current_value: float
    threshold: float
    condition: str
    message: str

    # Timing
    first_triggered: datetime
    last_triggered: datetime
    resolved_at: datetime | None = None
    acknowledged_at: datetime | None = None

    # Context
    tags: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "alert_id": self.alert_id,
            "rule_name": self.rule_name,
            "metric": self.metric.value,
            "severity": self.severity.value,
            "status": self.status.value,
            "current_value": self.current_value,
            "threshold": self.threshold,
            "condition": self.condition,
            "message": self.message,
            "first_triggered": self.first_triggered.isoformat(),
            "last_triggered": self.last_triggered.isoformat(),
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "acknowledged_at": self.acknowledged_at.isoformat()
            if self.acknowledged_at
            else None,
            "tags": self.tags,
            "metadata": self.metadata,
        }


@dataclass
class MonitoringConfig:
    """Configuration for monitoring system."""

    # Monitoring intervals
    collection_interval_seconds: int = 30
    evaluation_interval_seconds: int = 60
    cleanup_interval_hours: int = 24

    # Data retention
    metrics_retention_hours: int = 168  # 7 days
    alerts_retention_days: int = 30

    # Email notifications
    smtp_enabled: bool = False
    smtp_host: str = "localhost"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@mcp-server.com"
    alert_emails: list[str] = field(default_factory=list)

    # Webhook notifications
    webhook_enabled: bool = False
    webhook_url: str = ""
    webhook_timeout_seconds: int = 10

    # Slack notifications
    slack_enabled: bool = False
    slack_webhook_url: str = ""
    slack_channel: str = "#alerts"

    @classmethod
    def from_env(cls) -> "MonitoringConfig":
        """Load configuration from environment."""
        import os

        return cls(
            collection_interval_seconds=int(
                os.getenv("MONITORING_COLLECTION_INTERVAL", "30")
            ),
            evaluation_interval_seconds=int(
                os.getenv("MONITORING_EVAL_INTERVAL", "60")
            ),
            metrics_retention_hours=int(os.getenv("MONITORING_RETENTION_HOURS", "168")),
            alerts_retention_days=int(os.getenv("ALERTS_RETENTION_DAYS", "30")),
            smtp_enabled=os.getenv("SMTP_ENABLED", "false").lower() == "true",
            smtp_host=os.getenv("SMTP_HOST", "localhost"),
            smtp_port=int(os.getenv("SMTP_PORT", "587")),
            smtp_username=os.getenv("SMTP_USERNAME", ""),
            smtp_password=os.getenv("SMTP_PASSWORD", ""),
            smtp_from=os.getenv("SMTP_FROM", "noreply@mcp-server.com"),
            alert_emails=os.getenv("ALERT_EMAILS", "").split(",")
            if os.getenv("ALERT_EMAILS")
            else [],
            webhook_enabled=os.getenv("WEBHOOK_ENABLED", "false").lower() == "true",
            webhook_url=os.getenv("WEBHOOK_URL", ""),
            slack_enabled=os.getenv("SLACK_ENABLED", "false").lower() == "true",
            slack_webhook_url=os.getenv("SLACK_WEBHOOK_URL", ""),
            slack_channel=os.getenv("SLACK_CHANNEL", "#alerts"),
        )


class MetricsCollector:
    """Collects and stores metrics for monitoring."""

    def __init__(self):
        self.metrics_data: dict[str, list[dict[str, Any]]] = {}
        self.lock = asyncio.Lock()

    async def collect_metric(
        self,
        metric: MonitoringMetric,
        value: float,
        timestamp: datetime | None = None,
        tags: dict[str, str] | None = None,
    ):
        """Collect a metric data point."""
        if timestamp is None:
            timestamp = datetime.now()

        async with self.lock:
            if metric.value not in self.metrics_data:
                self.metrics_data[metric.value] = []

            data_point = {
                "timestamp": timestamp.isoformat(),
                "value": value,
                "tags": tags or {},
            }

            self.metrics_data[metric.value].append(data_point)

            # Keep only recent data
            cutoff_time = datetime.now() - timedelta(hours=168)  # 7 days
            self.metrics_data[metric.value] = [
                dp
                for dp in self.metrics_data[metric.value]
                if datetime.fromisoformat(dp["timestamp"]) > cutoff_time
            ]

    async def get_metric_values(
        self, metric: MonitoringMetric, duration_minutes: int = 60
    ) -> list[float]:
        """Get recent values for a metric."""
        async with self.lock:
            if metric.value not in self.metrics_data:
                return []

            cutoff_time = datetime.now() - timedelta(minutes=duration_minutes)

            values = []
            for data_point in self.metrics_data[metric.value]:
                if datetime.fromisoformat(data_point["timestamp"]) > cutoff_time:
                    values.append(data_point["value"])

            return values

    async def get_metric_statistics(
        self, metric: MonitoringMetric, duration_minutes: int = 60
    ) -> dict[str, float]:
        """Get statistics for a metric."""
        values = await self.get_metric_values(metric, duration_minutes)

        if not values:
            return {}

        return {
            "count": len(values),
            "min": min(values),
            "max": max(values),
            "mean": statistics.mean(values),
            "median": statistics.median(values),
            "std_dev": statistics.stdev(values) if len(values) > 1 else 0.0,
        }


class AlertManager:
    """Manages alerts and notifications."""

    def __init__(self, config: MonitoringConfig):
        self.config = config
        self.active_alerts: dict[str, Alert] = {}
        self.alert_rules: dict[str, AlertRule] = {}
        self.suppressed_alerts: dict[str, datetime] = {}
        self.lock = asyncio.Lock()

        # Setup default alert rules
        self._setup_default_rules()

    def _setup_default_rules(self):
        """Setup default monitoring rules."""
        default_rules = [
            AlertRule(
                name="high_cpu_usage",
                metric=MonitoringMetric.CPU_USAGE,
                condition="greater_than",
                threshold=80.0,
                duration_minutes=5,
                severity=AlertSeverity.WARNING,
                description="CPU usage is consistently high",
            ),
            AlertRule(
                name="critical_cpu_usage",
                metric=MonitoringMetric.CPU_USAGE,
                condition="greater_than",
                threshold=95.0,
                duration_minutes=2,
                severity=AlertSeverity.CRITICAL,
                description="CPU usage is critically high",
            ),
            AlertRule(
                name="high_memory_usage",
                metric=MonitoringMetric.MEMORY_USAGE,
                condition="greater_than",
                threshold=85.0,
                duration_minutes=5,
                severity=AlertSeverity.WARNING,
                description="Memory usage is consistently high",
            ),
            AlertRule(
                name="high_error_rate",
                metric=MonitoringMetric.ERROR_RATE,
                condition="greater_than",
                threshold=5.0,
                duration_minutes=3,
                severity=AlertSeverity.ERROR,
                description="Error rate is above acceptable threshold",
            ),
            AlertRule(
                name="low_cache_hit_rate",
                metric=MonitoringMetric.CACHE_HIT_RATE,
                condition="less_than",
                threshold=70.0,
                duration_minutes=10,
                severity=AlertSeverity.WARNING,
                description="Cache hit rate is lower than expected",
            ),
            AlertRule(
                name="slow_database_response",
                metric=MonitoringMetric.DATABASE_RESPONSE_TIME,
                condition="greater_than",
                threshold=1000.0,  # 1 second in ms
                duration_minutes=5,
                severity=AlertSeverity.WARNING,
                description="Database response time is slow",
            ),
        ]

        for rule in default_rules:
            self.alert_rules[rule.name] = rule

    def add_alert_rule(self, rule: AlertRule):
        """Add a custom alert rule."""
        self.alert_rules[rule.name] = rule
        logger.info(f"Added alert rule: {rule.name}")

    def remove_alert_rule(self, rule_name: str):
        """Remove an alert rule."""
        if rule_name in self.alert_rules:
            del self.alert_rules[rule_name]
            logger.info(f"Removed alert rule: {rule_name}")

    async def evaluate_rules(self, metrics_collector: MetricsCollector):
        """Evaluate all alert rules against current metrics."""
        for rule_name, rule in self.alert_rules.items():
            if not rule.enabled:
                continue

            try:
                await self._evaluate_rule(rule, metrics_collector)
            except Exception as e:
                logger.error(f"Failed to evaluate rule {rule_name}: {e}")

    async def _evaluate_rule(
        self, rule: AlertRule, metrics_collector: MetricsCollector
    ):
        """Evaluate a single alert rule."""
        # Get recent metric values
        values = await metrics_collector.get_metric_values(
            rule.metric, rule.duration_minutes
        )

        if not values:
            return

        # Calculate current value (using latest or average based on metric type)
        if rule.metric in [MonitoringMetric.CPU_USAGE, MonitoringMetric.MEMORY_USAGE]:
            current_value = statistics.mean(values)  # Average for usage metrics
        else:
            current_value = values[-1]  # Latest for other metrics

        # Check condition
        condition_met = False
        if rule.condition == "greater_than":
            condition_met = current_value > rule.threshold
        elif rule.condition == "less_than":
            condition_met = current_value < rule.threshold
        elif rule.condition == "equals":
            condition_met = abs(current_value - rule.threshold) < 0.001

        alert_id = f"{rule.name}_{rule.metric.value}"

        if condition_met:
            # Trigger alert
            if alert_id not in self.active_alerts:
                await self._trigger_alert(rule, current_value)
            else:
                # Update existing alert
                alert = self.active_alerts[alert_id]
                alert.last_triggered = datetime.now()
                alert.current_value = current_value
        else:
            # Resolve alert if it exists
            if alert_id in self.active_alerts and rule.auto_resolve:
                await self._resolve_alert(alert_id)

    async def _trigger_alert(self, rule: AlertRule, current_value: float):
        """Trigger a new alert."""
        alert_id = f"{rule.name}_{rule.metric.value}"

        # Check if alert is suppressed
        if alert_id in self.suppressed_alerts:
            suppress_until = self.suppressed_alerts[alert_id]
            if datetime.now() < suppress_until:
                return

        # Create alert
        alert = Alert(
            alert_id=alert_id,
            rule_name=rule.name,
            metric=rule.metric,
            severity=rule.severity,
            status=AlertStatus.ACTIVE,
            current_value=current_value,
            threshold=rule.threshold,
            condition=rule.condition,
            message=f"{rule.description}: {current_value:.2f} {rule.condition} {rule.threshold}",
            first_triggered=datetime.now(),
            last_triggered=datetime.now(),
            tags=rule.tags,
        )

        async with self.lock:
            self.active_alerts[alert_id] = alert

        # Send notifications
        await self._send_notifications(alert, "triggered")

        # Suppress future alerts for this rule
        self.suppressed_alerts[alert_id] = datetime.now() + timedelta(
            minutes=rule.suppress_duration_minutes
        )

        logger.warning(
            f"Alert triggered: {rule.name}",
            alert_id=alert_id,
            severity=rule.severity.value,
            current_value=current_value,
            threshold=rule.threshold,
        )

        metrics.record_error("alert_triggered", "monitoring")

    async def _resolve_alert(self, alert_id: str):
        """Resolve an active alert."""
        async with self.lock:
            if alert_id not in self.active_alerts:
                return

            alert = self.active_alerts[alert_id]
            alert.status = AlertStatus.RESOLVED
            alert.resolved_at = datetime.now()

        # Send resolution notification
        await self._send_notifications(alert, "resolved")

        logger.info(f"Alert resolved: {alert.rule_name}", alert_id=alert_id)

        # Remove from active alerts
        async with self.lock:
            del self.active_alerts[alert_id]

    async def acknowledge_alert(self, alert_id: str) -> bool:
        """Acknowledge an alert."""
        async with self.lock:
            if alert_id not in self.active_alerts:
                return False

            alert = self.active_alerts[alert_id]
            alert.status = AlertStatus.ACKNOWLEDGED
            alert.acknowledged_at = datetime.now()

        logger.info(f"Alert acknowledged: {alert.rule_name}", alert_id=alert_id)
        return True

    async def _send_notifications(self, alert: Alert, action: str):
        """Send alert notifications."""
        try:
            # Email notifications
            if self.config.smtp_enabled and self.config.alert_emails:
                await self._send_email_notification(alert, action)

            # Webhook notifications
            if self.config.webhook_enabled and self.config.webhook_url:
                await self._send_webhook_notification(alert, action)

            # Slack notifications
            if self.config.slack_enabled and self.config.slack_webhook_url:
                await self._send_slack_notification(alert, action)

        except Exception as e:
            logger.error(f"Failed to send notifications: {e}")

    async def _send_email_notification(self, alert: Alert, action: str):
        """Send email notification."""
        try:
            subject = f"[{alert.severity.value.upper()}] MCP Alert {action.title()}: {alert.rule_name}"

            body = f"""
            Alert {action}: {alert.rule_name}

            Severity: {alert.severity.value}
            Metric: {alert.metric.value}
            Current Value: {alert.current_value:.2f}
            Threshold: {alert.threshold}
            Condition: {alert.condition}

            Message: {alert.message}

            First Triggered: {alert.first_triggered}
            Last Triggered: {alert.last_triggered}
            """

            msg = MimeMultipart()
            msg["From"] = self.config.smtp_from
            msg["To"] = ", ".join(self.config.alert_emails)
            msg["Subject"] = subject

            msg.attach(MimeText(body, "plain"))

            with smtplib.SMTP(self.config.smtp_host, self.config.smtp_port) as server:
                if self.config.smtp_username:
                    server.starttls()
                    server.login(self.config.smtp_username, self.config.smtp_password)

                text = msg.as_string()
                server.sendmail(self.config.smtp_from, self.config.alert_emails, text)

            logger.info(f"Email notification sent for alert: {alert.alert_id}")

        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")

    async def _send_webhook_notification(self, alert: Alert, action: str):
        """Send webhook notification."""
        try:
            import httpx

            payload = {
                "action": action,
                "alert": alert.to_dict(),
                "timestamp": datetime.now().isoformat(),
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.config.webhook_url,
                    json=payload,
                    timeout=self.config.webhook_timeout_seconds,
                )
                response.raise_for_status()

            logger.info(f"Webhook notification sent for alert: {alert.alert_id}")

        except Exception as e:
            logger.error(f"Failed to send webhook notification: {e}")

    async def _send_slack_notification(self, alert: Alert, action: str):
        """Send Slack notification."""
        try:
            import httpx

            color = {
                AlertSeverity.INFO: "good",
                AlertSeverity.WARNING: "warning",
                AlertSeverity.ERROR: "danger",
                AlertSeverity.CRITICAL: "danger",
            }[alert.severity]

            payload = {
                "channel": self.config.slack_channel,
                "attachments": [
                    {
                        "color": color,
                        "title": f"Alert {action.title()}: {alert.rule_name}",
                        "text": alert.message,
                        "fields": [
                            {
                                "title": "Severity",
                                "value": alert.severity.value,
                                "short": True,
                            },
                            {
                                "title": "Current Value",
                                "value": f"{alert.current_value:.2f}",
                                "short": True,
                            },
                            {
                                "title": "Threshold",
                                "value": f"{alert.threshold}",
                                "short": True,
                            },
                            {
                                "title": "Time",
                                "value": alert.last_triggered.strftime(
                                    "%Y-%m-%d %H:%M:%S"
                                ),
                                "short": True,
                            },
                        ],
                    }
                ],
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.config.slack_webhook_url,
                    json=payload,
                    timeout=self.config.webhook_timeout_seconds,
                )
                response.raise_for_status()

            logger.info(f"Slack notification sent for alert: {alert.alert_id}")

        except Exception as e:
            logger.error(f"Failed to send Slack notification: {e}")

    def get_active_alerts(self) -> list[Alert]:
        """Get all active alerts."""
        return list(self.active_alerts.values())

    def get_alert_summary(self) -> dict[str, Any]:
        """Get alert summary statistics."""
        alerts = list(self.active_alerts.values())

        return {
            "total_active": len(alerts),
            "by_severity": {
                "critical": len(
                    [a for a in alerts if a.severity == AlertSeverity.CRITICAL]
                ),
                "error": len([a for a in alerts if a.severity == AlertSeverity.ERROR]),
                "warning": len(
                    [a for a in alerts if a.severity == AlertSeverity.WARNING]
                ),
                "info": len([a for a in alerts if a.severity == AlertSeverity.INFO]),
            },
            "total_rules": len(self.alert_rules),
            "enabled_rules": len([r for r in self.alert_rules.values() if r.enabled]),
        }


class AdvancedMonitoringSystem:
    """Complete monitoring system with metrics collection and alerting."""

    def __init__(self, config: MonitoringConfig | None = None):
        self.config = config or MonitoringConfig.from_env()
        self.metrics_collector = MetricsCollector()
        self.alert_manager = AlertManager(self.config)

        # Background tasks
        self._collection_task: asyncio.Task | None = None
        self._evaluation_task: asyncio.Task | None = None
        self._cleanup_task: asyncio.Task | None = None

        logger.info("Advanced monitoring system initialized")

    async def start(self):
        """Start monitoring background tasks."""
        self._collection_task = asyncio.create_task(self._collection_loop())
        self._evaluation_task = asyncio.create_task(self._evaluation_loop())
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())

        logger.info("Monitoring system started")

    async def stop(self):
        """Stop monitoring background tasks."""
        tasks = [self._collection_task, self._evaluation_task, self._cleanup_task]

        for task in tasks:
            if task and not task.done():
                task.cancel()
                from contextlib import suppress
                with suppress(asyncio.CancelledError):
                    await task

        logger.info("Monitoring system stopped")

    async def _collection_loop(self):
        """Background metrics collection loop."""
        while True:
            try:
                await self._collect_system_metrics()
                await asyncio.sleep(self.config.collection_interval_seconds)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Metrics collection failed: {e}")
                await asyncio.sleep(30)

    async def _evaluation_loop(self):
        """Background alert evaluation loop."""
        while True:
            try:
                await self.alert_manager.evaluate_rules(self.metrics_collector)
                await asyncio.sleep(self.config.evaluation_interval_seconds)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Alert evaluation failed: {e}")
                await asyncio.sleep(60)

    async def _cleanup_loop(self):
        """Background cleanup loop."""
        while True:
            try:
                await self._cleanup_old_data()
                await asyncio.sleep(self.config.cleanup_interval_hours * 3600)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Cleanup failed: {e}")
                await asyncio.sleep(3600)

    async def _collect_system_metrics(self):
        """Collect system metrics."""
        try:
            import psutil

            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=0.1)
            await self.metrics_collector.collect_metric(
                MonitoringMetric.CPU_USAGE, cpu_percent
            )

            # Memory usage
            memory = psutil.virtual_memory()
            await self.metrics_collector.collect_metric(
                MonitoringMetric.MEMORY_USAGE, memory.percent
            )

            # Disk usage
            disk = psutil.disk_usage("/")
            await self.metrics_collector.collect_metric(
                MonitoringMetric.DISK_USAGE, disk.percent
            )

            # Application-specific metrics
            await self._collect_app_metrics()

        except Exception as e:
            logger.error(f"System metrics collection failed: {e}")

    async def _collect_app_metrics(self):
        """Collect application-specific metrics."""
        try:
            # Database response time
            from ..infrastructure.database import get_database_manager

            db_manager = await get_database_manager()

            start_time = time.time()
            health_status = await db_manager.get_health_status()
            db_response_time = (time.time() - start_time) * 1000  # ms

            await self.metrics_collector.collect_metric(
                MonitoringMetric.DATABASE_RESPONSE_TIME, db_response_time
            )

            # Cache metrics
            from ..core.caching import get_cache

            cache = get_cache()
            stats = await cache.get_stats()

            await self.metrics_collector.collect_metric(
                MonitoringMetric.CACHE_HIT_RATE, stats.get("hit_rate", 0)
            )

            # Get other metrics from global metrics collector
            global_metrics = get_metrics_collector()
            prometheus_data = global_metrics.get_prometheus_metrics()

            # Parse error rate from prometheus data (simplified)
            error_rate = 0  # Would parse from actual prometheus data
            await self.metrics_collector.collect_metric(
                MonitoringMetric.ERROR_RATE, error_rate
            )

        except Exception as e:
            logger.error(f"Application metrics collection failed: {e}")

    async def _cleanup_old_data(self):
        """Clean up old metrics and alert data."""
        try:
            # Cleanup is handled by MetricsCollector automatically
            logger.info("Metrics cleanup completed")

        except Exception as e:
            logger.error(f"Data cleanup failed: {e}")

    def get_monitoring_dashboard(self) -> dict[str, Any]:
        """Get monitoring dashboard data."""
        return {
            "system_status": "active",
            "collection_interval": self.config.collection_interval_seconds,
            "evaluation_interval": self.config.evaluation_interval_seconds,
            "alerts": self.alert_manager.get_alert_summary(),
            "active_alerts": [
                alert.to_dict() for alert in self.alert_manager.get_active_alerts()
            ],
            "notifications": {
                "email_enabled": self.config.smtp_enabled,
                "webhook_enabled": self.config.webhook_enabled,
                "slack_enabled": self.config.slack_enabled,
            },
        }


# Global monitoring system
_monitoring_system: AdvancedMonitoringSystem | None = None


async def get_monitoring_system() -> AdvancedMonitoringSystem:
    """Get or create global monitoring system."""
    global _monitoring_system

    if _monitoring_system is None:
        _monitoring_system = AdvancedMonitoringSystem()
        await _monitoring_system.start()

    return _monitoring_system
