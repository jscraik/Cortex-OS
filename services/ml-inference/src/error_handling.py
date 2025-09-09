"""
Advanced error handling and recovery mechanisms for ML inference service.

Provides circuit breakers, retry logic, graceful degradation, and health monitoring.
"""

import asyncio
import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from functools import wraps
from typing import Any

from pydantic import BaseModel
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

logger = logging.getLogger(__name__)


class CircuitBreakerState(Enum):
    """Circuit breaker states."""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


class ErrorSeverity(Enum):
    """Error severity levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RecoveryStrategy(Enum):
    """Recovery strategies for different error types."""

    RETRY = "retry"
    FALLBACK = "fallback"
    DEGRADE = "degrade"
    FAIL_FAST = "fail_fast"


@dataclass
class ErrorMetrics:
    """Metrics for error tracking and analysis."""

    total_errors: int = 0
    error_rate: float = 0.0
    last_error_time: datetime | None = None
    error_types: dict[str, int] = field(default_factory=dict)
    recovery_attempts: int = 0
    successful_recoveries: int = 0


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""

    failure_threshold: int = 5
    recovery_timeout: int = 60  # seconds
    expected_exception: type = Exception
    half_open_max_calls: int = 3


class CircuitBreaker:
    """Circuit breaker pattern implementation for fault tolerance."""

    def __init__(self, config: CircuitBreakerConfig):
        self.config = config
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.last_failure_time: datetime | None = None
        self.half_open_calls = 0

    def __call__(self, func: Callable) -> Callable:
        """Decorator to apply circuit breaker to a function."""

        @wraps(func)
        async def wrapper(*args, **kwargs):
            if self.state == CircuitBreakerState.OPEN:
                if self._should_attempt_reset():
                    self.state = CircuitBreakerState.HALF_OPEN
                    self.half_open_calls = 0
                    logger.info("Circuit breaker transitioning to HALF_OPEN")
                else:
                    raise CircuitBreakerOpenError("Circuit breaker is OPEN")

            try:
                result = await func(*args, **kwargs)
                self._on_success()
                return result

            except self.config.expected_exception as e:
                self._on_failure()
                raise e

        return wrapper

    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset."""
        if not self.last_failure_time:
            return True
        return (
            datetime.now() - self.last_failure_time
        ).total_seconds() > self.config.recovery_timeout

    def _on_success(self):
        """Handle successful call."""
        if self.state == CircuitBreakerState.HALF_OPEN:
            self.half_open_calls += 1
            if self.half_open_calls >= self.config.half_open_max_calls:
                self.state = CircuitBreakerState.CLOSED
                self.failure_count = 0
                logger.info("Circuit breaker reset to CLOSED")
        elif self.state == CircuitBreakerState.CLOSED:
            self.failure_count = 0

    def _on_failure(self):
        """Handle failed call."""
        self.failure_count += 1
        self.last_failure_time = datetime.now()

        if self.failure_count >= self.config.failure_threshold:
            self.state = CircuitBreakerState.OPEN
            logger.warning(
                f"Circuit breaker opened after {self.failure_count} failures"
            )


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open."""

    pass


class GracefulDegradationError(Exception):
    """Raised when graceful degradation is activated."""

    pass


class ErrorHandler:
    """Centralized error handling and recovery management."""

    def __init__(self):
        self.metrics = ErrorMetrics()
        self.recovery_strategies: dict[type, RecoveryStrategy] = {
            ConnectionError: RecoveryStrategy.RETRY,
            TimeoutError: RecoveryStrategy.RETRY,
            MemoryError: RecoveryStrategy.DEGRADE,
            CircuitBreakerOpenError: RecoveryStrategy.FALLBACK,
            ValueError: RecoveryStrategy.FAIL_FAST,
        }
        self.fallback_responses: dict[str, Any] = {}

    def register_fallback(self, operation: str, response: Any):
        """Register a fallback response for an operation."""
        self.fallback_responses[operation] = response
        logger.info(f"Registered fallback for operation: {operation}")

    def get_error_severity(self, error: Exception) -> ErrorSeverity:
        """Determine error severity level."""
        if isinstance(error, (MemoryError, SystemExit, KeyboardInterrupt)):
            return ErrorSeverity.CRITICAL
        elif isinstance(
            error, (ConnectionError, TimeoutError, CircuitBreakerOpenError)
        ):
            return ErrorSeverity.HIGH
        elif isinstance(error, (ValueError, TypeError)):
            return ErrorSeverity.MEDIUM
        else:
            return ErrorSeverity.LOW

    def record_error(self, error: Exception, operation: str = "unknown"):
        """Record error metrics."""
        self.metrics.total_errors += 1
        self.metrics.last_error_time = datetime.now()

        error_type = type(error).__name__
        self.metrics.error_types[error_type] = (
            self.metrics.error_types.get(error_type, 0) + 1
        )

        severity = self.get_error_severity(error)
        logger.error(f"Error in {operation}: {error} (severity: {severity.value})")

    async def handle_error(self, error: Exception, operation: str = "unknown") -> Any:
        """Handle error with appropriate recovery strategy."""
        self.record_error(error, operation)

        strategy = self.recovery_strategies.get(type(error), RecoveryStrategy.FAIL_FAST)

        if strategy == RecoveryStrategy.FALLBACK:
            return self._handle_fallback(operation)
        elif strategy == RecoveryStrategy.DEGRADE:
            return self._handle_degradation(operation)
        else:
            raise error

    def _handle_fallback(self, operation: str) -> Any:
        """Provide fallback response."""
        if operation in self.fallback_responses:
            logger.info(f"Using fallback response for {operation}")
            return self.fallback_responses[operation]
        else:
            raise GracefulDegradationError(f"No fallback available for {operation}")

    def _handle_degradation(self, operation: str) -> Any:
        """Handle graceful degradation."""
        logger.warning(f"Activating graceful degradation for {operation}")
        # Return minimal response that keeps service functional
        return {
            "content": "Service temporarily unavailable. Please try again later.",
            "degraded": True,
            "timestamp": datetime.now().isoformat(),
        }


class HealthMonitor:
    """Health monitoring and alerting system."""

    def __init__(self):
        self.health_checks: dict[str, Callable] = {}
        self.health_status: dict[str, bool] = {}
        self.last_check_time: dict[str, datetime] = {}
        self.check_interval = 30  # seconds

    def register_health_check(self, name: str, check_func: Callable):
        """Register a health check function."""
        self.health_checks[name] = check_func
        self.health_status[name] = True
        logger.info(f"Registered health check: {name}")

    async def run_health_checks(self) -> dict[str, bool]:
        """Run all registered health checks."""
        results = {}

        for name, check_func in self.health_checks.items():
            try:
                result = (
                    await check_func()
                    if asyncio.iscoroutinefunction(check_func)
                    else check_func()
                )
                results[name] = bool(result)
                self.health_status[name] = results[name]
                self.last_check_time[name] = datetime.now()

            except Exception as e:
                logger.error(f"Health check {name} failed: {e}")
                results[name] = False
                self.health_status[name] = False

        return results

    def get_overall_health(self) -> bool:
        """Get overall system health status."""
        return all(self.health_status.values()) if self.health_status else False

    def get_health_report(self) -> dict[str, Any]:
        """Get detailed health report."""
        return {
            "overall_health": self.get_overall_health(),
            "checks": {
                name: {
                    "status": status,
                    "last_check": self.last_check_time.get(name),
                }
                for name, status in self.health_status.items()
            },
            "timestamp": datetime.now().isoformat(),
        }


# Retry decorators with exponential backoff
def retry_with_backoff(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exceptions: tuple = (Exception,),
):
    """Retry decorator with exponential backoff."""
    return retry(
        stop=stop_after_attempt(max_attempts),
        wait=wait_exponential(multiplier=base_delay, max=max_delay),
        retry=retry_if_exception_type(exceptions),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )


class ErrorResponse(BaseModel):
    """Structured error response model."""

    error_type: str
    message: str
    severity: str
    timestamp: str
    operation: str
    recovery_suggestion: str | None = None
    support_id: str | None = None


def create_error_handler() -> ErrorHandler:
    """Factory function to create error handler with default configuration."""
    handler = ErrorHandler()

    # Register default fallback responses
    handler.register_fallback(
        "inference",
        {
            "content": "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.",
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            "fallback": True,
        },
    )

    handler.register_fallback(
        "embedding",
        {
            "embeddings": [[0.0] * 768],  # Zero embedding as fallback
            "fallback": True,
        },
    )

    return handler


def create_circuit_breaker(
    failure_threshold: int = 5,
    recovery_timeout: int = 60,
    expected_exception: type = Exception,
) -> CircuitBreaker:
    """Factory function to create circuit breaker with custom configuration."""
    config = CircuitBreakerConfig(
        failure_threshold=failure_threshold,
        recovery_timeout=recovery_timeout,
        expected_exception=expected_exception,
    )
    return CircuitBreaker(config)


def create_health_monitor() -> HealthMonitor:
    """Factory function to create health monitor with default checks."""
    monitor = HealthMonitor()

    # Register basic health checks
    monitor.register_health_check("memory", lambda: True)  # Basic check
    monitor.register_health_check("disk_space", lambda: True)  # Basic check

    return monitor
