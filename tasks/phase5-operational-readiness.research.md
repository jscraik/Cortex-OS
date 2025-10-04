# Phase 5: Operational Readiness - Research

**Date**: 2025-01-04  
**Phase**: 5.1 Health Endpoints + 5.2 Graceful Shutdown  
**Status**: Research Phase

---

## Executive Summary

Phase 5 focuses on production operational readiness with health monitoring, graceful shutdown, and observability. This enables the system to run reliably in production environments with proper lifecycle management.

## Context from Phases 3 & 4

**Phase 3 Delivered**:
- ✅ Multimodal memory storage and search
- ✅ REST API endpoints for embeddings
- ✅ 92% test coverage

**Phase 4 Delivered**:
- ✅ CoT planning and self-reflection
- ✅ Quality scoring and improvement
- ✅ 100% test coverage

**Phase 5 Builds On**:
- Production deployment requirements
- Health monitoring for services
- Clean shutdown without data loss
- Observability for debugging

---

## Phase 5 Breakdown

### Phase 5.1: Health Endpoints
**Goal**: Implement Kubernetes-compatible health checks

**Components**:
1. **Health Endpoint** (`/health`): Basic service availability
2. **Readiness Endpoint** (`/ready`): Service ready to accept traffic
3. **Liveness Endpoint** (`/live`): Service not in deadlock/hung state
4. **Dependency Checks**: Database, external services validation

### Phase 5.2: Graceful Shutdown
**Goal**: Handle SIGTERM/SIGINT without data loss

**Components**:
1. **Signal Handlers**: Catch shutdown signals
2. **Connection Draining**: Complete in-flight requests
3. **Resource Cleanup**: Close DB connections, file handles
4. **Timeout Management**: Force shutdown after grace period

---

## Health Check Standards

### Kubernetes Health Probes

```yaml
# Standard Kubernetes health configuration
livenessProbe:
  httpGet:
    path: /health/live
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 3
  timeoutSeconds: 2
  failureThreshold: 2

startupProbe:
  httpGet:
    path: /health/startup
    port: 8000
  initialDelaySeconds: 0
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 30
```

### Response Format

```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "version": "1.0.0",
  "timestamp": "2025-01-04T12:00:00Z",
  "checks": {
    "database": "healthy",
    "memory": "healthy",
    "embeddings": "healthy"
  },
  "brAInwav": {
    "service": "cortex-py",
    "environment": "production"
  }
}
```

---

## Architecture Decisions

### 1. **Health Check Interface**

```python
from typing import Dict, Any, Literal
from dataclasses import dataclass

HealthStatus = Literal["healthy", "degraded", "unhealthy"]

@dataclass
class HealthCheck:
    """Individual component health check"""
    name: str
    status: HealthStatus
    latency_ms: float
    message: str = ""

@dataclass
class HealthResponse:
    """Overall health response"""
    status: HealthStatus
    version: str
    timestamp: str
    checks: Dict[str, HealthCheck]
    brainwav_metadata: Dict[str, Any]
```

### 2. **Graceful Shutdown Pattern**

```python
import signal
import asyncio
from typing import Callable

class GracefulShutdown:
    """Handles graceful shutdown with timeout"""
    
    def __init__(self, shutdown_timeout: int = 30):
        self.shutdown_timeout = shutdown_timeout
        self.shutdown_event = asyncio.Event()
        self._cleanup_tasks: List[Callable] = []
    
    def register_cleanup(self, cleanup_fn: Callable):
        """Register cleanup function"""
        self._cleanup_tasks.append(cleanup_fn)
    
    async def shutdown(self):
        """Execute all cleanup tasks"""
        for task in self._cleanup_tasks:
            await task()
```

### 3. **Dependency Health Checks**

```python
async def check_database_health() -> HealthCheck:
    """Check database connectivity"""
    try:
        # Execute simple query with timeout
        start = time.perf_counter()
        await db.execute("SELECT 1")
        latency = (time.perf_counter() - start) * 1000
        
        return HealthCheck(
            name="database",
            status="healthy",
            latency_ms=latency
        )
    except Exception as e:
        return HealthCheck(
            name="database",
            status="unhealthy",
            latency_ms=0.0,
            message=f"brAInwav: {str(e)}"
        )
```

