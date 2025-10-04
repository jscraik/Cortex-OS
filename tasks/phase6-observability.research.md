# Phase 6: Advanced Observability & Metrics - Research

**Date**: 2025-01-04  
**Phase**: 6.1 Metrics + 6.2 Logging  
**Status**: Research Phase

---

## Executive Summary

Phase 6 adds production-grade observability to the Cortex-OS system with Prometheus metrics, structured logging, and performance monitoring. This enables effective debugging, monitoring, and optimization in production.

## Context from Previous Phases

**Phases 3-5 Delivered**:
- ✅ Multimodal AI with hybrid search
- ✅ Autonomous agents (CoT, Reflection, ToT)
- ✅ Operational readiness (health, shutdown)
- ✅ Integration tests (end-to-end validation)

**Phase 6 Adds**:
- Prometheus metrics export
- Structured logging (JSON)
- Performance monitoring
- Request tracing

---

## Observability Triad

### 1. Metrics (Prometheus)
**What**: Numeric measurements over time  
**Use**: Performance monitoring, alerting  
**Examples**:
- Request count/duration
- Planning operations per second
- Reflection loop iterations
- Memory usage

### 2. Logs (Structured JSON)
**What**: Event records with context  
**Use**: Debugging, auditing  
**Examples**:
- Planning requests with metadata
- Reflection critiques
- Health check results
- Error traces

### 3. Traces (Request Flow)
**What**: Request journey through system  
**Use**: Performance bottleneck identification  
**Examples**:
- Plan → Execute → Reflect flow
- Multi-service request tracking
- Latency breakdown by component

---

## Architecture Decisions

### 1. **Prometheus Metrics**

```python
from prometheus_client import Counter, Histogram, Gauge

# Request metrics
planning_requests_total = Counter(
    'brainwav_planning_requests_total',
    'Total planning requests',
    ['strategy', 'status']  # Labels
)

planning_duration_seconds = Histogram(
    'brainwav_planning_duration_seconds',
    'Planning operation duration',
    ['strategy']
)

# System metrics
active_plans_gauge = Gauge(
    'brainwav_active_plans',
    'Currently active plans'
)
```

**Endpoint**: `GET /metrics` - Prometheus scraping

### 2. **Structured Logging**

```python
import structlog

logger = structlog.get_logger()

logger.info(
    "planning.request",
    goal="Implement auth",
    strategy="cot",
    step_count=5,
    duration_ms=45,
    brainwav=True
)

# Output (JSON):
{
    "event": "planning.request",
    "goal": "Implement auth",
    "strategy": "cot",
    "step_count": 5,
    "duration_ms": 45,
    "brainwav": true,
    "timestamp": "2025-01-04T12:00:00Z",
    "level": "info"
}
```

### 3. **Performance Monitoring**

Track key operations:
- Planning generation time
- Reflection critique time
- Memory storage latency
- Health check duration

---

## Implementation Strategy

### Phase 6.1: Prometheus Metrics (TDD)
1. **RED**: Write failing tests for metrics collection
2. **GREEN**: Implement metric collectors
3. **REFACTOR**: Add /metrics endpoint

### Phase 6.2: Structured Logging (TDD)
1. **RED**: Write tests for structured logs
2. **GREEN**: Implement JSON logging
3. **REFACTOR**: Add context propagation

---

## Key Metrics to Track

### Planning Metrics
```python
# CoT Planning
brainwav_cot_plans_total           # Counter
brainwav_cot_plan_steps            # Histogram
brainwav_cot_duration_seconds      # Histogram

# ToT Planning
brainwav_tot_plans_total           # Counter
brainwav_tot_branches_generated    # Histogram
brainwav_tot_duration_seconds      # Histogram

# Reflection
brainwav_reflections_total         # Counter
brainwav_reflection_score          # Histogram
brainwav_improvements_applied      # Counter
```

### System Metrics
```python
# Health
brainwav_health_check_duration     # Histogram
brainwav_component_status          # Gauge (1=healthy, 0=unhealthy)

# Memory
brainwav_memory_operations_total   # Counter
brainwav_memory_size_bytes         # Gauge
```

### Performance Metrics
```python
# HTTP
brainwav_http_requests_total       # Counter (by endpoint, status)
brainwav_http_duration_seconds     # Histogram (by endpoint)

# Embeddings
brainwav_embeddings_total          # Counter
brainwav_embedding_duration        # Histogram
```

---

## Structured Logging Events

### Planning Events
```json
{
    "event": "cot.plan.generated",
    "plan_id": "plan-20250104120000",
    "goal": "Implement authentication",
    "step_count": 5,
    "complexity": 7,
    "duration_ms": 45,
    "brainwav": true
}
```

### Reflection Events
```json
{
    "event": "reflection.critique",
    "output_id": "out-123",
    "quality_score": 0.85,
    "approved": true,
    "issues_count": 0,
    "duration_ms": 12,
    "brainwav": true
}
```

### Error Events
```json
{
    "event": "error",
    "error_type": "PlanningError",
    "message": "brAInwav: Goal cannot be empty",
    "stack_trace": "...",
    "context": {
        "goal": "",
        "strategy": "cot"
    },
    "brainwav": true
}
```

---

## Prometheus Integration

### Metrics Endpoint

```python
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

@app.get("/metrics")
def metrics():
    """Prometheus metrics endpoint"""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )
```

### Grafana Dashboard

```yaml
# Example dashboard panels
- Planning Operations per Second
- Average Planning Duration (P50, P95, P99)
- Reflection Success Rate
- Health Check Status
- Memory Usage Trends
```

---

## Success Criteria

### Phase 6.1 Complete When:
- ✅ Prometheus metrics exported
- ✅ /metrics endpoint available
- ✅ Planning metrics tracked
- ✅ Health metrics tracked
- ✅ Performance metrics tracked
- ✅ 95% test coverage

### Phase 6.2 Complete When:
- ✅ Structured JSON logging
- ✅ Event-based log structure
- ✅ Context propagation
- ✅ Error logging with traces
- ✅ 95% test coverage

---

## Dependencies

### Python Packages
```python
prometheus-client>=0.19.0  # Prometheus metrics
structlog>=24.1.0          # Structured logging
python-json-logger>=2.0.7  # JSON formatter
```

### Integration Points
- Phase 5.1: Health metrics from health checks
- Phase 4: Planning/reflection operation metrics
- Phase 3: Memory operation metrics

---

## Example Usage

### Track Planning Operation

```python
from src.observability.metrics import (
    planning_requests_total,
    planning_duration_seconds
)
import time

# Track request
planning_requests_total.labels(strategy="cot", status="success").inc()

# Track duration
start = time.perf_counter()
plan = planner.generate_plan(goal, context)
duration = time.perf_counter() - start

planning_duration_seconds.labels(strategy="cot").observe(duration)
```

### Structured Logging

```python
from src.observability.logging import get_logger

logger = get_logger(__name__)

logger.info(
    "planning.completed",
    plan_id=plan["id"],
    strategy=plan["strategy"],
    step_count=len(plan["steps"]),
    duration_ms=duration * 1000,
    brainwav=True
)
```

---

## References

- [Prometheus Python Client](https://github.com/prometheus/client_python)
- [Structlog Documentation](https://www.structlog.org/)
- [The Observability Triad](https://peter.bourgon.org/blog/2017/02/21/metrics-tracing-and-logging.html)
- Phase 5 Health Implementation (completed)

---

**Status**: Research complete, ready to start Phase 6.1
