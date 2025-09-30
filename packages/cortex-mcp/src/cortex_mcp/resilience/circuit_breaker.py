"""Minimal async circuit breaker for external calls."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreakerError(Exception):
    pass


AsyncFn = Callable[..., Awaitable[Any]]


@dataclass
class _Counters:
    failures: int = 0
    last_failure: datetime | None = None


class CircuitBreaker:
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        expected_exception: type[Exception] = Exception,
        name: str = "default",
    ) -> None:
        self.failure_threshold = max(1, int(failure_threshold))
        self.recovery_timeout = float(recovery_timeout)
        self.expected_exception = expected_exception
        self.name = name
        self.state = CircuitState.CLOSED
        self._c = _Counters()

    async def call(self, fn: AsyncFn, *args: Any, **kwargs: Any) -> Any:
        if self.state == CircuitState.OPEN and not self._can_half_open():
            raise CircuitBreakerError(f"circuit '{self.name}' is open")
        if self.state == CircuitState.OPEN:
            self.state = CircuitState.HALF_OPEN

        try:
            result = await fn(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as exc:  # expected failure counts
            self._on_failure()
            raise exc

    def _can_half_open(self) -> bool:
        if not self._c.last_failure:
            return True
        edge = self._c.last_failure + timedelta(seconds=self.recovery_timeout)
        return datetime.now() >= edge

    def _on_success(self) -> None:
        self._c.failures = 0
        self.state = CircuitState.CLOSED

    def _on_failure(self) -> None:
        self._c.failures += 1
        self._c.last_failure = datetime.now()
        if self._c.failures >= self.failure_threshold:
            self.state = CircuitState.OPEN
