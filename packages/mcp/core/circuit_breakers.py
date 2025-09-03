"""Advanced circuit breaker patterns for MCP reliability."""

import asyncio
import logging
import time
from collections.abc import Callable
from dataclasses import dataclass
from enum import Enum
from typing import Any, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CircuitBreakerState(Enum):
    """Circuit breaker states."""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, requests blocked
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""

    failure_threshold: int = 5
    recovery_timeout: float = 60.0
    success_threshold: int = 3  # Successes needed to close from half-open
    request_timeout: float = 30.0
    slow_call_duration_threshold: float = 10.0
    slow_call_rate_threshold: float = 0.5
    permitted_calls_in_half_open: int = 3


@dataclass
class CircuitBreakerMetrics:
    """Metrics for circuit breaker."""

    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    slow_calls: int = 0
    last_failure_time: float | None = None
    last_success_time: float | None = None
    consecutive_successes: int = 0
    consecutive_failures: int = 0
    state_changes: int = 0

    @property
    def failure_rate(self) -> float:
        """Calculate failure rate."""
        if self.total_calls == 0:
            return 0.0
        return self.failed_calls / self.total_calls

    @property
    def success_rate(self) -> float:
        """Calculate success rate."""
        if self.total_calls == 0:
            return 0.0
        return self.successful_calls / self.total_calls

    @property
    def slow_call_rate(self) -> float:
        """Calculate slow call rate."""
        if self.total_calls == 0:
            return 0.0
        return self.slow_calls / self.total_calls


class CircuitBreakerError(Exception):
    """Circuit breaker specific error."""

    pass


class CircuitBreakerOpenError(CircuitBreakerError):
    """Raised when circuit breaker is open."""

    pass


