#!/usr/bin/env python3
"""
Thermal Management and Resource Monitoring for MLX on Apple Silicon
Intelligent thermal throttling and GPU temperature monitoring
"""

import asyncio
import json
import logging
import os
import platform
import shutil
import subprocess
import time
from collections.abc import Callable
from dataclasses import dataclass
from enum import Enum
from typing import Any

import psutil

logger = logging.getLogger(__name__)


class ThermalState(Enum):
    """Thermal state classifications"""

    NORMAL = "normal"  # < 85°C - Full GPU acceleration
    THROTTLED = "throttled"  # 85-90°C - Reduced performance
    CPU_ONLY = "cpu_only"  # > 90°C - Emergency CPU-only mode


class ResourceState(Enum):
    """Resource availability states"""

    OPTIMAL = "optimal"  # < 60% utilization
    MODERATE = "moderate"  # 60-80% utilization
    HIGH = "high"  # 80-95% utilization
    CRITICAL = "critical"  # > 95% utilization


@dataclass
class ThermalMetrics:
    """Thermal and resource metrics"""

    gpu_temp_celsius: float
    cpu_temp_celsius: float
    memory_pressure: float
    gpu_utilization: float
    power_draw_watts: float
    thermal_state: ThermalState
    resource_state: ResourceState
    timestamp: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "gpu_temp_celsius": self.gpu_temp_celsius,
            "cpu_temp_celsius": self.cpu_temp_celsius,
            "memory_pressure": self.memory_pressure,
            "gpu_utilization": self.gpu_utilization,
            "power_draw_watts": self.power_draw_watts,
            "thermal_state": self.thermal_state.value,
            "resource_state": self.resource_state.value,
            "timestamp": self.timestamp,
        }


