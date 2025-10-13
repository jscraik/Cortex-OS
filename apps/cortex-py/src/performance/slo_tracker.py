"""
SLO Tracker for Cortex-Py (Phase 7.1)

Tracks Service Level Objectives (SLOs) for performance monitoring.

Following CODESTYLE.md:
- snake_case naming
- Type hints on all public functions
- Guard clauses for readability
- Functions ≤40 lines
- brAInwav branding in reports
"""

from bisect import bisect_left, insort
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Deque, Dict, List, Optional, Set


@dataclass
class EndpointMetrics:
    """Sliding windows and aggregates for a single endpoint."""

    latency_window: Deque[float] = field(default_factory=deque)
    latency_sorted: List[float] = field(default_factory=list)
    request_window: Deque[bool] = field(default_factory=deque)
    success_count: int = 0
    failure_count: int = 0


class SLOTracker:
    """
    Tracks performance metrics and SLO compliance.
    
    Following CODESTYLE.md: Pure data tracking, functional interface
    """

    def __init__(self, window_size: int = 1000):
        """
        Initialize SLO tracker.
        
        Args:
            window_size: Maximum samples to retain per endpoint
        """
        self.window_size = window_size
        self.metrics: Dict[str, EndpointMetrics] = defaultdict(EndpointMetrics)

    def track(self, endpoint: str, latency_ms: float):
        """
        Track endpoint latency.
        
        Args:
            endpoint: Endpoint path
            latency_ms: Latency in milliseconds
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: validate inputs
        if not endpoint:
            return
        if latency_ms < 0:
            return

        metrics = self.metrics[endpoint]

        if len(metrics.latency_window) == self.window_size:
            oldest = metrics.latency_window.popleft()
            remove_index = bisect_left(metrics.latency_sorted, oldest)
            if (
                remove_index < len(metrics.latency_sorted)
                and metrics.latency_sorted[remove_index] == oldest
            ):
                metrics.latency_sorted.pop(remove_index)
            else:
                try:
                    metrics.latency_sorted.remove(oldest)
                except ValueError:
                    pass

        metrics.latency_window.append(latency_ms)
        insort(metrics.latency_sorted, latency_ms)

    def track_request(self, endpoint: str, success: bool):
        """
        Track request success/failure.
        
        Args:
            endpoint: Endpoint path
            success: True if successful
        
        Following CODESTYLE.md: Simple tracking
        """
        # Guard: validate endpoint
        if not endpoint:
            return

        metrics = self.metrics[endpoint]

        if len(metrics.request_window) == self.window_size:
            oldest = metrics.request_window.popleft()
            if oldest:
                metrics.success_count -= 1
            else:
                metrics.failure_count -= 1

        metrics.request_window.append(success)
        if success:
            metrics.success_count += 1
        else:
            metrics.failure_count += 1

    def get_percentile(self, endpoint: str, percentile: float) -> float:
        """
        Get latency percentile for endpoint.
        
        Args:
            endpoint: Endpoint path
            percentile: Percentile (0-100)
        
        Returns:
            Latency at percentile in ms
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: check if endpoint has data
        metrics = self.metrics.get(endpoint)

        if not metrics or not metrics.latency_sorted:
            return 0.0

        if percentile <= 0 or percentile > 100:
            return 0.0

        sorted_latencies = metrics.latency_sorted
        count = len(sorted_latencies)

        if count == 1:
            return float(sorted_latencies[0])

        rank = (percentile / 100.0) * (count - 1)
        lower_index = int(rank)
        upper_index = min(lower_index + 1, count - 1)
        fraction = rank - lower_index

        lower_value = sorted_latencies[lower_index]
        upper_value = sorted_latencies[upper_index]

        return float(lower_value + fraction * (upper_value - lower_value))

    def get_error_rate(self, endpoint: str) -> float:
        """
        Get error rate for endpoint.
        
        Args:
            endpoint: Endpoint path
        
        Returns:
            Error rate (0.0-1.0)
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: check if endpoint has data
        metrics = self.metrics.get(endpoint)

        if not metrics:
            return 0.0

        total_requests = metrics.success_count + metrics.failure_count

        if total_requests == 0:
            return 0.0

        return metrics.failure_count / total_requests

    def meets_slo(
        self,
        endpoint: str,
        p95_threshold_ms: float,
        error_threshold: float = 0.01,
    ) -> bool:
        """
        Check if endpoint meets SLO.
        
        Args:
            endpoint: Endpoint path
            p95_threshold_ms: P95 latency threshold
            error_threshold: Max error rate
        
        Returns:
            True if SLO met
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: validate endpoint exists
        metrics = self.metrics.get(endpoint)

        if not metrics:
            return True  # No data = no violations

        p95 = self.get_percentile(endpoint, 95)
        error_rate = self.get_error_rate(endpoint)

        latency_ok = p95 <= p95_threshold_ms
        errors_ok = error_rate <= error_threshold

        return latency_ok and errors_ok

    def get_endpoints(self) -> Set[str]:
        """
        Get all tracked endpoints.
        
        Returns:
            Set of endpoint paths
        
        Following CODESTYLE.md: Simple accessor
        """
        return set(self.metrics.keys())