class AdvancedCircuitBreaker:
    """Advanced circuit breaker with multiple failure detection strategies."""

    def __init__(self, name: str, config: CircuitBreakerConfig | None = None):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitBreakerState.CLOSED
        self.metrics = CircuitBreakerMetrics()
        self._lock = asyncio.Lock()
        self._state_change_time = time.time()
        self._half_open_calls = 0

        # Callbacks for state changes
        self._state_change_callbacks: dict[str, Callable] = {}

    def add_state_change_callback(
        self, callback: Callable[[CircuitBreakerState, CircuitBreakerState], None]
    ) -> None:
        """Add callback for state changes."""
        callback_id = f"callback_{len(self._state_change_callbacks)}"
        self._state_change_callbacks[callback_id] = callback

    def remove_state_change_callback(self, callback_id: str) -> None:
        """Remove state change callback."""
        self._state_change_callbacks.pop(callback_id, None)

    async def call(self, func: Callable[..., T], *args, **kwargs) -> T:
        """Execute function with circuit breaker protection."""
        if not await self._can_proceed():
            raise CircuitBreakerOpenError(f"Circuit breaker '{self.name}' is open")

        start_time = time.time()

        try:
            result = await self._execute_with_timeout(func, *args, **kwargs)
            execution_time = time.time() - start_time

            await self._record_success(execution_time)
            return result

        except Exception as e:
            execution_time = time.time() - start_time
            await self._record_failure(e, execution_time)
            raise

    async def _execute_with_timeout(self, func: Callable[..., T], *args, **kwargs) -> T:
        """Execute function with timeout."""
        try:
            if asyncio.iscoroutinefunction(func):
                return await asyncio.wait_for(
                    func(*args, **kwargs), timeout=self.config.request_timeout
                )
            else:
                # Run sync function in thread pool
                loop = asyncio.get_running_loop()
                return await asyncio.wait_for(
                    loop.run_in_executor(None, lambda: func(*args, **kwargs)),
                    timeout=self.config.request_timeout,
                )
        except TimeoutError:
            raise CircuitBreakerError(
                f"Request timed out after {self.config.request_timeout}s"
            )

    async def _can_proceed(self) -> bool:
        """Check if request can proceed based on circuit breaker state."""
        async with self._lock:
            now = time.time()

            if self.state == CircuitBreakerState.CLOSED:
                return True
            elif self.state == CircuitBreakerState.OPEN:
                # Check if recovery timeout has passed
                if now - self._state_change_time >= self.config.recovery_timeout:
                    await self._transition_to_half_open()
                    return True
                return False
            elif self.state == CircuitBreakerState.HALF_OPEN:
                # Allow limited number of calls in half-open state
                if self._half_open_calls < self.config.permitted_calls_in_half_open:
                    self._half_open_calls += 1
                    return True
                return False

        return False

    async def _record_success(self, execution_time: float) -> None:
        """Record successful call."""
        async with self._lock:
            self.metrics.total_calls += 1
            self.metrics.successful_calls += 1
            self.metrics.consecutive_successes += 1
            self.metrics.consecutive_failures = 0
            self.metrics.last_success_time = time.time()

            # Check if it was a slow call
            if execution_time > self.config.slow_call_duration_threshold:
                self.metrics.slow_calls += 1

            # State transitions
            if self.state == CircuitBreakerState.HALF_OPEN:
                if self.metrics.consecutive_successes >= self.config.success_threshold:
                    await self._transition_to_closed()
            elif self.state == CircuitBreakerState.CLOSED:
                # Check slow call rate
                if (
                    self.metrics.total_calls >= 10
                    and self.metrics.slow_call_rate
                    > self.config.slow_call_rate_threshold
                ):
                    await self._transition_to_open()

    async def _record_failure(self, error: Exception, execution_time: float) -> None:
        """Record failed call."""
        async with self._lock:
            self.metrics.total_calls += 1
            self.metrics.failed_calls += 1
            self.metrics.consecutive_failures += 1
            self.metrics.consecutive_successes = 0
            self.metrics.last_failure_time = time.time()

            # Check if it was a slow call
            if execution_time > self.config.slow_call_duration_threshold:
                self.metrics.slow_calls += 1

            # State transitions
            if self.state == CircuitBreakerState.CLOSED:
                if self.metrics.consecutive_failures >= self.config.failure_threshold:
                    await self._transition_to_open()
            elif self.state == CircuitBreakerState.HALF_OPEN:
                # Any failure in half-open state goes back to open
                await self._transition_to_open()

    async def _transition_to_open(self) -> None:
        """Transition to open state."""
        old_state = self.state
        self.state = CircuitBreakerState.OPEN
        self._state_change_time = time.time()
        self.metrics.state_changes += 1
        self._half_open_calls = 0

        logger.warning(
            f"Circuit breaker '{self.name}' opened after {self.metrics.consecutive_failures} failures"
        )
        await self._notify_state_change(old_state, self.state)

    async def _transition_to_half_open(self) -> None:
        """Transition to half-open state."""
        old_state = self.state
        self.state = CircuitBreakerState.HALF_OPEN
        self._state_change_time = time.time()
        self.metrics.state_changes += 1
        self._half_open_calls = 0

        logger.info(f"Circuit breaker '{self.name}' transitioned to half-open")
        await self._notify_state_change(old_state, self.state)

    async def _transition_to_closed(self) -> None:
        """Transition to closed state."""
        old_state = self.state
        self.state = CircuitBreakerState.CLOSED
        self._state_change_time = time.time()
        self.metrics.state_changes += 1
        self._half_open_calls = 0

        logger.info(
            f"Circuit breaker '{self.name}' closed after {self.metrics.consecutive_successes} successes"
        )
        await self._notify_state_change(old_state, self.state)

    async def _notify_state_change(
        self, old_state: CircuitBreakerState, new_state: CircuitBreakerState
    ) -> None:
        """Notify state change callbacks."""
        for callback in self._state_change_callbacks.values():
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(old_state, new_state)
                else:
                    callback(old_state, new_state)
            except Exception as e:
                logger.error(f"Error in circuit breaker state change callback: {e}")

    def get_state(self) -> CircuitBreakerState:
        """Get current state."""
        return self.state

    def get_metrics(self) -> CircuitBreakerMetrics:
        """Get current metrics."""
        return self.metrics

    def reset(self) -> None:
        """Reset circuit breaker to closed state."""
        self.state = CircuitBreakerState.CLOSED
        self.metrics = CircuitBreakerMetrics()
        self._state_change_time = time.time()
        self._half_open_calls = 0
        logger.info(f"Circuit breaker '{self.name}' reset")

    def force_open(self) -> None:
        """Force circuit breaker to open state."""
        self.state = CircuitBreakerState.OPEN
        self._state_change_time = time.time()
        self.metrics.state_changes += 1
        logger.warning(f"Circuit breaker '{self.name}' forced to open state")

    def get_status(self) -> dict[str, Any]:
        """Get detailed status information."""
        now = time.time()
        time_in_current_state = now - self._state_change_time

        return {
            "name": self.name,
            "state": self.state.value,
            "time_in_current_state": time_in_current_state,
            "metrics": {
                "total_calls": self.metrics.total_calls,
                "successful_calls": self.metrics.successful_calls,
                "failed_calls": self.metrics.failed_calls,
                "slow_calls": self.metrics.slow_calls,
                "failure_rate": self.metrics.failure_rate,
                "success_rate": self.metrics.success_rate,
                "slow_call_rate": self.metrics.slow_call_rate,
                "consecutive_successes": self.metrics.consecutive_successes,
                "consecutive_failures": self.metrics.consecutive_failures,
                "state_changes": self.metrics.state_changes,
                "last_failure_time": self.metrics.last_failure_time,
                "last_success_time": self.metrics.last_success_time,
            },
            "config": {
                "failure_threshold": self.config.failure_threshold,
                "recovery_timeout": self.config.recovery_timeout,
                "success_threshold": self.config.success_threshold,
                "request_timeout": self.config.request_timeout,
                "slow_call_duration_threshold": self.config.slow_call_duration_threshold,
                "slow_call_rate_threshold": self.config.slow_call_rate_threshold,
                "permitted_calls_in_half_open": self.config.permitted_calls_in_half_open,
            },
        }