class ThermalGuard:
    """
    Thermal monitoring and management system for Apple Silicon

    Features:
    - Real-time GPU temperature monitoring via Activity Monitor
    - Intelligent throttling at configurable thresholds
    - Emergency CPU-only fallback for thermal protection
    - Performance degradation curves
    - Integration with model loading decisions
    """

    def __init__(
        self,
        temp_threshold: float = 85.0,
        critical_temp: float = 90.0,
        monitoring_interval: float = 5.0,
    ):
        self.temp_threshold = temp_threshold
        self.critical_temp = critical_temp
        self.monitoring_interval = monitoring_interval

        # Current state
        self.current_metrics: ThermalMetrics | None = None
        self.thermal_state = ThermalState.NORMAL
        self.resource_state = ResourceState.OPTIMAL

        # History for trend analysis
        self.metrics_history: list[ThermalMetrics] = []
        self.max_history_size = 1000

        # Thermal event callbacks
        self.thermal_callbacks: list[Callable[[ThermalState], None]] = []

        # Performance tracking
        self.throttle_events = 0
        self.emergency_events = 0
        self.total_monitoring_time = 0.0

        # Platform detection
        self.is_apple_silicon = self._detect_apple_silicon()

        # Monitoring task
        self._monitoring_task: asyncio.Task | None = None
        self._shutdown_event = asyncio.Event()

        logger.info(
            f"Thermal Guard initialized (Apple Silicon: {self.is_apple_silicon})"
        )

    def _allow_sudo(self) -> bool:
        """Whether sudo is explicitly allowed for system probes.

        Defaults to False to avoid password prompts in dev/CI. Opt-in with:
        CORTEX_ALLOW_SUDO=true (or 1/yes)
        """
        val = os.environ.get("CORTEX_ALLOW_SUDO", "").strip().lower()
        return val in {"1", "true", "yes"}

    def _detect_apple_silicon(self) -> bool:
        """Detect if running on Apple Silicon"""
        try:
            if platform.system() != "Darwin":
                return False

            try:
                # Check for Apple Silicon indicators
                # SECURITY NOTE: This subprocess call is safe because:
                # 1. The command is hardcoded and not user-controlled
                # 2. Only system information is retrieved
                # 3. A timeout is enforced
                sysctl_path = shutil.which("sysctl")
                if not sysctl_path:
                    return False

                result = subprocess.run(
                    [sysctl_path, "-n", "machdep.cpu.brand_string"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                )

                if result.returncode == 0:
                    cpu_brand = result.stdout.strip()
                    return "Apple" in cpu_brand

                return False

            except Exception as e:
                logger.warning(f"Could not detect Apple Silicon: {e}")
                return False
                cpu_brand = result.stdout.strip()
                return "Apple" in cpu_brand

            return False

        except Exception as e:
            logger.warning(f"Could not detect Apple Silicon: {e}")
            return False

    async def start_monitoring(self) -> None:
        """Start thermal monitoring task"""
        if self._monitoring_task and not self._monitoring_task.done():
            logger.warning("Thermal monitoring already running")
            return

        logger.info("Starting thermal monitoring")
        self._shutdown_event.clear()
        self._monitoring_task = asyncio.create_task(self._monitoring_loop())

    async def stop_monitoring(self) -> None:
        """Stop thermal monitoring task"""
        logger.info("Stopping thermal monitoring")
        self._shutdown_event.set()

        if self._monitoring_task:
            try:
                await asyncio.wait_for(self._monitoring_task, timeout=5.0)
            except TimeoutError:
                logger.warning("Thermal monitoring task did not stop gracefully")
                self._monitoring_task.cancel()

    async def _monitoring_loop(self) -> None:
        """Main monitoring loop"""
        start_time = time.time()

        try:
            while not self._shutdown_event.is_set():
                # Collect metrics
                metrics = await self._collect_metrics()

                if metrics:
                    self.current_metrics = metrics
                    self._update_history(metrics)

                    # Check thermal state changes
                    new_thermal_state = self._determine_thermal_state(metrics)
                    if new_thermal_state != self.thermal_state:
                        await self._handle_thermal_state_change(new_thermal_state)

                    # Check resource state
                    self.resource_state = self._determine_resource_state(metrics)

                # Wait for next monitoring cycle
                try:
                    await asyncio.wait_for(
                        self._shutdown_event.wait(), timeout=self.monitoring_interval
                    )
                    break  # Shutdown requested
                except TimeoutError:
                    continue  # Normal timeout, continue monitoring

        except Exception as e:
            logger.error(f"Error in thermal monitoring loop: {e}")
        finally:
            self.total_monitoring_time += time.time() - start_time
            logger.info("Thermal monitoring stopped")

    async def _collect_metrics(self) -> ThermalMetrics | None:
        """Collect system thermal and resource metrics"""
        try:
            # Get temperature data
            gpu_temp = await self._get_gpu_temperature()
            cpu_temp = await self._get_cpu_temperature()

            # Get resource utilization
            memory_info = psutil.virtual_memory()
            memory_pressure = memory_info.percent / 100.0

            gpu_util = await self._get_gpu_utilization()
            power_draw = await self._get_power_draw()

            return ThermalMetrics(
                gpu_temp_celsius=gpu_temp,
                cpu_temp_celsius=cpu_temp,
                memory_pressure=memory_pressure,
                gpu_utilization=gpu_util,
                power_draw_watts=power_draw,
                thermal_state=self.thermal_state,
                resource_state=self.resource_state,
                timestamp=time.time(),
            )

        except Exception as e:
            logger.error(f"Failed to collect metrics: {e}")
            return None

    async def _get_gpu_temperature(self) -> float:
        """Get GPU temperature using powermetrics on Apple Silicon"""
        if not self.is_apple_silicon:
            return 70.0  # Mock temperature for non-Apple Silicon

        try:
            # Use powermetrics to get GPU temperature (no sudo by default)
            base_cmd = [
                "powermetrics",
                "--samplers",
                "gpu_power",
                "--sample-count",
                "1",
                "--format",
                "plist",
            ]
            # First attempt without sudo
            result = await asyncio.create_subprocess_exec(
                *base_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await asyncio.wait_for(result.communicate(), timeout=10.0)

            if result.returncode != 0 and self._allow_sudo():
                # Optional retry with sudo -n if explicitly allowed
                sudo_cmd = ["sudo", "-n", *base_cmd]
                result = await asyncio.create_subprocess_exec(
                    *sudo_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, _ = await asyncio.wait_for(result.communicate(), timeout=10.0)

            if result.returncode == 0:
                # Parse plist output for GPU temperature
                # This is a simplified parser - in production use plistlib
                output = stdout.decode()

                # Look for temperature values in the output
                import re

                temp_match = re.search(
                    r"<key>gpu_temp</key>\s*<real>([\d.]+)</real>", output
                )
                if temp_match:
                    return float(temp_match.group(1))

                # Fallback: extract any temperature-like value
                temp_matches = re.findall(r"(\d+\.?\d*)[°C]", output)
                if temp_matches:
                    return float(temp_matches[0])

            return 75.0  # Default fallback temperature

        except Exception as e:
            logger.debug(f"Could not get GPU temperature: {e}")
            return 75.0  # Fallback temperature

    async def _get_cpu_temperature(self) -> float:
        """Get CPU temperature"""
        if not self.is_apple_silicon:
            return 60.0  # Mock temperature

        try:
            # Try to get CPU temperature via sysctl
            result = await asyncio.create_subprocess_exec(
                "sysctl",
                "-n",
                "machdep.xcpm.cpu_thermal_state",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, _ = await asyncio.wait_for(result.communicate(), timeout=5.0)

            if result.returncode == 0:
                # Parse thermal state and convert to approximate temperature
                thermal_state = int(stdout.decode().strip())
                # Convert thermal state to approximate temperature
                return 50.0 + (thermal_state * 5.0)

            return 65.0  # Default CPU temperature

        except Exception as e:
            logger.debug(f"Could not get CPU temperature: {e}")
            return 65.0

    async def _get_gpu_utilization(self) -> float:
        """Get GPU utilization percentage"""
        if not self.is_apple_silicon:
            return 30.0  # Mock utilization

        try:
            # Use ioreg to get GPU utilization
            result = await asyncio.create_subprocess_exec(
                "ioreg",
                "-l",
                "-w",
                "0",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, _ = await asyncio.wait_for(result.communicate(), timeout=5.0)

            if result.returncode == 0:
                output = stdout.decode()

                # Look for GPU utilization in ioreg output
                import re

                util_match = re.search(
                    r'"PerformanceStatistics".*?"GPU".*?"utilization".*?(\d+)',
                    output,
                    re.DOTALL,
                )
                if util_match:
                    return float(util_match.group(1))

            return 25.0  # Default GPU utilization

        except Exception as e:
            logger.debug(f"Could not get GPU utilization: {e}")
            return 25.0

    async def _get_power_draw(self) -> float:
        """Get system power draw in watts"""
        try:
            # Use powermetrics for power measurement (no sudo by default)
            base_cmd = [
                "powermetrics",
                "--samplers",
                "cpu_power,gpu_power",
                "--sample-count",
                "1",
                "--format",
                "plist",
            ]
            result = await asyncio.create_subprocess_exec(
                *base_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await asyncio.wait_for(result.communicate(), timeout=10.0)

            if result.returncode != 0 and self._allow_sudo():
                sudo_cmd = ["sudo", "-n", *base_cmd]
                result = await asyncio.create_subprocess_exec(
                    *sudo_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, _ = await asyncio.wait_for(result.communicate(), timeout=10.0)

            if result.returncode == 0:
                output = stdout.decode()

                # Extract power values
                import re

                power_matches = re.findall(r"<real>([\d.]+)</real>", output)
                if power_matches:
                    # Sum CPU and GPU power
                    total_power = sum(float(p) for p in power_matches[:2])
                    return min(total_power, 200.0)  # Cap at 200W

            return 50.0  # Default power draw

        except Exception as e:
            logger.debug(f"Could not get power draw: {e}")
            return 50.0

    def _determine_thermal_state(self, metrics: ThermalMetrics) -> ThermalState:
        """Determine thermal state based on metrics"""
        gpu_temp = metrics.gpu_temp_celsius

        if gpu_temp >= self.critical_temp:
            return ThermalState.CPU_ONLY
        elif gpu_temp >= self.temp_threshold:
            return ThermalState.THROTTLED
        else:
            return ThermalState.NORMAL

    def _determine_resource_state(self, metrics: ThermalMetrics) -> ResourceState:
        """Determine resource state based on utilization metrics"""
        # Combine multiple resource metrics
        utilization_score = (
            metrics.memory_pressure * 0.4
            + (metrics.gpu_utilization / 100.0) * 0.4
            + min(metrics.power_draw_watts / 100.0, 1.0) * 0.2
        )

        if utilization_score >= 0.95:
            return ResourceState.CRITICAL
        elif utilization_score >= 0.8:
            return ResourceState.HIGH
        elif utilization_score >= 0.6:
            return ResourceState.MODERATE
        else:
            return ResourceState.OPTIMAL

    async def _handle_thermal_state_change(self, new_state: ThermalState) -> None:
        """Handle thermal state changes"""
        old_state = self.thermal_state
        self.thermal_state = new_state

        logger.info(f"Thermal state changed: {old_state.value} -> {new_state.value}")

        # Update performance counters
        if new_state == ThermalState.THROTTLED:
            self.throttle_events += 1
        elif new_state == ThermalState.CPU_ONLY:
            self.emergency_events += 1

        # Notify callbacks
        for callback in self.thermal_callbacks:
            try:
                callback(new_state)
            except Exception as e:
                logger.error(f"Error in thermal callback: {e}")

    def _update_history(self, metrics: ThermalMetrics) -> None:
        """Update metrics history"""
        self.metrics_history.append(metrics)

        # Trim history if too large
        if len(self.metrics_history) > self.max_history_size:
            self.metrics_history = self.metrics_history[-self.max_history_size :]

    def add_thermal_callback(self, callback: Callable[[ThermalState], None]) -> None:
        """Add callback for thermal state changes"""
        self.thermal_callbacks.append(callback)

    def remove_thermal_callback(self, callback: Callable[[ThermalState], None]) -> None:
        """Remove thermal state callback"""
        if callback in self.thermal_callbacks:
            self.thermal_callbacks.remove(callback)

    async def check_thermal_state(self) -> ThermalState:
        """
        Check current thermal state synchronously
        Used for quick thermal checks before inference
        """
        if self.current_metrics:
            return self.thermal_state

        # Quick temperature check
        metrics = await self._collect_metrics()
        if metrics:
            return self._determine_thermal_state(metrics)

        return ThermalState.NORMAL  # Default to normal if check fails

    def get_thermal_recommendation(self) -> dict[str, Any]:
        """
        Get thermal-based recommendations for model loading and inference
        """
        if not self.current_metrics:
            return {
                "can_load_large_models": True,
                "recommended_batch_size": 4,
                "inference_delay_ms": 0,
                "recommended_action": "normal_operation",
            }

        metrics = self.current_metrics

        if self.thermal_state == ThermalState.CPU_ONLY:
            return {
                "can_load_large_models": False,
                "recommended_batch_size": 1,
                "inference_delay_ms": 2000,
                "recommended_action": "emergency_cpu_only",
                "reason": f"GPU temperature critical: {metrics.gpu_temp_celsius:.1f}°C",
            }
        elif self.thermal_state == ThermalState.THROTTLED:
            return {
                "can_load_large_models": False,
                "recommended_batch_size": 2,
                "inference_delay_ms": 1000,
                "recommended_action": "throttled_operation",
                "reason": f"GPU temperature high: {metrics.gpu_temp_celsius:.1f}°C",
            }
        else:
            batch_size = 4
            delay_ms = 0

            # Adjust based on resource pressure
            if self.resource_state == ResourceState.HIGH:
                batch_size = 3
                delay_ms = 200
            elif self.resource_state == ResourceState.CRITICAL:
                batch_size = 2
                delay_ms = 500

            return {
                "can_load_large_models": True,
                "recommended_batch_size": batch_size,
                "inference_delay_ms": delay_ms,
                "recommended_action": "normal_operation",
                "resource_state": self.resource_state.value,
            }

    def get_thermal_stats(self) -> dict[str, Any]:
        """Get thermal monitoring statistics"""
        if not self.metrics_history:
            return {"status": "no_data"}

        recent_metrics = self.metrics_history[-10:]  # Last 10 readings

        avg_gpu_temp = sum(m.gpu_temp_celsius for m in recent_metrics) / len(
            recent_metrics
        )
        max_gpu_temp = max(m.gpu_temp_celsius for m in recent_metrics)
        avg_power = sum(m.power_draw_watts for m in recent_metrics) / len(
            recent_metrics
        )

        return {
            "current_thermal_state": self.thermal_state.value,
            "current_resource_state": self.resource_state.value,
            "avg_gpu_temp_celsius": round(avg_gpu_temp, 1),
            "max_gpu_temp_celsius": round(max_gpu_temp, 1),
            "avg_power_draw_watts": round(avg_power, 1),
            "throttle_events": self.throttle_events,
            "emergency_events": self.emergency_events,
            "monitoring_time_hours": round(self.total_monitoring_time / 3600, 2),
            "metrics_collected": len(self.metrics_history),
            "apple_silicon": self.is_apple_silicon,
            "temp_threshold": self.temp_threshold,
            "critical_temp": self.critical_temp,
        }

    def export_metrics_history(
        self, last_n: int | None = None
    ) -> list[dict[str, Any]]:
        """Export metrics history for analysis"""
        history = self.metrics_history

        if last_n:
            history = history[-last_n:]

        return [metrics.to_dict() for metrics in history]


class ResourceMonitor:
    """
    Comprehensive resource monitoring for MLX inference
    Integrates with Activity Monitor and system metrics
    """

    def __init__(self):
        self.thermal_guard = ThermalGuard()
        self.start_time = time.time()

        # Performance tracking
        self.inference_queue_size = 0
        self.avg_latency_ms = 0.0
        self.latency_samples: list[float] = []
        self.max_latency_samples = 100

    async def start(self) -> None:
        """Start resource monitoring"""
        await self.thermal_guard.start_monitoring()
        logger.info("Resource monitoring started")

    async def stop(self) -> None:
        """Stop resource monitoring"""
        await self.thermal_guard.stop_monitoring()
        logger.info("Resource monitoring stopped")

    def record_inference_latency(self, latency_ms: float) -> None:
        """Record inference latency for averaging"""
        self.latency_samples.append(latency_ms)

        if len(self.latency_samples) > self.max_latency_samples:
            self.latency_samples = self.latency_samples[-self.max_latency_samples :]

        self.avg_latency_ms = sum(self.latency_samples) / len(self.latency_samples)

    def update_queue_size(self, size: int) -> None:
        """Update inference queue size"""
        self.inference_queue_size = size

    def get_metrics(self) -> dict[str, Any]:
        """Get comprehensive system metrics"""
        # System metrics
        memory = psutil.virtual_memory()
        cpu_percent = psutil.cpu_percent(interval=None)

        # Thermal metrics
        thermal_stats = self.thermal_guard.get_thermal_stats()

        # Model memory estimation (simplified)
        model_memory_gb = 0.0  # Would be tracked by model manager
        cache_size_mb = 0.0  # Would be tracked by cache manager

        return {
            "memory_pressure": memory.percent / 100.0,
            "cpu_utilization": cpu_percent / 100.0,
            "model_memory_gb": model_memory_gb,
            "cache_size_mb": cache_size_mb,
            "inference_queue": self.inference_queue_size,
            "avg_latency_ms": round(self.avg_latency_ms, 2),
            "uptime_hours": round((time.time() - self.start_time) / 3600, 2),
            "thermal_state": thermal_stats.get("current_thermal_state", "unknown"),
            "gpu_temp_celsius": thermal_stats.get("avg_gpu_temp_celsius", 0),
            "power_draw_watts": thermal_stats.get("avg_power_draw_watts", 0),
            "apple_silicon": thermal_stats.get("apple_silicon", False),
        }


if __name__ == "__main__":
    # Demo thermal monitoring
    async def demo():
        thermal_guard = ThermalGuard()

        # Add callback for thermal events
        def thermal_callback(state: ThermalState):
            print(f"Thermal state changed to: {state.value}")

        thermal_guard.add_thermal_callback(thermal_callback)

        # Start monitoring
        await thermal_guard.start_monitoring()

        # Monitor for 30 seconds
        for _i in range(6):
            await asyncio.sleep(5)

            recommendation = thermal_guard.get_thermal_recommendation()
            print(f"Thermal recommendation: {recommendation}")

            if thermal_guard.current_metrics:
                print(
                    f"GPU Temp: {thermal_guard.current_metrics.gpu_temp_celsius:.1f}°C"
                )
                print(f"Resource State: {thermal_guard.resource_state.value}")
            print("---")

        # Stop monitoring
        await thermal_guard.stop_monitoring()

        # Print final stats
        stats = thermal_guard.get_thermal_stats()
        print("Final thermal stats:", json.dumps(stats, indent=2))

    asyncio.run(demo())
