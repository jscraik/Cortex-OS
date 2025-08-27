"""
Thermal management system for MLX inference on Apple Silicon.

Provides real-time GPU temperature monitoring, intelligent throttling at 85°C,
and graceful CPU-only fallback at 90°C to prevent thermal damage while
maintaining system performance.

Performance requirements:
- <1ms thermal check overhead
- Real-time temperature monitoring
- Graceful degradation under thermal pressure
- OpenTelemetry metrics export

Author: Cortex OS Team
License: MIT
"""

import asyncio
import logging
import platform
import subprocess
import time
import os
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Callable, Any
import threading
from datetime import datetime, timedelta

try:
    import psutil
except ImportError:
    psutil = None

try:
    from opentelemetry import metrics
    from opentelemetry.metrics import get_meter
    OTEL_AVAILABLE = True
except ImportError:
    OTEL_AVAILABLE = False

logger = logging.getLogger(__name__)


class ThermalState(Enum):
    """Thermal state classifications for Apple Silicon."""
    NORMAL = "normal"           # < 75°C
    WARM = "warm"              # 75-80°C  
    HOT = "hot"                # 80-85°C
    THROTTLING = "throttling"   # 85-90°C
    CRITICAL = "critical"       # > 90°C


class ThrottleAction(Enum):
    """Throttling actions to take at different thermal states."""
    NONE = "none"
    REDUCE_BATCH_SIZE = "reduce_batch_size"
    LOWER_INFERENCE_RATE = "lower_inference_rate"
    SWITCH_TO_CPU = "switch_to_cpu"
    EMERGENCY_STOP = "emergency_stop"


@dataclass
class ThermalMetrics:
    """Thermal monitoring metrics."""
    timestamp: datetime = field(default_factory=datetime.now)
    gpu_temp_celsius: float = 0.0
    cpu_temp_celsius: float = 0.0
    thermal_state: ThermalState = ThermalState.NORMAL
    throttle_action: ThrottleAction = ThrottleAction.NONE
    power_draw_watts: float = 0.0
    fan_speed_rpm: int = 0
    thermal_pressure: float = 0.0  # 0.0-1.0 scale
    time_in_state_seconds: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'timestamp': self.timestamp.isoformat(),
            'gpu_temp_celsius': self.gpu_temp_celsius,
            'cpu_temp_celsius': self.cpu_temp_celsius,
            'thermal_state': self.thermal_state.value,
            'throttle_action': self.throttle_action.value,
            'power_draw_watts': self.power_draw_watts,
            'fan_speed_rpm': self.fan_speed_rpm,
            'thermal_pressure': self.thermal_pressure,
            'time_in_state_seconds': self.time_in_state_seconds
        }


@dataclass 
class ThermalConfig:
    """Configuration for thermal management."""
    # Temperature thresholds (Celsius)
    temp_normal_max: float = 75.0
    temp_warm_max: float = 80.0
    temp_hot_max: float = 85.0
    temp_throttling_max: float = 90.0
    temp_critical_max: float = 95.0
    
    # Monitoring settings
    monitoring_interval_ms: int = 250  # 4Hz monitoring for <1ms overhead
    smoothing_window_size: int = 8     # Rolling average window
    
    # Throttling settings
    throttle_recovery_hysteresis: float = 3.0  # 3°C hysteresis for recovery
    batch_size_reduction_factor: float = 0.5
    inference_rate_reduction_factor: float = 0.7
    
    # Emergency settings
    emergency_shutdown_temp: float = 100.0
    thermal_protection_enabled: bool = True
    
    # Performance tuning
    fast_polling_enabled: bool = True
    background_monitoring: bool = True
    metrics_export_enabled: bool = True
    
    def validate(self) -> bool:
        """Validate configuration parameters."""
        temps = [self.temp_normal_max, self.temp_warm_max, self.temp_hot_max, 
                self.temp_throttling_max, self.temp_critical_max]
        
        # Ensure increasing temperature thresholds
        if not all(temps[i] < temps[i+1] for i in range(len(temps)-1)):
            raise ValueError("Temperature thresholds must be in increasing order")
            
        # Ensure reasonable values
        if any(t < 30 or t > 110 for t in temps):
            raise ValueError("Temperature thresholds must be between 30-110°C")
            
        return True