class CircuitBreakerRegistry:
    """Registry for managing multiple circuit breakers."""

    def __init__(self):
        self._breakers: dict[str, AdvancedCircuitBreaker] = {}
        self._lock = asyncio.Lock()

    async def get_or_create_breaker(
        self, name: str, config: CircuitBreakerConfig | None = None
    ) -> AdvancedCircuitBreaker:
        """Get existing circuit breaker or create new one."""
        async with self._lock:
            if name not in self._breakers:
                self._breakers[name] = AdvancedCircuitBreaker(name, config)
            return self._breakers[name]

    async def remove_breaker(self, name: str) -> None:
        """Remove circuit breaker from registry."""
        async with self._lock:
            self._breakers.pop(name, None)

    def get_all_breakers(self) -> dict[str, AdvancedCircuitBreaker]:
        """Get all circuit breakers."""
        return self._breakers.copy()

    def get_registry_status(self) -> dict[str, Any]:
        """Get status of all circuit breakers."""
        return {name: breaker.get_status() for name, breaker in self._breakers.items()}

    async def reset_all(self) -> None:
        """Reset all circuit breakers."""
        for breaker in self._breakers.values():
            breaker.reset()


# Global registry instance
circuit_breaker_registry = CircuitBreakerRegistry()


def circuit_breaker(name: str, config: CircuitBreakerConfig | None = None):
    """Decorator for applying circuit breaker to functions."""

    def decorator(func):
        async def wrapper(*args, **kwargs):
            breaker = await circuit_breaker_registry.get_or_create_breaker(name, config)
            return await breaker.call(func, *args, **kwargs)

        return wrapper

    return decorator
