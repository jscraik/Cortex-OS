"""Performance profiling and optimization system for MCP."""

import asyncio
import cProfile
import gc
import io
import pstats
import threading
import time
import tracemalloc
from collections import defaultdict, deque
from contextlib import asynccontextmanager, contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from functools import wraps
from typing import Any

import psutil

from ..observability.metrics import get_metrics_collector
from ..observability.structured_logging import get_logger

logger = get_logger(__name__)
metrics = get_metrics_collector()


@dataclass
class PerformanceMetrics:
    """Performance metrics for a function or operation."""

    name: str
    call_count: int = 0
    total_time: float = 0.0
    min_time: float = float("inf")
    max_time: float = 0.0
    avg_time: float = 0.0
    p50_time: float = 0.0
    p95_time: float = 0.0
    p99_time: float = 0.0

    # Memory metrics
    memory_usage: int = 0  # bytes
    memory_peak: int = 0  # bytes

    # Error tracking
    error_count: int = 0
    success_rate: float = 100.0

    # Recent execution times (for percentile calculations)
    recent_times: deque = field(default_factory=lambda: deque(maxlen=1000))

    def add_execution(
        self, duration: float, memory_used: int = 0, success: bool = True
    ):
        """Add a new execution measurement."""
        self.call_count += 1
        self.total_time += duration
        self.min_time = min(self.min_time, duration)
        self.max_time = max(self.max_time, duration)
        self.avg_time = self.total_time / self.call_count

        # Track memory
        if memory_used > 0:
            self.memory_usage = memory_used
            self.memory_peak = max(self.memory_peak, memory_used)

        # Track errors
        if not success:
            self.error_count += 1

        self.success_rate = (
            (self.call_count - self.error_count) / self.call_count
        ) * 100

        # Add to recent times for percentile calculation
        self.recent_times.append(duration)

        # Calculate percentiles
        if len(self.recent_times) >= 10:
            sorted_times = sorted(self.recent_times)
            self.p50_time = sorted_times[int(len(sorted_times) * 0.5)]
            self.p95_time = sorted_times[int(len(sorted_times) * 0.95)]
            self.p99_time = sorted_times[int(len(sorted_times) * 0.99)]

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "name": self.name,
            "call_count": self.call_count,
            "total_time": round(self.total_time, 6),
            "min_time": round(self.min_time, 6) if self.min_time != float("inf") else 0,
            "max_time": round(self.max_time, 6),
            "avg_time": round(self.avg_time, 6),
            "p50_time": round(self.p50_time, 6),
            "p95_time": round(self.p95_time, 6),
            "p99_time": round(self.p99_time, 6),
            "memory_usage": self.memory_usage,
            "memory_peak": self.memory_peak,
            "error_count": self.error_count,
            "success_rate": round(self.success_rate, 2),
        }


@dataclass
class MemorySnapshot:
    """Memory usage snapshot."""

    timestamp: datetime
    rss: int  # Resident Set Size
    vms: int  # Virtual Memory Size
    percent: float  # Memory percentage
    available: int  # Available memory
    tracemalloc_current: int  # tracemalloc current usage
    tracemalloc_peak: int  # tracemalloc peak usage

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "rss": self.rss,
            "vms": self.vms,
            "percent": self.percent,
            "available": self.available,
            "tracemalloc_current": self.tracemalloc_current,
            "tracemalloc_peak": self.tracemalloc_peak,
        }