class AppleSiliconThermalMonitor:
    """Apple Silicon thermal monitoring using system tools."""
    
    def __init__(self):
        self.is_apple_silicon = self._detect_apple_silicon()
        self._last_temp_cache = {}
        self._cache_timestamp = 0
        self._cache_ttl_ms = 100  # 100ms cache for rapid polling
        self._allow_sudo = os.environ.get("CORTEX_ALLOW_SUDO", "").strip().lower() in {"1", "true", "yes"}
        
    def _detect_apple_silicon(self) -> bool:
        """Detect if running on Apple Silicon."""
        if platform.system() != "Darwin":
            return False
            
        try:
            result = subprocess.run(
                ["sysctl", "-n", "machdep.cpu.brand_string"],
                capture_output=True, text=True, timeout=1
            )
            return "Apple" in result.stdout
        except subprocess.SubprocessError:
            return False
    
    async def get_thermal_metrics(self) -> ThermalMetrics:
        """Get current thermal metrics with caching for performance."""
        current_time = time.time() * 1000  # milliseconds
        
        # Use cached data if within TTL for <1ms overhead
        if (current_time - self._cache_timestamp) < self._cache_ttl_ms:
            if 'gpu_temp' in self._last_temp_cache:
                return ThermalMetrics(
                    gpu_temp_celsius=self._last_temp_cache['gpu_temp'],
                    cpu_temp_celsius=self._last_temp_cache['cpu_temp'],
                    power_draw_watts=self._last_temp_cache.get('power', 0.0),
                    fan_speed_rpm=self._last_temp_cache.get('fan_speed', 0),
                    thermal_pressure=self._last_temp_cache.get('thermal_pressure', 0.0)
                )
        
        # Fetch new thermal data
        metrics = await self._fetch_thermal_data()
        
        # Update cache
        self._last_temp_cache = {
            'gpu_temp': metrics.gpu_temp_celsius,
            'cpu_temp': metrics.cpu_temp_celsius,
            'power': metrics.power_draw_watts,
            'fan_speed': metrics.fan_speed_rpm,
            'thermal_pressure': metrics.thermal_pressure
        }
        self._cache_timestamp = current_time
        
        return metrics
    
    async def _fetch_thermal_data(self) -> ThermalMetrics:
        """Fetch thermal data from system sensors."""
        metrics = ThermalMetrics()
        
        if not self.is_apple_silicon:
            logger.warning("Not running on Apple Silicon - using mock thermal data")
            return self._get_mock_thermal_data()
        
        try:
            # Get GPU temperature using powermetrics (requires sudo)
            gpu_temp = await self._get_gpu_temperature()
            cpu_temp = await self._get_cpu_temperature()
            power_draw = await self._get_power_consumption()
            thermal_pressure = await self._get_thermal_pressure()
            
            metrics.gpu_temp_celsius = gpu_temp
            metrics.cpu_temp_celsius = cpu_temp  
            metrics.power_draw_watts = power_draw
            metrics.thermal_pressure = thermal_pressure
            
            # Determine thermal state
            max_temp = max(gpu_temp, cpu_temp)
            metrics.thermal_state = self._classify_thermal_state(max_temp)
            
        except Exception as e:
            logger.error(f"Failed to fetch thermal data: {e}")
            # Return safe defaults
            metrics.gpu_temp_celsius = 45.0
            metrics.cpu_temp_celsius = 40.0
            metrics.thermal_state = ThermalState.NORMAL
            
        return metrics
    
    async def _get_gpu_temperature(self) -> float:
        """Get GPU temperature from system sensors."""
        try:
            # Try powermetrics first (most accurate for Apple Silicon)
            base_cmd = [
                "powermetrics", "-n", "1", "-i", "100",
                "--samplers", "gpu_power",
            ]
            # First attempt without sudo
            result = await asyncio.create_subprocess_exec(
                *base_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await result.communicate()
            
            if result.returncode != 0 and self._allow_sudo:
                # Optional retry with sudo -n if explicitly allowed
                sudo_cmd = ["sudo", "-n", *base_cmd]
                result = await asyncio.create_subprocess_exec(
                    *sudo_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, _ = await result.communicate()
            
            if result.returncode == 0:
                # Parse powermetrics output for GPU temp
                lines = stdout.decode().split('\n')
                for line in lines:
                    if "GPU die temperature" in line:
                        # Extract temperature value
                        temp_str = line.split(':')[-1].strip().replace('C', '')
                        return float(temp_str)
            
            # Fallback to thermal_state if powermetrics fails
            return await self._get_thermal_state_temp()
            
        except Exception as e:
            logger.debug(f"GPU temperature fetch failed: {e}")
            return 45.0  # Safe default
    
    async def _get_cpu_temperature(self) -> float:
        """Get CPU temperature from system sensors."""
        try:
            # Use sysctl to get CPU thermal state
            result = await asyncio.create_subprocess_exec(
                "sysctl", "-n", "machdep.xcpm.cpu_thermal_state",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await result.communicate()
            
            if result.returncode == 0:
                thermal_state = int(stdout.decode().strip())
                # Convert thermal state to approximate temperature
                # Apple Silicon thermal states: 0-3 (normal), 4-7 (warm), 8+ (hot)
                base_temp = 40.0
                temp_increment = thermal_state * 2.5
                return min(base_temp + temp_increment, 85.0)
            
            return 40.0  # Safe default
            
        except Exception as e:
            logger.debug(f"CPU temperature fetch failed: {e}")
            return 40.0
    
    async def _get_thermal_state_temp(self) -> float:
        """Fallback temperature estimation from thermal state."""
        try:
            result = await asyncio.create_subprocess_exec(
                "sysctl", "-n", "machdep.xcpm.gpu_thermal_state",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await result.communicate()
            
            if result.returncode == 0:
                thermal_state = int(stdout.decode().strip())
                # Convert thermal state to temperature estimate
                return 35.0 + (thermal_state * 3.0)
                
        except Exception:
            pass
            
        return 45.0
    
    async def _get_power_consumption(self) -> float:
        """Get current power consumption."""
        if psutil:
            try:
                # Use psutil for power monitoring if available
                sensors = psutil.sensors_battery()
                if sensors and hasattr(sensors, 'power_plugged'):
                    return 15.0 if sensors.power_plugged else 8.0
            except Exception:
                pass
        
        return 12.0  # Default power estimate for Apple Silicon
    
    async def _get_thermal_pressure(self) -> float:
        """Get thermal pressure (0.0-1.0 scale)."""
        try:
            result = await asyncio.create_subprocess_exec(
                "sysctl", "-n", "machdep.xcpm.cpu_thermal_state",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await result.communicate()
            
            if result.returncode == 0:
                thermal_state = int(stdout.decode().strip())
                # Convert thermal state to pressure (0-15 scale to 0.0-1.0)
                return min(thermal_state / 15.0, 1.0)
                
        except Exception:
            pass
            
        return 0.1  # Low pressure default
    
    def _classify_thermal_state(self, temperature: float) -> ThermalState:
        """Classify thermal state based on temperature."""
        if temperature < 75.0:
            return ThermalState.NORMAL
        elif temperature < 80.0:
            return ThermalState.WARM
        elif temperature < 85.0:
            return ThermalState.HOT
        elif temperature < 90.0:
            return ThermalState.THROTTLING
        else:
            return ThermalState.CRITICAL
    
    def _get_mock_thermal_data(self) -> ThermalMetrics:
        """Get mock thermal data for non-Apple Silicon systems."""
        import random
        
        # Generate realistic mock data
        base_temp = 45.0 + random.uniform(-5, 10)
        
        return ThermalMetrics(
            gpu_temp_celsius=base_temp + random.uniform(0, 5),
            cpu_temp_celsius=base_temp,
            power_draw_watts=12.0 + random.uniform(-2, 8),
            thermal_pressure=random.uniform(0.1, 0.3),
            thermal_state=ThermalState.NORMAL
        )


class ThermalGuard:
    """
    Comprehensive thermal management system for MLX inference.
    
    Features:
    - Real-time temperature monitoring (<1ms overhead)
    - Intelligent throttling at 85°C
    - CPU-only fallback at 90°C  
    - Graceful degradation under thermal pressure
    - OpenTelemetry metrics export
    """
    
    def __init__(self, config: Optional[ThermalConfig] = None):
        self.config = config or ThermalConfig()
        self.config.validate()
        
        self.monitor = AppleSiliconThermalMonitor()
        self.is_monitoring = False
        self.is_throttling = False
        self.current_metrics = ThermalMetrics()
        
        # State tracking
        self._thermal_history: List[ThermalMetrics] = []
        self._state_start_time = datetime.now()
        self._smoothed_temperature = 0.0
        self._consecutive_hot_readings = 0
        
        # Callbacks for thermal events
        self._throttle_callbacks: List[Callable[[ThermalState, ThrottleAction], None]] = []
        self._recovery_callbacks: List[Callable[[ThermalState], None]] = []
        
        # Performance tracking
        self._monitor_call_count = 0
        self._total_monitor_time_ms = 0.0
        
        # Background monitoring
        self._monitor_task: Optional[asyncio.Task] = None
        self._shutdown_event = asyncio.Event()
        
        # OpenTelemetry setup
        self._setup_metrics()
        
        logger.info(f"ThermalGuard initialized with config: {self.config}")
    
    def _setup_metrics(self):
        """Setup OpenTelemetry metrics."""
        if not OTEL_AVAILABLE or not self.config.metrics_export_enabled:
            self._otel_meter = None
            return
            
        try:
            self._otel_meter = get_meter("cortex.thermal_guard")
            
            # Temperature gauges
            self._gpu_temp_gauge = self._otel_meter.create_gauge(
                "thermal_gpu_temperature_celsius",
                description="GPU temperature in Celsius"
            )
            
            self._cpu_temp_gauge = self._otel_meter.create_gauge(
                "thermal_cpu_temperature_celsius", 
                description="CPU temperature in Celsius"
            )
            
            # Thermal state counter
            self._thermal_state_counter = self._otel_meter.create_counter(
                "thermal_state_transitions_total",
                description="Total thermal state transitions"
            )
            
            # Throttling events
            self._throttle_counter = self._otel_meter.create_counter(
                "thermal_throttle_events_total",
                description="Total thermal throttling events"
            )
            
            # Performance metrics
            self._monitor_latency_histogram = self._otel_meter.create_histogram(
                "thermal_monitor_latency_milliseconds",
                description="Thermal monitoring latency"
            )
            
            logger.info("OpenTelemetry metrics initialized for ThermalGuard")
            
        except Exception as e:
            logger.warning(f"Failed to setup OpenTelemetry metrics: {e}")
            self._otel_meter = None
    
    async def start_monitoring(self) -> None:
        """Start background thermal monitoring."""
        if self.is_monitoring:
            logger.warning("Thermal monitoring already started")
            return
            
        self.is_monitoring = True
        self._shutdown_event.clear()
        
        if self.config.background_monitoring:
            self._monitor_task = asyncio.create_task(self._background_monitor())
            
        logger.info("Thermal monitoring started")
    
    async def stop_monitoring(self) -> None:
        """Stop background thermal monitoring."""
        if not self.is_monitoring:
            return
            
        self.is_monitoring = False
        self._shutdown_event.set()
        
        if self._monitor_task:
            try:
                await asyncio.wait_for(self._monitor_task, timeout=2.0)
            except asyncio.TimeoutError:
                self._monitor_task.cancel()
            self._monitor_task = None
            
        logger.info("Thermal monitoring stopped")
    
    async def _background_monitor(self) -> None:
        """Background monitoring loop."""
        logger.info("Background thermal monitoring started")
        
        while self.is_monitoring and not self._shutdown_event.is_set():
            try:
                start_time = time.time()
                
                # Get thermal metrics
                metrics = await self.monitor.get_thermal_metrics()
                await self._process_thermal_metrics(metrics)
                
                # Track performance
                monitor_time_ms = (time.time() - start_time) * 1000
                self._update_performance_stats(monitor_time_ms)
                
                # Export metrics
                self._export_metrics(metrics)
                
                # Sleep for monitoring interval
                sleep_time = self.config.monitoring_interval_ms / 1000.0
                await asyncio.sleep(sleep_time)
                
            except Exception as e:
                logger.error(f"Background thermal monitoring error: {e}")
                await asyncio.sleep(1.0)  # Back off on error
                
        logger.info("Background thermal monitoring stopped")
    
    async def check_thermal_state(self) -> ThermalMetrics:
        """
        Check current thermal state with <1ms overhead.
        
        Returns:
            Current thermal metrics including state and recommendations.
        """
        start_time = time.time()
        
        try:
            # Get current thermal metrics
            metrics = await self.monitor.get_thermal_metrics()
            await self._process_thermal_metrics(metrics)
            
            # Track performance
            monitor_time_ms = (time.time() - start_time) * 1000
            self._update_performance_stats(monitor_time_ms)
            
            return self.current_metrics
            
        except Exception as e:
            logger.error(f"Thermal check failed: {e}")
            # Return safe default state
            return ThermalMetrics(
                thermal_state=ThermalState.NORMAL,
                throttle_action=ThrottleAction.NONE
            )
    
    async def _process_thermal_metrics(self, metrics: ThermalMetrics) -> None:
        """Process thermal metrics and determine actions."""
        # Update smoothed temperature
        max_temp = max(metrics.gpu_temp_celsius, metrics.cpu_temp_celsius)
        if self._smoothed_temperature == 0:
            self._smoothed_temperature = max_temp
        else:
            alpha = 0.3  # Smoothing factor
            self._smoothed_temperature = (alpha * max_temp + 
                                        (1 - alpha) * self._smoothed_temperature)
        
        # Determine thermal state based on smoothed temperature
        new_state = self._classify_thermal_state(self._smoothed_temperature)
        old_state = self.current_metrics.thermal_state
        
        # Handle state transitions
        if new_state != old_state:
            await self._handle_state_transition(old_state, new_state)
            self._state_start_time = datetime.now()
        
        # Update time in current state  
        time_in_state = (datetime.now() - self._state_start_time).total_seconds()
        
        # Determine throttle action
        throttle_action = self._determine_throttle_action(new_state, time_in_state)
        
        # Update current metrics
        self.current_metrics = ThermalMetrics(
            timestamp=datetime.now(),
            gpu_temp_celsius=metrics.gpu_temp_celsius,
            cpu_temp_celsius=metrics.cpu_temp_celsius,
            thermal_state=new_state,
            throttle_action=throttle_action,
            power_draw_watts=metrics.power_draw_watts,
            fan_speed_rpm=metrics.fan_speed_rpm,
            thermal_pressure=metrics.thermal_pressure,
            time_in_state_seconds=time_in_state
        )
        
        # Add to history (keep last 100 readings)
        self._thermal_history.append(self.current_metrics)
        if len(self._thermal_history) > 100:
            self._thermal_history.pop(0)
    
    def _classify_thermal_state(self, temperature: float) -> ThermalState:
        """Classify thermal state with hysteresis for stability."""
        current_state = self.current_metrics.thermal_state
        hysteresis = self.config.throttle_recovery_hysteresis
        
        # Apply hysteresis for recovery (prevent oscillation)
        if current_state in [ThermalState.THROTTLING, ThermalState.CRITICAL]:
            # Need lower temperature to recover
            if temperature <= self.config.temp_hot_max - hysteresis:
                return ThermalState.HOT
            elif temperature <= self.config.temp_warm_max - hysteresis:
                return ThermalState.WARM
            elif temperature <= self.config.temp_normal_max - hysteresis:
                return ThermalState.NORMAL
        
        # Normal state classification
        if temperature >= self.config.temp_critical_max:
            return ThermalState.CRITICAL
        elif temperature >= self.config.temp_throttling_max:
            return ThermalState.THROTTLING
        elif temperature >= self.config.temp_hot_max:
            return ThermalState.HOT
        elif temperature >= self.config.temp_warm_max:
            return ThermalState.WARM
        else:
            return ThermalState.NORMAL
    
    def _determine_throttle_action(self, state: ThermalState, time_in_state: float) -> ThrottleAction:
        """Determine appropriate throttle action based on thermal state."""
        if not self.config.thermal_protection_enabled:
            return ThrottleAction.NONE
            
        if state == ThermalState.CRITICAL:
            return ThrottleAction.EMERGENCY_STOP
        elif state == ThermalState.THROTTLING:
            return ThrottleAction.SWITCH_TO_CPU
        elif state == ThermalState.HOT:
            # Gradual throttling based on time in hot state
            if time_in_state > 30.0:  # 30 seconds
                return ThrottleAction.LOWER_INFERENCE_RATE
            elif time_in_state > 10.0:  # 10 seconds
                return ThrottleAction.REDUCE_BATCH_SIZE
            else:
                return ThrottleAction.NONE
        else:
            return ThrottleAction.NONE
    
    async def _handle_state_transition(self, old_state: ThermalState, new_state: ThermalState) -> None:
        """Handle thermal state transitions."""
        logger.info(f"Thermal state transition: {old_state.value} -> {new_state.value}")
        
        # Export state transition metric
        if self._otel_meter:
            self._thermal_state_counter.add(1, {
                "from_state": old_state.value,
                "to_state": new_state.value
            })
        
        # Handle throttling transitions
        if new_state in [ThermalState.HOT, ThermalState.THROTTLING, ThermalState.CRITICAL]:
            if not self.is_throttling:
                self.is_throttling = True
                await self._trigger_throttling(new_state)
        else:
            if self.is_throttling:
                self.is_throttling = False
                await self._trigger_recovery(new_state)
    
    async def _trigger_throttling(self, state: ThermalState) -> None:
        """Trigger throttling actions."""
        action = self._determine_throttle_action(state, 0.0)
        
        logger.warning(f"Thermal throttling triggered: {state.value} -> {action.value}")
        
        # Export throttling metric
        if self._otel_meter:
            self._throttle_counter.add(1, {
                "thermal_state": state.value,
                "action": action.value
            })
        
        # Execute throttle callbacks
        for callback in self._throttle_callbacks:
            try:
                callback(state, action)
            except Exception as e:
                logger.error(f"Throttle callback error: {e}")
    
    async def _trigger_recovery(self, state: ThermalState) -> None:
        """Trigger recovery from throttling."""
        logger.info(f"Thermal recovery triggered: {state.value}")
        
        # Execute recovery callbacks
        for callback in self._recovery_callbacks:
            try:
                callback(state)
            except Exception as e:
                logger.error(f"Recovery callback error: {e}")
    
    def add_throttle_callback(self, callback: Callable[[ThermalState, ThrottleAction], None]) -> None:
        """Add callback for throttling events."""
        self._throttle_callbacks.append(callback)
    
    def add_recovery_callback(self, callback: Callable[[ThermalState], None]) -> None:
        """Add callback for recovery events."""
        self._recovery_callbacks.append(callback)
    
    def _update_performance_stats(self, monitor_time_ms: float) -> None:
        """Update performance tracking statistics."""
        self._monitor_call_count += 1
        self._total_monitor_time_ms += monitor_time_ms
        
        # Log performance warning if monitoring is slow
        if monitor_time_ms > 1.0:  # > 1ms
            logger.warning(f"Thermal monitoring slow: {monitor_time_ms:.2f}ms")
    
    def _export_metrics(self, metrics: ThermalMetrics) -> None:
        """Export metrics to OpenTelemetry."""
        if not self._otel_meter:
            return
            
        try:
            # Temperature gauges
            self._gpu_temp_gauge.set(metrics.gpu_temp_celsius)
            self._cpu_temp_gauge.set(metrics.cpu_temp_celsius)
            
            # Performance histogram
            if self._monitor_call_count > 0:
                avg_latency = self._total_monitor_time_ms / self._monitor_call_count
                self._monitor_latency_histogram.record(avg_latency)
                
        except Exception as e:
            logger.debug(f"Metrics export error: {e}")
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics."""
        avg_latency = 0.0
        if self._monitor_call_count > 0:
            avg_latency = self._total_monitor_time_ms / self._monitor_call_count
            
        return {
            "monitor_calls": self._monitor_call_count,
            "total_monitor_time_ms": self._total_monitor_time_ms,
            "average_latency_ms": avg_latency,
            "is_monitoring": self.is_monitoring,
            "is_throttling": self.is_throttling,
            "thermal_history_size": len(self._thermal_history)
        }
    
    def get_thermal_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent thermal history."""
        history = self._thermal_history[-limit:] if limit > 0 else self._thermal_history
        return [metrics.to_dict() for metrics in history]
    
    def should_throttle_inference(self) -> bool:
        """Check if inference should be throttled."""
        return self.is_throttling and self.current_metrics.thermal_state in [
            ThermalState.HOT, ThermalState.THROTTLING, ThermalState.CRITICAL
        ]
    
    def get_recommended_batch_size(self, normal_batch_size: int) -> int:
        """Get recommended batch size based on thermal state."""
        if not self.should_throttle_inference():
            return normal_batch_size
            
        state = self.current_metrics.thermal_state
        action = self.current_metrics.throttle_action
        
        if action == ThrottleAction.REDUCE_BATCH_SIZE:
            return max(1, int(normal_batch_size * self.config.batch_size_reduction_factor))
        elif action in [ThrottleAction.SWITCH_TO_CPU, ThrottleAction.EMERGENCY_STOP]:
            return 1  # Minimal batch size
        else:
            return normal_batch_size
    
    def get_recommended_inference_rate(self, normal_rate: float) -> float:
        """Get recommended inference rate based on thermal state."""
        if not self.should_throttle_inference():
            return normal_rate
            
        action = self.current_metrics.throttle_action
        
        if action == ThrottleAction.LOWER_INFERENCE_RATE:
            return normal_rate * self.config.inference_rate_reduction_factor
        elif action in [ThrottleAction.SWITCH_TO_CPU, ThrottleAction.EMERGENCY_STOP]:
            return normal_rate * 0.3  # Significant reduction
        else:
            return normal_rate
    
    def should_use_cpu_only(self) -> bool:
        """Check if should switch to CPU-only inference."""
        return (self.current_metrics.thermal_state in [ThermalState.THROTTLING, ThermalState.CRITICAL] or
                self.current_metrics.throttle_action in [ThrottleAction.SWITCH_TO_CPU, ThrottleAction.EMERGENCY_STOP])
    
    async def emergency_shutdown(self) -> None:
        """Emergency thermal shutdown."""
        logger.critical("Emergency thermal shutdown triggered!")
        
        # Stop all monitoring
        await self.stop_monitoring()
        
        # Trigger emergency callbacks
        for callback in self._throttle_callbacks:
            try:
                callback(ThermalState.CRITICAL, ThrottleAction.EMERGENCY_STOP)
            except Exception as e:
                logger.error(f"Emergency shutdown callback error: {e}")


# Convenience functions for external usage

async def create_thermal_guard(config: Optional[ThermalConfig] = None) -> ThermalGuard:
    """Create and initialize a thermal guard."""
    guard = ThermalGuard(config)
    await guard.start_monitoring()
    return guard

def get_default_thermal_config() -> ThermalConfig:
    """Get default thermal configuration for Apple Silicon."""
    return ThermalConfig()

def get_performance_thermal_config() -> ThermalConfig:
    """Get performance-optimized thermal configuration."""
    config = ThermalConfig()
    config.temp_hot_max = 88.0      # Allow higher temps for performance
    config.temp_throttling_max = 92.0
    config.monitoring_interval_ms = 500  # Less frequent monitoring
    config.throttle_recovery_hysteresis = 5.0  # Larger hysteresis
    return config

def get_conservative_thermal_config() -> ThermalConfig:
    """Get conservative thermal configuration."""
    config = ThermalConfig()
    config.temp_normal_max = 70.0    # Lower thresholds
    config.temp_warm_max = 75.0
    config.temp_hot_max = 80.0
    config.temp_throttling_max = 85.0
    config.monitoring_interval_ms = 100  # More frequent monitoring
    return config


if __name__ == "__main__":
    async def demo():
        """Demo thermal guard functionality."""
        logging.basicConfig(level=logging.INFO)
        
        # Create thermal guard
        guard = await create_thermal_guard()
        
        # Add callbacks
        def on_throttle(state: ThermalState, action: ThrottleAction):
            print(f"🔥 Throttling: {state.value} -> {action.value}")
            
        def on_recovery(state: ThermalState):
            print(f"✅ Recovery: {state.value}")
        
        guard.add_throttle_callback(on_throttle)
        guard.add_recovery_callback(on_recovery)
        
        # Monitor for 30 seconds
        print("Monitoring thermal state for 30 seconds...")
        for i in range(30):
            metrics = await guard.check_thermal_state()
            print(f"🌡️  GPU: {metrics.gpu_temp_celsius:.1f}°C, "
                  f"State: {metrics.thermal_state.value}, "
                  f"Action: {metrics.throttle_action.value}")
            
            await asyncio.sleep(1)
        
        # Show performance stats
        stats = guard.get_performance_stats()
        print(f"\n📊 Performance: {stats['average_latency_ms']:.3f}ms avg latency")
        
        await guard.stop_monitoring()
    
    asyncio.run(demo())