# Global tracker instance
_global_tracker: Optional[SLOTracker] = None


def get_global_tracker() -> SLOTracker:
    """
    Get global SLO tracker instance.
    
    Returns:
        Global SLOTracker
    
    Following CODESTYLE.md: Singleton pattern
    """
    global _global_tracker
    
    if _global_tracker is None:
        _global_tracker = SLOTracker()
    
    return _global_tracker


def track_endpoint_latency(endpoint: str, latency_ms: float):
    """
    Track endpoint latency (convenience function).
    
    Args:
        endpoint: Endpoint path
        latency_ms: Latency in milliseconds
    
    Following CODESTYLE.md: Functional wrapper
    """
    tracker = get_global_tracker()
    tracker.track(endpoint, latency_ms)


def get_p95_latency(endpoint: str) -> float:
    """
    Get P95 latency for endpoint.
    
    Args:
        endpoint: Endpoint path
    
    Returns:
        P95 latency in ms
    
    Following CODESTYLE.md: Functional wrapper
    """
    tracker = get_global_tracker()
    return tracker.get_percentile(endpoint, 95)


def generate_slo_report() -> Dict:
    """
    Generate SLO compliance report.
    
    Returns:
        Report dictionary with compliance data
    
    Following CODESTYLE.md: Report generation
    """
    tracker = get_global_tracker()
    endpoints = tracker.get_endpoints()

    # Define SLO targets
    slo_targets = {
        "/health": {"p95_ms": 10.0, "error_rate": 0.01},
        "/health/ready": {"p95_ms": 20.0, "error_rate": 0.01},
        "/health/live": {"p95_ms": 5.0, "error_rate": 0.01},
        "/metrics": {"p95_ms": 50.0, "error_rate": 0.01},
    }

    endpoint_reports = {}
    compliant_count = 0

    for endpoint in endpoints:
        target = slo_targets.get(endpoint, {"p95_ms": 100.0, "error_rate": 0.01})
        
        p95 = tracker.get_percentile(endpoint, 95)
        error_rate = tracker.get_error_rate(endpoint)
        meets_slo = tracker.meets_slo(endpoint, target["p95_ms"], target["error_rate"])

        endpoint_reports[endpoint] = {
            "p95_ms": round(p95, 2),
            "error_rate": round(error_rate, 4),
            "target_p95_ms": target["p95_ms"],
            "target_error_rate": target["error_rate"],
            "compliant": meets_slo,
        }

        if meets_slo:
            compliant_count += 1

    overall_compliance = compliant_count / len(endpoints) if endpoints else 1.0

    return {
        "brainwav": True,
        "endpoints": endpoint_reports,
        "overall_compliance": round(overall_compliance, 2),
        "total_endpoints": len(endpoints),
        "compliant_endpoints": compliant_count,
    }
