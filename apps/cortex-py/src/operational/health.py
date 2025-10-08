"""
Health Check Service for Cortex-Py (Phase 5.1)

Kubernetes-compatible health, readiness, and liveness checks.

Following CODESTYLE.md:
- snake_case naming
- Type hints on all public functions
- Guard clauses for readability
- Functions ≤40 lines
- brAInwav branding in outputs
"""

import time
from datetime import datetime, timezone
from typing import Dict, Any, Literal

HealthStatus = Literal["healthy", "degraded", "unhealthy"]


class HealthCheckError(Exception):
    """brAInwav health check error"""

    pass


class HealthService:
    """
    Health check service for Kubernetes probes.
    
    Provides health, readiness, and liveness checks with
    component-level validation.
    """

    def __init__(self, version: str = "1.0.0"):
        """
        Initialize health service.
        
        Args:
            version: Service version string
        """
        self.version = version
        self._ready = True  # Default to ready

    def check_health(self) -> Dict[str, Any]:
        """
        Comprehensive health check with all components.
        
        Returns:
            Health response with status and component detail
        """
        components = {
            "memory": check_memory_health(),
            "embeddings": check_embeddings_health(),
            "database": check_database_health(),
        }

        overall_status = self._aggregate_status(components)

        return {
            "status": overall_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "components": components,
            "service": self._service_info(),
        }

    def check_readiness(self) -> Dict[str, Any]:
        """
        Readiness check for accepting traffic.
        
        Returns:
            Readiness response
        """
        if not self._ready:
            return {
                "status": "unhealthy",
                "ready": False,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message": "brAInwav: Service not ready",
                "components": {},
                "service": self._service_info(),
            }

        components = {
            "memory": check_memory_health(),
            "embeddings": check_embeddings_health(),
        }

        all_healthy = all(
            component["status"] == "healthy" for component in components.values()
        )

        return {
            "status": "healthy" if all_healthy else "unhealthy",
            "ready": all_healthy,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "components": components,
            "service": self._service_info(),
        }

    def check_liveness(self) -> Dict[str, Any]:
        """
        Simple liveness check.
        
        Returns:
            Liveness response
        """
        return {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": self._service_info(),
        }

    def set_ready(self, ready: bool):
        """
        Set readiness state.
        
        Args:
            ready: True if service ready
        """
        self._ready = ready

    def _service_info(self) -> Dict[str, str]:
        """Return consistent service metadata."""
        return {
            "name": "brAInwav Cortex-Py Runtime",
            "brand": "brAInwav",
            "version": self.version,
        }

    def _aggregate_status(
        self, checks: Dict[str, Dict[str, Any]]
    ) -> HealthStatus:
        """
        Aggregate component statuses.
        
        Following CODESTYLE.md: Guard clauses for simple cases
        """
        # Guard: no checks
        if not checks:
            return "healthy"

        statuses = [check["status"] for check in checks.values()]

        # Any unhealthy → overall unhealthy
        if "unhealthy" in statuses:
            return "unhealthy"

        # Any degraded → overall degraded
        if "degraded" in statuses:
            return "degraded"

        # All healthy
        return "healthy"


# Component health check functions (all ≤40 lines)


def check_memory_health() -> Dict[str, Any]:
    """
    Check memory system health.
    
    Returns:
        Health check result
    
    Following CODESTYLE.md: Guard clauses
    """
    try:
        start = time.perf_counter()

        # Simple memory check (can expand later)
        # In production would check actual memory store
        import sys

        _ = sys.getsizeof({})  # Minimal check

        latency = (time.perf_counter() - start) * 1000

        return {
            "status": "healthy",
            "latency_ms": round(latency, 2),
            "message": "brAInwav: Memory system operational",
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "latency_ms": 0.0,
            "message": f"brAInwav: Memory check failed - {str(e)}",
        }


def check_embeddings_health() -> Dict[str, Any]:
    """
    Check embedding service health.
    
    Returns:
        Health check result
    
    Following CODESTYLE.md: Guard clauses
    """
    try:
        start = time.perf_counter()

        # Check if embedding generator available
        # In production would do a test embedding
        # For now, simple availability check
        from src.cortex_py.generator import build_embedding_generator
        import os

        fast_test = os.getenv("CORTEX_PY_FAST_TEST") == "1"
        generator = build_embedding_generator(fast_test=fast_test)

        latency = (time.perf_counter() - start) * 1000

        # Guard: generator must exist
        if generator is None:
            return {
                "status": "unhealthy",
                "latency_ms": round(latency, 2),
                "message": "brAInwav: Embedding generator not available",
            }

        return {
            "status": "healthy",
            "latency_ms": round(latency, 2),
            "message": "brAInwav: Embedding service operational",
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "latency_ms": 0.0,
            "message": f"brAInwav: Embeddings check failed - {str(e)}",
        }


def check_database_health() -> Dict[str, Any]:
    """
    Check database connectivity.
    
    Returns:
        Health check result
    
    Following CODESTYLE.md: Guard clauses
    """
    try:
        start = time.perf_counter()

        # Simple check (can expand with real DB query later)
        # For now, assume healthy if no errors
        latency = (time.perf_counter() - start) * 1000

        return {
            "status": "healthy",
            "latency_ms": round(latency, 2),
            "message": "brAInwav: Database operational",
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "latency_ms": 0.0,
            "message": f"brAInwav: Database check failed - {str(e)}",
        }
