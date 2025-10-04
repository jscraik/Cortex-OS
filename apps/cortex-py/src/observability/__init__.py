"""
Observability Module for Cortex-Py (Phase 6)

Provides Prometheus metrics, structured logging, and performance monitoring.
"""

from .metrics import (
    track_planning_request,
    track_planning_duration,
    track_tot_branches,
    track_reflection_request,
    track_quality_score,
    track_improvement,
    track_health_check,
    set_component_status,
    track_memory_operation,
    set_memory_size,
    track_http_request,
    get_metrics_registry,
)

from .logging import (
    get_logger,
    log_planning_event,
    log_reflection_event,
    log_error_event,
    log_duration,
)

__all__ = [
    "track_planning_request",
    "track_planning_duration",
    "track_tot_branches",
    "track_reflection_request",
    "track_quality_score",
    "track_improvement",
    "track_health_check",
    "set_component_status",
    "track_memory_operation",
    "set_memory_size",
    "track_http_request",
    "get_metrics_registry",
    "get_logger",
    "log_planning_event",
    "log_reflection_event",
    "log_error_event",
    "log_duration",
]