class PerformanceProfiler:
    """Advanced performance profiler for MCP components."""

    def __init__(self):
        self.enabled = True
        self.metrics: dict[str, PerformanceMetrics] = {}
        self.memory_snapshots: deque = deque(
            maxlen=1440
        )  # 24 hours at 1-minute intervals
        self.lock = threading.Lock()

        # Start memory tracking
        tracemalloc.start()

        # Background monitoring
        self._monitoring_task: asyncio.Task | None = None

        # Profiling sessions
        self.active_profiles: dict[str, cProfile.Profile] = {}

        # Function call tracking
        self.call_graph: dict[str, list[str]] = defaultdict(list)

        logger.info("Performance profiler initialized")

    def enable(self):
        """Enable profiling."""
        self.enabled = True
        if not tracemalloc.is_tracing():
            tracemalloc.start()
        logger.info("Performance profiling enabled")

    def disable(self):
        """Disable profiling."""
        self.enabled = False
        logger.info("Performance profiling disabled")

    def profile_function(self, name: str | None = None):
        """Decorator to profile function execution."""

        def decorator(func):
            func_name = name or f"{func.__module__}.{func.__qualname__}"

            if asyncio.iscoroutinefunction(func):

                @wraps(func)
                async def async_wrapper(*args, **kwargs):
                    if not self.enabled:
                        return await func(*args, **kwargs)

                    start_time = time.perf_counter()
                    start_memory = self._get_current_memory()
                    success = True

                    try:
                        result = await func(*args, **kwargs)
                        return result
                    except Exception:
                        success = False
                        raise
                    finally:
                        end_time = time.perf_counter()
                        end_memory = self._get_current_memory()
                        duration = end_time - start_time
                        memory_used = max(0, end_memory - start_memory)

                        self._record_execution(
                            func_name, duration, memory_used, success
                        )

                return async_wrapper
            else:

                @wraps(func)
                def sync_wrapper(*args, **kwargs):
                    if not self.enabled:
                        return func(*args, **kwargs)

                    start_time = time.perf_counter()
                    start_memory = self._get_current_memory()
                    success = True

                    try:
                        result = func(*args, **kwargs)
                        return result
                    except Exception:
                        success = False
                        raise
                    finally:
                        end_time = time.perf_counter()
                        end_memory = self._get_current_memory()
                        duration = end_time - start_time
                        memory_used = max(0, end_memory - start_memory)

                        self._record_execution(
                            func_name, duration, memory_used, success
                        )

                return sync_wrapper

        return decorator

    def _get_current_memory(self) -> int:
        """Get current memory usage."""
        try:
            if tracemalloc.is_tracing():
                current, peak = tracemalloc.get_traced_memory()
                return current
            else:
                return psutil.Process().memory_info().rss
        except Exception:
            return 0

    def _record_execution(
        self, func_name: str, duration: float, memory_used: int, success: bool
    ):
        """Record function execution metrics."""
        with self.lock:
            if func_name not in self.metrics:
                self.metrics[func_name] = PerformanceMetrics(func_name)

            self.metrics[func_name].add_execution(duration, memory_used, success)

            # Record to global metrics
            metrics.record_request(
                method=f"function_{func_name}",
                status="success" if success else "error",
                plugin="profiler",
                duration=duration,
            )

    @asynccontextmanager
    async def profile_context(self, name: str):
        """Context manager for profiling code blocks."""
        if not self.enabled:
            yield
            return

        start_time = time.perf_counter()
        start_memory = self._get_current_memory()
        success = True

        try:
            yield
        except Exception:
            success = False
            raise
        finally:
            end_time = time.perf_counter()
            end_memory = self._get_current_memory()
            duration = end_time - start_time
            memory_used = max(0, end_memory - start_memory)

            self._record_execution(name, duration, memory_used, success)

    @contextmanager
    def profile_sync_context(self, name: str):
        """Synchronous context manager for profiling code blocks."""
        if not self.enabled:
            yield
            return

        start_time = time.perf_counter()
        start_memory = self._get_current_memory()
        success = True

        try:
            yield
        except Exception:
            success = False
            raise
        finally:
            end_time = time.perf_counter()
            end_memory = self._get_current_memory()
            duration = end_time - start_time
            memory_used = max(0, end_memory - start_memory)

            self._record_execution(name, duration, memory_used, success)

    def start_profiling_session(self, session_name: str):
        """Start a detailed profiling session."""
        if session_name in self.active_profiles:
            logger.warning(f"Profiling session '{session_name}' already active")
            return

        profile = cProfile.Profile()
        profile.enable()
        self.active_profiles[session_name] = profile

        logger.info(f"Started profiling session: {session_name}")

    def stop_profiling_session(self, session_name: str) -> dict[str, Any]:
        """Stop a profiling session and return results."""
        if session_name not in self.active_profiles:
            logger.warning(f"No active profiling session: {session_name}")
            return {}

        profile = self.active_profiles.pop(session_name)
        profile.disable()

        # Analyze results
        stream = io.StringIO()
        stats = pstats.Stats(profile, stream=stream)
        stats.sort_stats("cumulative")
        stats.print_stats(20)  # Top 20 functions

        profile_output = stream.getvalue()

        logger.info(f"Stopped profiling session: {session_name}")

        return {
            "session_name": session_name,
            "profile_output": profile_output,
            "timestamp": datetime.now().isoformat(),
        }

    async def start_monitoring(self):
        """Start background performance monitoring."""
        self._monitoring_task = asyncio.create_task(self._monitoring_loop())
        logger.info("Performance monitoring started")

    async def stop_monitoring(self):
        """Stop background monitoring."""
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass

        logger.info("Performance monitoring stopped")

    async def _monitoring_loop(self):
        """Background monitoring loop."""
        while True:
            try:
                await self._capture_memory_snapshot()
                await asyncio.sleep(60)  # Capture every minute

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                await asyncio.sleep(60)

    async def _capture_memory_snapshot(self):
        """Capture current memory state."""
        try:
            process = psutil.Process()
            memory_info = process.memory_info()
            memory_percent = process.memory_percent()

            # Get system memory info
            system_memory = psutil.virtual_memory()

            # Get tracemalloc info
            tracemalloc_current = 0
            tracemalloc_peak = 0
            if tracemalloc.is_tracing():
                tracemalloc_current, tracemalloc_peak = tracemalloc.get_traced_memory()

            snapshot = MemorySnapshot(
                timestamp=datetime.now(),
                rss=memory_info.rss,
                vms=memory_info.vms,
                percent=memory_percent,
                available=system_memory.available,
                tracemalloc_current=tracemalloc_current,
                tracemalloc_peak=tracemalloc_peak,
            )

            self.memory_snapshots.append(snapshot)

            # Record to metrics
            metrics.record_request(
                method="memory_snapshot",
                status="success",
                plugin="profiler",
                duration=0.001,
            )

        except Exception as e:
            logger.error(f"Failed to capture memory snapshot: {e}")

    def get_performance_report(self) -> dict[str, Any]:
        """Get comprehensive performance report."""
        with self.lock:
            # Top functions by total time
            top_by_time = sorted(
                self.metrics.items(), key=lambda x: x[1].total_time, reverse=True
            )[:10]

            # Top functions by call count
            top_by_calls = sorted(
                self.metrics.items(), key=lambda x: x[1].call_count, reverse=True
            )[:10]

            # Functions with highest error rate
            top_by_errors = sorted(
                [
                    (name, metric)
                    for name, metric in self.metrics.items()
                    if metric.error_count > 0
                ],
                key=lambda x: x[1].error_count,
                reverse=True,
            )[:10]

            # Recent memory usage
            recent_memory = []
            if self.memory_snapshots:
                # Get last 60 snapshots (1 hour)
                recent = list(self.memory_snapshots)[-60:]
                recent_memory = [snap.to_dict() for snap in recent]

            return {
                "summary": {
                    "total_functions_profiled": len(self.metrics),
                    "total_calls_tracked": sum(
                        m.call_count for m in self.metrics.values()
                    ),
                    "total_time_tracked": sum(
                        m.total_time for m in self.metrics.values()
                    ),
                    "memory_snapshots_count": len(self.memory_snapshots),
                    "active_profiling_sessions": len(self.active_profiles),
                },
                "top_by_total_time": [
                    {"name": name, "metrics": metric.to_dict()}
                    for name, metric in top_by_time
                ],
                "top_by_call_count": [
                    {"name": name, "metrics": metric.to_dict()}
                    for name, metric in top_by_calls
                ],
                "functions_with_errors": [
                    {"name": name, "metrics": metric.to_dict()}
                    for name, metric in top_by_errors
                ],
                "memory_usage": {
                    "current_snapshot": recent_memory[-1] if recent_memory else None,
                    "recent_history": recent_memory,
                },
                "performance_insights": self._generate_insights(),
            }

    def _generate_insights(self) -> list[str]:
        """Generate performance insights and recommendations."""
        insights = []

        with self.lock:
            if not self.metrics:
                return ["No performance data available yet."]

            # Find slow functions
            slow_functions = [
                (name, metric)
                for name, metric in self.metrics.items()
                if metric.avg_time > 0.1  # Functions taking more than 100ms on average
            ]

            if slow_functions:
                slowest = max(slow_functions, key=lambda x: x[1].avg_time)
                insights.append(
                    f"Slowest function: {slowest[0]} (avg: {slowest[1].avg_time:.3f}s)"
                )

            # Find functions with high error rates
            error_functions = [
                (name, metric)
                for name, metric in self.metrics.items()
                if metric.success_rate < 95 and metric.call_count > 10
            ]

            if error_functions:
                worst_errors = min(error_functions, key=lambda x: x[1].success_rate)
                insights.append(
                    f"Highest error rate: {worst_errors[0]} ({worst_errors[1].success_rate:.1f}% success)"
                )

            # Memory usage insights
            if self.memory_snapshots:
                recent_snapshots = list(self.memory_snapshots)[-10:]
                if len(recent_snapshots) > 1:
                    memory_trend = recent_snapshots[-1].rss - recent_snapshots[0].rss
                    if memory_trend > 50 * 1024 * 1024:  # More than 50MB increase
                        insights.append(
                            f"Memory usage increased by {memory_trend // 1024 // 1024}MB recently"
                        )

                current_percent = (
                    recent_snapshots[-1].percent if recent_snapshots else 0
                )
                if current_percent > 80:
                    insights.append(
                        f"High memory usage: {current_percent:.1f}% of system memory"
                    )

            # Function call patterns
            total_calls = sum(m.call_count for m in self.metrics.values())
            if total_calls > 0:
                top_function = max(self.metrics.items(), key=lambda x: x[1].call_count)
                call_percentage = (top_function[1].call_count / total_calls) * 100
                if call_percentage > 50:
                    insights.append(
                        f"Function {top_function[0]} dominates execution ({call_percentage:.1f}% of calls)"
                    )

            if not insights:
                insights.append("Performance looks good - no issues detected.")

        return insights

    def reset_metrics(self):
        """Reset all performance metrics."""
        with self.lock:
            self.metrics.clear()
            self.memory_snapshots.clear()

            # Reset tracemalloc
            if tracemalloc.is_tracing():
                tracemalloc.clear_traces()

            # Force garbage collection
            gc.collect()

        logger.info("Performance metrics reset")

    def get_function_metrics(self, function_name: str) -> dict[str, Any] | None:
        """Get metrics for a specific function."""
        with self.lock:
            if function_name in self.metrics:
                return self.metrics[function_name].to_dict()
        return None

    def get_memory_usage_trend(self, hours: int = 1) -> list[dict[str, Any]]:
        """Get memory usage trend for the specified number of hours."""
        cutoff_time = datetime.now() - timedelta(hours=hours)

        trend_data = []
        for snapshot in self.memory_snapshots:
            if snapshot.timestamp > cutoff_time:
                trend_data.append(snapshot.to_dict())

        return trend_data


