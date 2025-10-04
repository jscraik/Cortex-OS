"""
Structured Logging for Cortex-Py (Phase 6.2)

Provides JSON-formatted structured logging with context propagation.

Following CODESTYLE.md:
- snake_case naming
- Type hints on all public functions
- Guard clauses for readability
- Functions ≤40 lines
- brAInwav branding in log events
"""

import logging
import structlog
import time
from typing import Any, Dict, Optional
from contextlib import contextmanager


# Configure structlog for JSON output
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)


def get_logger(name: str = __name__):
    """
    Get structured logger instance.
    
    Args:
        name: Logger name
    
    Returns:
        Structured logger
    
    Following CODESTYLE.md: Simple accessor
    """
    return structlog.get_logger(name)


def log_planning_event(
    event: str,
    plan_id: str = "",
    strategy: str = "",
    step_count: int = 0,
    duration_ms: float = 0,
    **kwargs,
):
    """
    Log planning event with metadata.
    
    Args:
        event: Event name
        plan_id: Plan identifier
        strategy: Planning strategy
        step_count: Number of steps
        duration_ms: Operation duration
        **kwargs: Additional context
    
    Following CODESTYLE.md: Guard clauses
    """
    # Guard: validate event
    if not event:
        return

    logger = get_logger("cortex.planning")

    logger.info(
        event,
        plan_id=plan_id,
        strategy=strategy,
        step_count=step_count,
        duration_ms=duration_ms,
        brainwav=True,
        **kwargs,
    )


def log_reflection_event(
    event: str,
    quality_score: float = 0.0,
    approved: bool = False,
    issues_count: int = 0,
    **kwargs,
):
    """
    Log reflection event with metadata.
    
    Args:
        event: Event name
        quality_score: Quality score (0-1)
        approved: Whether approved
        issues_count: Number of issues
        **kwargs: Additional context
    
    Following CODESTYLE.md: Guard clauses
    """
    # Guard: validate event
    if not event:
        return

    logger = get_logger("cortex.reflection")

    logger.info(
        event,
        quality_score=quality_score,
        approved=approved,
        issues_count=issues_count,
        brainwav=True,
        **kwargs,
    )


def log_error_event(error: Exception, context: Optional[Dict[str, Any]] = None):
    """
    Log error event with stack trace.
    
    Args:
        error: Exception instance
        context: Additional error context
    
    Following CODESTYLE.md: Guard clauses
    """
    # Guard: validate error
    if not error:
        return

    logger = get_logger("cortex.error")

    logger.error(
        "error.occurred",
        error_type=type(error).__name__,
        error_message=str(error),
        context=context or {},
        brainwav=True,
        exc_info=error,
    )


@contextmanager
def log_duration(operation: str, warn_threshold_ms: float = 1000):
    """
    Context manager to log operation duration.
    
    Args:
        operation: Operation name
        warn_threshold_ms: Threshold for warning
    
    Yields:
        None
    
    Following CODESTYLE.md: Context manager pattern
    """
    logger = get_logger("cortex.performance")

    start = time.perf_counter()

    try:
        yield
    finally:
        duration_ms = (time.perf_counter() - start) * 1000

        # Log duration
        if duration_ms > warn_threshold_ms:
            logger.warning(
                f"{operation}.slow",
                operation=operation,
                duration_ms=round(duration_ms, 2),
                threshold_ms=warn_threshold_ms,
                brainwav=True,
            )
        else:
            logger.debug(
                f"{operation}.completed",
                operation=operation,
                duration_ms=round(duration_ms, 2),
                brainwav=True,
            )
