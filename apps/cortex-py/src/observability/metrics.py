"""
Prometheus Metrics for Cortex-Py (Phase 6.1)

Provides metrics collection and export for monitoring.

Following CODESTYLE.md:
- snake_case naming
- Type hints on all public functions
- Guard clauses for readability
- Functions ≤40 lines
- brAInwav branding in metric names
"""

from prometheus_client import Counter, Histogram, Gauge, REGISTRY


# Planning Metrics
planning_requests_total = Counter(
    "brainwav_planning_requests_total",
    "Total planning requests processed by brAInwav",
    ["strategy", "status"],
)

planning_duration_seconds = Histogram(
    "brainwav_planning_duration_seconds",
    "Planning operation duration in seconds",
    ["strategy"],
)

tot_branches_generated = Histogram(
    "brainwav_tot_branches_generated",
    "Number of ToT branches generated per plan",
)

# Reflection Metrics
reflection_requests_total = Counter(
    "brainwav_reflection_requests_total",
    "Total reflection critique requests",
    ["status"],
)

reflection_quality_score = Histogram(
    "brainwav_reflection_quality_score",
    "Quality scores from reflections (0-1)",
)

improvements_applied_total = Counter(
    "brainwav_improvements_applied_total",
    "Total improvements applied via reflection",
    ["iteration"],
)

# Health Metrics
health_check_duration_seconds = Histogram(
    "brainwav_health_check_duration_seconds",
    "Health check duration in seconds",
    ["component"],
)

component_status_gauge = Gauge(
    "brainwav_component_status",
    "Component health status (1=healthy, 0=unhealthy)",
    ["component"],
)

# Memory Metrics
memory_operations_total = Counter(
    "brainwav_memory_operations_total",
    "Total memory storage operations",
    ["operation", "status"],
)

memory_size_bytes = Gauge(
    "brainwav_memory_size_bytes",
    "Current memory size in bytes",
)

# HTTP Metrics
http_requests_total = Counter(
    "brainwav_http_requests_total",
    "Total HTTP requests processed",
    ["method", "endpoint", "status_code"],
)

http_request_duration_seconds = Histogram(
    "brainwav_http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
)


# Tracking Functions (all ≤40 lines)


def track_planning_request(strategy: str, status: str):
    """
    Track planning request.
    
    Args:
        strategy: Planning strategy (cot, tot)
        status: Request status (success, error)
    
    Following CODESTYLE.md: Guard clauses
    """
    # Guard: validate inputs
    if not strategy or not status:
        return

    planning_requests_total.labels(
        strategy=strategy, status=status
    ).inc()


def track_planning_duration(strategy: str, duration_seconds: float):
    """
    Track planning operation duration.
    
    Args:
        strategy: Planning strategy
        duration_seconds: Operation duration
    
    Following CODESTYLE.md: Guard clauses
    """
    # Guard: validate duration
    if duration_seconds < 0:
        return

    planning_duration_seconds.labels(strategy=strategy).observe(
        duration_seconds
    )


def track_tot_branches(branch_count: int):
    """
    Track ToT branch count.
    
    Args:
        branch_count: Number of branches generated
    
    Following CODESTYLE.md: Guard clauses
    """
    # Guard: validate count
    if branch_count <= 0:
        return

    tot_branches_generated.observe(branch_count)


def track_reflection_request(status: str):
    """
    Track reflection request.
    
    Args:
        status: Request status
    
    Following CODESTYLE.md: Simple tracking
    """
    if not status:
        return

    reflection_requests_total.labels(status=status).inc()


def track_quality_score(score: float):
    """
    Track reflection quality score.
    
    Args:
        score: Quality score (0-1)
    
    Following CODESTYLE.md: Guard clauses
    """
    # Guard: validate score range
    if not 0 <= score <= 1:
        return

    reflection_quality_score.observe(score)


def track_improvement(iteration: int):
    """
    Track improvement application.
    
    Args:
        iteration: Iteration number
    
    Following CODESTYLE.md: Guard clauses
    """
    # Guard: validate iteration
    if iteration < 0:
        return

    improvements_applied_total.labels(
        iteration=str(iteration)
    ).inc()


def track_health_check(
    component: str, duration_seconds: float, status: str
):
    """
    Track health check metrics.
    
    Args:
        component: Component name
        duration_seconds: Check duration
        status: Health status
    
    Following CODESTYLE.md: Guard clauses
    """
    # Guard: validate inputs
    if not component or duration_seconds < 0:
        return

    health_check_duration_seconds.labels(component=component).observe(
        duration_seconds
    )


def set_component_status(component: str, healthy: bool):
    """
    Set component health status gauge.
    
    Args:
        component: Component name
        healthy: True if healthy
    
    Following CODESTYLE.md: Guard clauses
    """
    # Guard: validate component
    if not component:
        return

    # 1 = healthy, 0 = unhealthy
    value = 1.0 if healthy else 0.0

    component_status_gauge.labels(component=component).set(value)


def track_memory_operation(operation: str, status: str):
    """
    Track memory operation.
    
    Args:
        operation: Operation type (store, retrieve)
        status: Operation status
    
    Following CODESTYLE.md: Guard clauses
    """
    if not operation or not status:
        return

    memory_operations_total.labels(
        operation=operation, status=status
    ).inc()


def set_memory_size(size_bytes: int):
    """
    Set memory size gauge.
    
    Args:
        size_bytes: Memory size in bytes
    
    Following CODESTYLE.md: Guard clauses
    """
    # Guard: validate size
    if size_bytes < 0:
        return

    memory_size_bytes.set(size_bytes)


def track_http_request(
    method: str,
    endpoint: str,
    status_code: int,
    duration_seconds: float,
):
    """
    Track HTTP request metrics.
    
    Args:
        method: HTTP method
        endpoint: Request endpoint
        status_code: Response status code
        duration_seconds: Request duration
    
    Following CODESTYLE.md: Guard clauses
    """
    # Guard: validate inputs
    if not method or not endpoint:
        return

    http_requests_total.labels(
        method=method, endpoint=endpoint, status_code=str(status_code)
    ).inc()

    http_request_duration_seconds.labels(
        method=method, endpoint=endpoint
    ).observe(duration_seconds)


def get_metrics_registry():
    """
    Get Prometheus metrics registry.
    
    Returns:
        Prometheus registry
    
    Following CODESTYLE.md: Simple accessor
    """
    return REGISTRY