class OptimizationEngine:
    """Automatic optimization engine for MCP performance."""

    def __init__(self, profiler: PerformanceProfiler):
        self.profiler = profiler
        self.optimizations_applied: list[dict[str, Any]] = []

    def analyze_and_optimize(self) -> list[dict[str, Any]]:
        """Analyze performance data and suggest/apply optimizations."""
        suggestions = []

        report = self.profiler.get_performance_report()

        # Analyze slow functions
        for func_data in report["top_by_total_time"][:5]:
            name = func_data["name"]
            metrics = func_data["metrics"]

            if metrics["avg_time"] > 0.5:  # Functions taking more than 500ms
                suggestion = {
                    "type": "slow_function",
                    "function": name,
                    "issue": f"Function is slow (avg: {metrics['avg_time']:.3f}s)",
                    "suggestions": [
                        "Consider adding caching if function performs repeated calculations",
                        "Profile internal operations to identify bottlenecks",
                        "Consider async/await if function does I/O operations",
                        "Review algorithms for optimization opportunities",
                    ],
                }
                suggestions.append(suggestion)

        # Analyze memory usage
        memory_data = report["memory_usage"]
        if memory_data["current_snapshot"]:
            current_memory = memory_data["current_snapshot"]
            if current_memory["percent"] > 85:
                suggestion = {
                    "type": "high_memory_usage",
                    "issue": f"High memory usage: {current_memory['percent']:.1f}%",
                    "suggestions": [
                        "Review memory-intensive operations",
                        "Implement object pooling for frequently created objects",
                        "Consider using generators for large data sets",
                        "Review cache sizes and cleanup policies",
                    ],
                }
                suggestions.append(suggestion)

        # Analyze error rates
        for func_data in report["functions_with_errors"]:
            name = func_data["name"]
            metrics = func_data["metrics"]

            if metrics["success_rate"] < 90 and metrics["call_count"] > 100:
                suggestion = {
                    "type": "high_error_rate",
                    "function": name,
                    "issue": f"High error rate: {100 - metrics['success_rate']:.1f}% failures",
                    "suggestions": [
                        "Add better error handling and retry logic",
                        "Review input validation",
                        "Add circuit breakers for external dependencies",
                        "Implement graceful degradation",
                    ],
                }
                suggestions.append(suggestion)

        return suggestions


# Global profiler instance
_profiler: PerformanceProfiler | None = None


def get_profiler() -> PerformanceProfiler:
    """Get or create global profiler instance."""
    global _profiler

    if _profiler is None:
        _profiler = PerformanceProfiler()

    return _profiler


def profile(name: str | None = None):
    """Convenience decorator for profiling functions."""
    return get_profiler().profile_function(name)