---

## Implementation Strategy

### Phase 5.1.1: Basic Health Endpoint (TDD)
1. **RED**: Write failing test for `/health` endpoint
2. **GREEN**: Implement basic health check
3. **REFACTOR**: Add component checks

### Phase 5.1.2: Readiness/Liveness (TDD)
1. **RED**: Write tests for `/ready` and `/live`
2. **GREEN**: Implement dependency validation
3. **REFACTOR**: Add latency tracking

### Phase 5.2.1: Signal Handlers (TDD)
1. **RED**: Write tests for SIGTERM handling
2. **GREEN**: Implement graceful shutdown
3. **REFACTOR**: Add timeout management

### Phase 5.2.2: Resource Cleanup (TDD)
1. **RED**: Write tests for cleanup tasks
2. **GREEN**: Implement connection draining
3. **REFACTOR**: Add force shutdown

---

## Success Criteria

### Phase 5.1 Complete When:
- ✅ `/health` returns 200 when healthy
- ✅ `/ready` returns 503 when not ready
- ✅ `/live` detects deadlocks
- ✅ Dependency checks validate DB, services
- ✅ Response includes brAInwav metadata
- ✅ 95% test coverage maintained

### Phase 5.2 Complete When:
- ✅ SIGTERM triggers graceful shutdown
- ✅ In-flight requests complete
- ✅ Database connections close cleanly
- ✅ Force shutdown after timeout
- ✅ No data loss on shutdown
- ✅ 95% test coverage

### Performance Targets:
- Health check: P95 < 50ms
- Readiness check: P95 < 100ms
- Shutdown latency: P95 < 5s

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Hung shutdown | High | Medium | Timeout with force kill |
| False negatives | Medium | Low | Retry logic, multiple checks |
| Health check overhead | Low | Medium | Cache results, rate limit |
| Database unavailable | High | Low | Graceful degradation |

---

## FastAPI Integration

### Health Endpoints

```python
from fastapi import FastAPI, Response, status

app = FastAPI()

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Basic health check"""
    health = await health_service.check()
    
    if health.status == "unhealthy":
        return Response(
            content=health.to_json(),
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    return health.to_dict()

@app.get("/health/ready")
async def readiness_check() -> Dict[str, Any]:
    """Readiness probe for Kubernetes"""
    ready = await health_service.check_readiness()
    
    if not ready.is_ready:
        return Response(
            content=ready.to_json(),
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    return ready.to_dict()

@app.get("/health/live")
async def liveness_check() -> Dict[str, Any]:
    """Liveness probe for Kubernetes"""
    # Simple check - if we can respond, we're alive
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "brAInwav": True
    }
```

### Shutdown Handler

```python
@app.on_event("shutdown")
async def shutdown_event():
    """FastAPI shutdown event"""
    logger.info("brAInwav: Starting graceful shutdown")
    await shutdown_manager.shutdown()
    logger.info("brAInwav: Shutdown complete")
```

---

## Existing Patterns in Codebase

I need to check if health endpoints already exist:
- `packages/orchestration/src/operations/health-checker.ts`
- `packages/memories/src/monitoring/health.ts`

Will follow existing patterns for consistency.

---

## Dependencies

### Required from Previous Phases:
- ✅ FastAPI app (Phase 3)
- ✅ Database/memory connections
- ⚠️ Observability infrastructure (may need to add)

### Additional Dependencies:
- `signal` module (built-in)
- `asyncio` (built-in)
- `time` for latency tracking (built-in)

---

## References

- [Kubernetes Health Checks](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [12-Factor App: Disposability](https://12factor.net/disposability)
- [FastAPI Startup/Shutdown Events](https://fastapi.tiangolo.com/advanced/events/)
- Existing TypeScript implementations in codebase

---

**Status**: Research complete, ready to start Phase 5.1.1  
**Next**: Write RED tests for health endpoints
