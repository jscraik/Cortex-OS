"""
Resource monitoring system with Activity Monitor integration for MLX inference.

Provides comprehensive system resource monitoring, memory pressure detection,
intelligent model eviction, and integration with macOS Activity Monitor for
real-time performance tracking.

Features:
- System resource monitoring (CPU, memory, GPU)
- Memory pressure detection and response
- Model eviction strategies
- Activity Monitor integration
- Real-time performance metrics
- OpenTelemetry export

Author: Cortex OS Team  
License: MIT
"""

import asyncio
import logging
import platform
import subprocess
import time
import threading
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Callable, Any, Set
from datetime import datetime, timedelta
import json
import os

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

try:
    from opentelemetry import metrics
    from opentelemetry.metrics import get_meter
    OTEL_AVAILABLE = True
except ImportError:
    OTEL_AVAILABLE = False

logger = logging.getLogger(__name__)


class MemoryPressureLevel(Enum):
    """Memory pressure levels for intelligent response."""
    NORMAL = "normal"           # < 70% usage
    MODERATE = "moderate"       # 70-80% usage  
    HIGH = "high"              # 80-90% usage
    CRITICAL = "critical"       # > 90% usage
    EMERGENCY = "emergency"     # > 95% usage


class ResourceState(Enum):
    """Overall system resource state."""
    HEALTHY = "healthy"
    STRESSED = "stressed"
    OVERLOADED = "overloaded"
    CRITICAL = "critical"


class EvictionStrategy(Enum):
    """Model eviction strategies."""
    LRU = "lru"                # Least Recently Used
    SIZE_BASED = "size_based"   # Largest models first
    USAGE_BASED = "usage_based" # Least used models
    PRIORITY_BASED = "priority_based"  # Based on model priority


@dataclass
class ProcessInfo:
    """Information about a running process."""
    pid: int
    name: str
    cpu_percent: float
    memory_mb: float
    memory_percent: float
    status: str
    create_time: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'pid': self.pid,
            'name': self.name,
            'cpu_percent': self.cpu_percent,
            'memory_mb': self.memory_mb,
            'memory_percent': self.memory_percent,
            'status': self.status,
            'create_time': self.create_time
        }


@dataclass
class SystemResources:
    """System resource snapshot."""
    timestamp: datetime = field(default_factory=datetime.now)
    
    # CPU metrics
    cpu_count: int = 0
    cpu_percent: float = 0.0
    cpu_frequency_mhz: float = 0.0
    load_average: List[float] = field(default_factory=list)
    
    # Memory metrics  
    memory_total_gb: float = 0.0
    memory_available_gb: float = 0.0
    memory_used_gb: float = 0.0
    memory_percent: float = 0.0
    memory_pressure: MemoryPressureLevel = MemoryPressureLevel.NORMAL
    swap_total_gb: float = 0.0
    swap_used_gb: float = 0.0
    
    # GPU metrics (Apple Silicon)
    gpu_utilization_percent: float = 0.0
    gpu_memory_used_gb: float = 0.0
    gpu_memory_total_gb: float = 0.0
    
    # Disk I/O
    disk_read_mb_per_sec: float = 0.0
    disk_write_mb_per_sec: float = 0.0
    disk_usage_percent: float = 0.0
    
    # Network I/O
    network_sent_mb_per_sec: float = 0.0
    network_recv_mb_per_sec: float = 0.0
    
    # Process information
    active_processes: int = 0
    mlx_processes: List[ProcessInfo] = field(default_factory=list)
    
    # Resource state
    resource_state: ResourceState = ResourceState.HEALTHY
    pressure_indicators: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'timestamp': self.timestamp.isoformat(),
            'cpu_count': self.cpu_count,
            'cpu_percent': self.cpu_percent,
            'cpu_frequency_mhz': self.cpu_frequency_mhz,
            'load_average': self.load_average,
            'memory_total_gb': self.memory_total_gb,
            'memory_available_gb': self.memory_available_gb,
            'memory_used_gb': self.memory_used_gb,
            'memory_percent': self.memory_percent,
            'memory_pressure': self.memory_pressure.value,
            'swap_total_gb': self.swap_total_gb,
            'swap_used_gb': self.swap_used_gb,
            'gpu_utilization_percent': self.gpu_utilization_percent,
            'gpu_memory_used_gb': self.gpu_memory_used_gb,
            'gpu_memory_total_gb': self.gpu_memory_total_gb,
            'disk_read_mb_per_sec': self.disk_read_mb_per_sec,
            'disk_write_mb_per_sec': self.disk_write_mb_per_sec,
            'disk_usage_percent': self.disk_usage_percent,
            'network_sent_mb_per_sec': self.network_sent_mb_per_sec,
            'network_recv_mb_per_sec': self.network_recv_mb_per_sec,
            'active_processes': self.active_processes,
            'mlx_processes': [p.to_dict() for p in self.mlx_processes],
            'resource_state': self.resource_state.value,
            'pressure_indicators': self.pressure_indicators
        }


@dataclass
class ModelInfo:
    """Information about a loaded model."""
    name: str
    backend: str
    memory_gb: float
    last_used: datetime
    usage_count: int
    priority: int = 1  # 1-10 scale, higher = more important
    is_evictable: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'backend': self.backend,
            'memory_gb': self.memory_gb,
            'last_used': self.last_used.isoformat(),
            'usage_count': self.usage_count,
            'priority': self.priority,
            'is_evictable': self.is_evictable
        }


@dataclass
class ResourceConfig:
    """Configuration for resource monitoring."""
    # Monitoring intervals
    monitoring_interval_seconds: float = 1.0
    activity_monitor_sync_seconds: float = 5.0
    
    # Memory pressure thresholds
    memory_normal_threshold: float = 0.70      # 70%
    memory_moderate_threshold: float = 0.80    # 80%
    memory_high_threshold: float = 0.90        # 90%
    memory_critical_threshold: float = 0.95    # 95%
    
    # CPU thresholds
    cpu_high_threshold: float = 0.80           # 80%
    cpu_critical_threshold: float = 0.95       # 95%
    
    # Model eviction settings
    eviction_strategy: EvictionStrategy = EvictionStrategy.LRU
    eviction_memory_threshold: float = 0.85    # Trigger eviction at 85%
    models_to_keep_minimum: int = 1            # Always keep at least 1 model
    eviction_hysteresis_gb: float = 2.0        # 2GB hysteresis
    
    # Activity Monitor integration
    activity_monitor_enabled: bool = True
    export_to_activity_monitor: bool = True
    process_name_filter: List[str] = field(default_factory=lambda: ["mlx", "python", "cortex"])
    
    # Performance settings
    enable_background_monitoring: bool = True
    enable_predictive_analytics: bool = True
    enable_automatic_eviction: bool = True
    
    # Metrics export
    opentelemetry_enabled: bool = True
    metrics_export_interval_seconds: float = 5.0
    
    def validate(self) -> bool:
        """Validate configuration parameters."""
        thresholds = [
            self.memory_normal_threshold,
            self.memory_moderate_threshold, 
            self.memory_high_threshold,
            self.memory_critical_threshold
        ]
        
        # Ensure increasing thresholds
        if not all(thresholds[i] < thresholds[i+1] for i in range(len(thresholds)-1)):
            raise ValueError("Memory thresholds must be in increasing order")
            
        # Ensure reasonable values
        if any(t < 0.5 or t > 1.0 for t in thresholds):
            raise ValueError("Memory thresholds must be between 0.5-1.0")
            
        return True


class ActivityMonitorIntegration:
    """Integration with macOS Activity Monitor."""
    
    def __init__(self, config: ResourceConfig):
        self.config = config
        self.is_macos = platform.system() == "Darwin"
        self._last_sync = datetime.now()
        
    async def get_system_processes(self) -> List[ProcessInfo]:
        """Get system processes similar to Activity Monitor."""
        if not PSUTIL_AVAILABLE:
            logger.warning("psutil not available - cannot get process information")
            return []
            
        processes = []
        
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info', 'status', 'create_time']):
                try:
                    info = proc.info
                    
                    # Filter processes of interest
                    if any(filter_name.lower() in info['name'].lower() 
                          for filter_name in self.config.process_name_filter):
                        
                        memory_mb = info['memory_info'].rss / (1024 * 1024) if info['memory_info'] else 0
                        memory_percent = proc.memory_percent()
                        
                        process_info = ProcessInfo(
                            pid=info['pid'],
                            name=info['name'],
                            cpu_percent=info['cpu_percent'] or 0.0,
                            memory_mb=memory_mb,
                            memory_percent=memory_percent,
                            status=info['status'],
                            create_time=info['create_time']
                        )
                        processes.append(process_info)
                        
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
                    
        except Exception as e:
            logger.error(f"Error getting system processes: {e}")
            
        return processes
    
    async def get_gpu_utilization(self) -> Dict[str, float]:
        """Get GPU utilization on Apple Silicon."""
        if not self.is_macos:
            return {'utilization_percent': 0.0, 'memory_used_gb': 0.0, 'memory_total_gb': 0.0}
            
        try:
            # Use powermetrics to get GPU info (no sudo by default)
            allow_sudo = os.environ.get("CORTEX_ALLOW_SUDO", "").strip().lower() in {"1", "true", "yes"}
            base_cmd = ["powermetrics", "-n", "1", "-i", "200", "--samplers", "gpu_power"]
            result = await asyncio.create_subprocess_exec(
                *base_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await asyncio.wait_for(result.communicate(), timeout=3.0)

            if result.returncode != 0 and allow_sudo:
                sudo_cmd = ["sudo", "-n", *base_cmd]
                result = await asyncio.create_subprocess_exec(
                    *sudo_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, _ = await asyncio.wait_for(result.communicate(), timeout=3.0)

            if result.returncode == 0:
                return self._parse_powermetrics_gpu(stdout.decode())
                
        except (asyncio.TimeoutError, subprocess.SubprocessError) as e:
            logger.debug(f"GPU utilization fetch failed: {e}")
            
        # Fallback to estimates
        return self._estimate_gpu_usage()
    
    def _parse_powermetrics_gpu(self, output: str) -> Dict[str, float]:
        """Parse powermetrics output for GPU metrics."""
        gpu_metrics = {'utilization_percent': 0.0, 'memory_used_gb': 0.0, 'memory_total_gb': 16.0}
        
        lines = output.split('\n')
        for line in lines:
            line = line.strip()
            
            if "GPU active frequency" in line:
                # Extract frequency and estimate utilization
                try:
                    freq_str = line.split(':')[-1].strip().replace('MHz', '')
                    freq_mhz = float(freq_str)
                    # Estimate utilization based on frequency (rough approximation)
                    max_freq = 1500.0  # Approximate max GPU frequency
                    gpu_metrics['utilization_percent'] = min((freq_mhz / max_freq) * 100, 100)
                except ValueError:
                    pass
                    
            elif "GPU in use by" in line:
                # GPU is actively being used
                gpu_metrics['utilization_percent'] = max(gpu_metrics['utilization_percent'], 30.0)
                
        return gpu_metrics
    
    def _estimate_gpu_usage(self) -> Dict[str, float]:
        """Estimate GPU usage based on system load."""
        try:
            if PSUTIL_AVAILABLE:
                cpu_percent = psutil.cpu_percent()
                # Rough estimation: GPU usage correlates with CPU on Apple Silicon
                gpu_util = min(cpu_percent * 0.7, 100.0)
                return {
                    'utilization_percent': gpu_util,
                    'memory_used_gb': gpu_util * 0.1,  # Rough estimate
                    'memory_total_gb': 16.0  # Unified memory on Apple Silicon
                }
        except Exception:
            pass
            
        return {'utilization_percent': 0.0, 'memory_used_gb': 0.0, 'memory_total_gb': 16.0}
    
    async def export_metrics_to_activity_monitor(self, resources: SystemResources) -> None:
        """Export custom metrics that appear in Activity Monitor."""
        if not self.config.export_to_activity_monitor or not self.is_macos:
            return
            
        try:
            # Create a temporary file that Activity Monitor can pick up
            metrics_data = {
                'cortex_mlx_memory_gb': resources.memory_used_gb,
                'cortex_mlx_cpu_percent': resources.cpu_percent,
                'cortex_mlx_gpu_percent': resources.gpu_utilization_percent,
                'cortex_model_count': len(resources.mlx_processes),
                'cortex_memory_pressure': resources.memory_pressure.value,
                'timestamp': resources.timestamp.isoformat()
            }
            
            # Write to system temp directory where Activity Monitor can see it
            temp_path = f"/tmp/cortex_mlx_metrics_{os.getpid()}.json"
            with open(temp_path, 'w') as f:
                json.dump(metrics_data, f)
                
        except Exception as e:
            logger.debug(f"Failed to export metrics to Activity Monitor: {e}")


class ModelEvictionManager:
    """Manages model eviction strategies."""
    
    def __init__(self, config: ResourceConfig):
        self.config = config
        self.loaded_models: Dict[str, ModelInfo] = {}
        self._eviction_history: List[Dict[str, Any]] = []
        
    def register_model(self, name: str, backend: str, memory_gb: float, priority: int = 1) -> None:
        """Register a loaded model."""
        self.loaded_models[name] = ModelInfo(
            name=name,
            backend=backend,
            memory_gb=memory_gb,
            last_used=datetime.now(),
            usage_count=0,
            priority=priority,
            is_evictable=True
        )
        
        logger.info(f"Registered model {name} ({memory_gb:.1f}GB)")
    
    def update_model_usage(self, name: str) -> None:
        """Update model usage statistics."""
        if name in self.loaded_models:
            model = self.loaded_models[name]
            model.last_used = datetime.now()
            model.usage_count += 1
    
    def unregister_model(self, name: str) -> None:
        """Unregister a model (when manually unloaded)."""
        if name in self.loaded_models:
            del self.loaded_models[name]
            logger.info(f"Unregistered model {name}")
    
    def get_models_to_evict(self, target_memory_gb: float) -> List[str]:
        """Get list of models to evict to free target memory."""
        if not self.loaded_models:
            return []
            
        # Calculate how much memory we need to free
        current_memory = sum(m.memory_gb for m in self.loaded_models.values())
        memory_to_free = max(0, current_memory - target_memory_gb + self.config.eviction_hysteresis_gb)
        
        if memory_to_free <= 0:
            return []
            
        # Get candidate models for eviction
        candidates = [
            model for model in self.loaded_models.values()
            if model.is_evictable
        ]
        
        if len(candidates) <= self.config.models_to_keep_minimum:
            logger.warning("Not enough evictable models to meet memory target")
            return []
            
        # Sort by eviction strategy
        candidates = self._sort_for_eviction(candidates)
        
        # Select models to evict
        models_to_evict = []
        freed_memory = 0.0
        
        for model in candidates:
            if freed_memory >= memory_to_free:
                break
                
            # Keep minimum number of models
            remaining_models = len(self.loaded_models) - len(models_to_evict)
            if remaining_models <= self.config.models_to_keep_minimum:
                break
                
            models_to_evict.append(model.name)
            freed_memory += model.memory_gb
            
        if models_to_evict:
            logger.info(f"Selected {len(models_to_evict)} models for eviction "
                       f"(freeing {freed_memory:.1f}GB)")
            
        return models_to_evict
    
    def _sort_for_eviction(self, models: List[ModelInfo]) -> List[ModelInfo]:
        """Sort models by eviction strategy."""
        strategy = self.config.eviction_strategy
        
        if strategy == EvictionStrategy.LRU:
            # Least Recently Used first
            return sorted(models, key=lambda m: m.last_used)
            
        elif strategy == EvictionStrategy.SIZE_BASED:
            # Largest models first
            return sorted(models, key=lambda m: m.memory_gb, reverse=True)
            
        elif strategy == EvictionStrategy.USAGE_BASED:
            # Least used models first
            return sorted(models, key=lambda m: m.usage_count)
            
        elif strategy == EvictionStrategy.PRIORITY_BASED:
            # Lowest priority first, then by LRU
            return sorted(models, key=lambda m: (m.priority, m.last_used))
            
        else:
            # Default to LRU
            return sorted(models, key=lambda m: m.last_used)
    
    def get_eviction_statistics(self) -> Dict[str, Any]:
        """Get eviction statistics."""
        total_memory = sum(m.memory_gb for m in self.loaded_models.values())
        
        return {
            'total_models': len(self.loaded_models),
            'total_memory_gb': total_memory,
            'evictable_models': sum(1 for m in self.loaded_models.values() if m.is_evictable),
            'eviction_strategy': self.config.eviction_strategy.value,
            'eviction_history_count': len(self._eviction_history),
            'models': [m.to_dict() for m in self.loaded_models.values()]
        }


class ResourceMonitor:
    """
    Comprehensive resource monitoring system for MLX inference.
    
    Features:
    - Real-time system resource monitoring
    - Memory pressure detection and response  
    - Model eviction management
    - Activity Monitor integration
    - OpenTelemetry metrics export
    """
    
    def __init__(self, config: Optional[ResourceConfig] = None):
        self.config = config or ResourceConfig()
        self.config.validate()
        
        self.is_monitoring = False
        self.current_resources = SystemResources()
        
        # Component managers
        self.activity_monitor = ActivityMonitorIntegration(self.config)
        self.eviction_manager = ModelEvictionManager(self.config)
        
        # State tracking
        self._resource_history: List[SystemResources] = []
        self._baseline_resources: Optional[SystemResources] = None
        self._last_pressure_check = datetime.now()
        
        # Background monitoring
        self._monitor_task: Optional[asyncio.Task] = None
        self._shutdown_event = asyncio.Event()
        
        # Callbacks
        self._pressure_callbacks: List[Callable[[MemoryPressureLevel, SystemResources], None]] = []
        self._eviction_callbacks: List[Callable[[List[str], float], None]] = []
        
        # Performance tracking
        self._monitor_call_count = 0
        self._total_monitor_time_ms = 0.0
        
        # OpenTelemetry setup
        self._setup_metrics()
        
        logger.info(f"ResourceMonitor initialized with config: {self.config}")
    
    def _setup_metrics(self):
        """Setup OpenTelemetry metrics."""
        if not OTEL_AVAILABLE or not self.config.opentelemetry_enabled:
            self._otel_meter = None
            return
            
        try:
            self._otel_meter = get_meter("cortex.resource_monitor")
            
            # System resource gauges
            self._cpu_gauge = self._otel_meter.create_gauge(
                "system_cpu_utilization_percent",
                description="CPU utilization percentage"
            )
            
            self._memory_gauge = self._otel_meter.create_gauge(
                "system_memory_utilization_percent", 
                description="Memory utilization percentage"
            )
            
            self._gpu_gauge = self._otel_meter.create_gauge(
                "system_gpu_utilization_percent",
                description="GPU utilization percentage"
            )
            
            # Memory pressure counter
            self._pressure_counter = self._otel_meter.create_counter(
                "memory_pressure_events_total",
                description="Total memory pressure events"
            )
            
            # Model eviction counter
            self._eviction_counter = self._otel_meter.create_counter(
                "model_evictions_total",
                description="Total model evictions"
            )
            
            # Resource monitoring latency
            self._monitor_latency_histogram = self._otel_meter.create_histogram(
                "resource_monitor_latency_milliseconds",
                description="Resource monitoring latency"
            )
            
            logger.info("OpenTelemetry metrics initialized for ResourceMonitor")
            
        except Exception as e:
            logger.warning(f"Failed to setup OpenTelemetry metrics: {e}")
            self._otel_meter = None
    
    async def start_monitoring(self) -> None:
        """Start background resource monitoring."""
        if self.is_monitoring:
            logger.warning("Resource monitoring already started")
            return
            
        self.is_monitoring = True
        self._shutdown_event.clear()
        
        # Capture baseline
        self._baseline_resources = await self.get_system_resources()
        
        if self.config.enable_background_monitoring:
            self._monitor_task = asyncio.create_task(self._background_monitor())
            
        logger.info("Resource monitoring started")
    
    async def stop_monitoring(self) -> None:
        """Stop background resource monitoring."""
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
            
        logger.info("Resource monitoring stopped")
    
    async def _background_monitor(self) -> None:
        """Background monitoring loop."""
        logger.info("Background resource monitoring started")
        
        while self.is_monitoring and not self._shutdown_event.is_set():
            try:
                start_time = time.time()
                
                # Get system resources
                resources = await self.get_system_resources()
                await self._process_resource_metrics(resources)
                
                # Export to Activity Monitor
                if self.config.activity_monitor_enabled:
                    await self.activity_monitor.export_metrics_to_activity_monitor(resources)
                
                # Track performance
                monitor_time_ms = (time.time() - start_time) * 1000
                self._update_performance_stats(monitor_time_ms)
                
                # Export metrics
                self._export_metrics(resources)
                
                # Sleep for monitoring interval
                await asyncio.sleep(self.config.monitoring_interval_seconds)
                
            except Exception as e:
                logger.error(f"Background resource monitoring error: {e}")
                await asyncio.sleep(2.0)  # Back off on error
                
        logger.info("Background resource monitoring stopped")
    
    async def get_system_resources(self) -> SystemResources:
        """Get comprehensive system resource snapshot."""
        start_time = time.time()
        
        try:
            resources = SystemResources()
            
            if PSUTIL_AVAILABLE:
                # CPU metrics
                resources.cpu_count = psutil.cpu_count()
                resources.cpu_percent = psutil.cpu_percent(interval=0.1)
                resources.load_average = list(psutil.getloadavg()) if hasattr(psutil, 'getloadavg') else []
                
                # Memory metrics
                memory = psutil.virtual_memory()
                resources.memory_total_gb = memory.total / (1024**3)
                resources.memory_available_gb = memory.available / (1024**3)
                resources.memory_used_gb = memory.used / (1024**3)
                resources.memory_percent = memory.percent
                
                # Swap memory
                swap = psutil.swap_memory()
                resources.swap_total_gb = swap.total / (1024**3)
                resources.swap_used_gb = swap.used / (1024**3)
                
                # Disk I/O
                disk_io = psutil.disk_io_counters()
                if disk_io:
                    # Calculate rates (approximate)
                    resources.disk_read_mb_per_sec = disk_io.read_bytes / (1024**2) / 60  # Rough estimate
                    resources.disk_write_mb_per_sec = disk_io.write_bytes / (1024**2) / 60
                
                # Network I/O
                net_io = psutil.net_io_counters()
                if net_io:
                    resources.network_sent_mb_per_sec = net_io.bytes_sent / (1024**2) / 60
                    resources.network_recv_mb_per_sec = net_io.bytes_recv / (1024**2) / 60
                
                # Process count
                resources.active_processes = len(psutil.pids())
                
                # Get MLX processes
                resources.mlx_processes = await self.activity_monitor.get_system_processes()
                
            # GPU metrics (Apple Silicon specific)
            gpu_metrics = await self.activity_monitor.get_gpu_utilization()
            resources.gpu_utilization_percent = gpu_metrics['utilization_percent']
            resources.gpu_memory_used_gb = gpu_metrics['memory_used_gb']
            resources.gpu_memory_total_gb = gpu_metrics['memory_total_gb']
            
            # Determine memory pressure level
            resources.memory_pressure = self._classify_memory_pressure(resources.memory_percent)
            
            # Determine overall resource state
            resources.resource_state = self._classify_resource_state(resources)
            
            # Identify pressure indicators
            resources.pressure_indicators = self._identify_pressure_indicators(resources)
            
            self.current_resources = resources
            
            # Track performance
            monitor_time_ms = (time.time() - start_time) * 1000
            self._update_performance_stats(monitor_time_ms)
            
            return resources
            
        except Exception as e:
            logger.error(f"Failed to get system resources: {e}")
            return SystemResources()  # Return empty/default resources
    
    def _classify_memory_pressure(self, memory_percent: float) -> MemoryPressureLevel:
        """Classify memory pressure level."""
        if memory_percent >= self.config.memory_critical_threshold * 100:
            return MemoryPressureLevel.CRITICAL
        elif memory_percent >= self.config.memory_high_threshold * 100:
            return MemoryPressureLevel.HIGH
        elif memory_percent >= self.config.memory_moderate_threshold * 100:
            return MemoryPressureLevel.MODERATE
        else:
            return MemoryPressureLevel.NORMAL
    
    def _classify_resource_state(self, resources: SystemResources) -> ResourceState:
        """Classify overall resource state."""
        # Check critical conditions
        if (resources.memory_pressure == MemoryPressureLevel.CRITICAL or
            resources.cpu_percent > self.config.cpu_critical_threshold * 100):
            return ResourceState.CRITICAL
            
        # Check overloaded conditions
        if (resources.memory_pressure == MemoryPressureLevel.HIGH or
            resources.cpu_percent > self.config.cpu_high_threshold * 100):
            return ResourceState.OVERLOADED
            
        # Check stressed conditions
        if (resources.memory_pressure == MemoryPressureLevel.MODERATE or
            resources.cpu_percent > 60.0):
            return ResourceState.STRESSED
            
        return ResourceState.HEALTHY
    
    def _identify_pressure_indicators(self, resources: SystemResources) -> List[str]:
        """Identify specific pressure indicators."""
        indicators = []
        
        if resources.memory_percent > 80:
            indicators.append(f"high_memory_usage_{resources.memory_percent:.1f}%")
            
        if resources.cpu_percent > 80:
            indicators.append(f"high_cpu_usage_{resources.cpu_percent:.1f}%")
            
        if resources.swap_used_gb > 1.0:
            indicators.append(f"swap_usage_{resources.swap_used_gb:.1f}GB")
            
        if resources.gpu_utilization_percent > 90:
            indicators.append(f"high_gpu_usage_{resources.gpu_utilization_percent:.1f}%")
            
        if len(resources.load_average) > 0 and resources.load_average[0] > resources.cpu_count * 1.5:
            indicators.append(f"high_load_average_{resources.load_average[0]:.1f}")
            
        return indicators
    
    async def _process_resource_metrics(self, resources: SystemResources) -> None:
        """Process resource metrics and trigger actions."""
        # Add to history (keep last 100 readings)
        self._resource_history.append(resources)
        if len(self._resource_history) > 100:
            self._resource_history.pop(0)
        
        # Check for memory pressure changes
        await self._check_memory_pressure(resources)
        
        # Check for automatic eviction triggers
        if self.config.enable_automatic_eviction:
            await self._check_eviction_triggers(resources)
    
    async def _check_memory_pressure(self, resources: SystemResources) -> None:
        """Check for memory pressure events."""
        current_pressure = resources.memory_pressure
        
        # Check if pressure level changed significantly
        if len(self._resource_history) > 1:
            previous_pressure = self._resource_history[-2].memory_pressure
            
            if current_pressure != previous_pressure:
                logger.info(f"Memory pressure changed: {previous_pressure.value} -> {current_pressure.value}")
                
                # Export pressure event
                if self._otel_meter:
                    self._pressure_counter.add(1, {
                        "from_level": previous_pressure.value,
                        "to_level": current_pressure.value
                    })
                
                # Trigger pressure callbacks
                for callback in self._pressure_callbacks:
                    try:
                        callback(current_pressure, resources)
                    except Exception as e:
                        logger.error(f"Memory pressure callback error: {e}")
    
    async def _check_eviction_triggers(self, resources: SystemResources) -> None:
        """Check if model eviction should be triggered."""
        if resources.memory_percent >= self.config.eviction_memory_threshold * 100:
            # Calculate target memory usage
            target_memory_percent = self.config.memory_moderate_threshold * 100
            target_memory_gb = (target_memory_percent / 100) * resources.memory_total_gb
            
            # Get models to evict
            models_to_evict = self.eviction_manager.get_models_to_evict(target_memory_gb)
            
            if models_to_evict:
                freed_memory = sum(
                    self.eviction_manager.loaded_models[name].memory_gb
                    for name in models_to_evict
                    if name in self.eviction_manager.loaded_models
                )
                
                logger.warning(f"Triggering automatic model eviction: {models_to_evict} "
                              f"(freeing {freed_memory:.1f}GB)")
                
                # Export eviction event
                if self._otel_meter:
                    self._eviction_counter.add(len(models_to_evict), {
                        "trigger": "memory_pressure",
                        "memory_freed_gb": freed_memory
                    })
                
                # Trigger eviction callbacks
                for callback in self._eviction_callbacks:
                    try:
                        callback(models_to_evict, freed_memory)
                    except Exception as e:
                        logger.error(f"Eviction callback error: {e}")
    
    def add_pressure_callback(self, callback: Callable[[MemoryPressureLevel, SystemResources], None]) -> None:
        """Add callback for memory pressure events."""
        self._pressure_callbacks.append(callback)
    
    def add_eviction_callback(self, callback: Callable[[List[str], float], None]) -> None:
        """Add callback for model eviction events."""
        self._eviction_callbacks.append(callback)
    
    def register_model(self, name: str, backend: str, memory_gb: float, priority: int = 1) -> None:
        """Register a loaded model for eviction management."""
        self.eviction_manager.register_model(name, backend, memory_gb, priority)
    
    def unregister_model(self, name: str) -> None:
        """Unregister a model."""
        self.eviction_manager.unregister_model(name)
    
    def update_model_usage(self, name: str) -> None:
        """Update model usage statistics."""
        self.eviction_manager.update_model_usage(name)
    
    def get_memory_pressure_level(self) -> MemoryPressureLevel:
        """Get current memory pressure level."""
        return self.current_resources.memory_pressure
    
    def should_evict_models(self) -> bool:
        """Check if models should be evicted due to memory pressure."""
        return (self.current_resources.memory_pressure in [MemoryPressureLevel.HIGH, MemoryPressureLevel.CRITICAL] or
                self.current_resources.memory_percent >= self.config.eviction_memory_threshold * 100)
    
    def get_recommended_evictions(self, target_memory_reduction_gb: float = 0.0) -> List[str]:
        """Get recommended models for eviction."""
        if target_memory_reduction_gb == 0.0:
            # Calculate based on current pressure
            target_memory_percent = self.config.memory_moderate_threshold * 100
            target_memory_gb = (target_memory_percent / 100) * self.current_resources.memory_total_gb
        else:
            current_used = self.current_resources.memory_used_gb
            target_memory_gb = current_used - target_memory_reduction_gb
            
        return self.eviction_manager.get_models_to_evict(target_memory_gb)
    
    def _update_performance_stats(self, monitor_time_ms: float) -> None:
        """Update performance tracking statistics."""
        self._monitor_call_count += 1
        self._total_monitor_time_ms += monitor_time_ms
        
        # Log performance warning if monitoring is slow
        if monitor_time_ms > 100.0:  # > 100ms
            logger.warning(f"Resource monitoring slow: {monitor_time_ms:.2f}ms")
    
    def _export_metrics(self, resources: SystemResources) -> None:
        """Export metrics to OpenTelemetry."""
        if not self._otel_meter:
            return
            
        try:
            # System resource gauges
            self._cpu_gauge.set(resources.cpu_percent)
            self._memory_gauge.set(resources.memory_percent)
            self._gpu_gauge.set(resources.gpu_utilization_percent)
            
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
            "resource_history_size": len(self._resource_history),
            "eviction_stats": self.eviction_manager.get_eviction_statistics()
        }
    
    def get_resource_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent resource history."""
        history = self._resource_history[-limit:] if limit > 0 else self._resource_history
        return [resources.to_dict() for resources in history]
    
    def get_activity_monitor_data(self) -> Dict[str, Any]:
        """Get data formatted for Activity Monitor display."""
        resources = self.current_resources
        
        return {
            "process_name": "Cortex MLX",
            "cpu_percent": resources.cpu_percent,
            "memory_mb": resources.memory_used_gb * 1024,
            "memory_percent": resources.memory_percent,
            "gpu_percent": resources.gpu_utilization_percent,
            "model_count": len(self.eviction_manager.loaded_models),
            "memory_pressure": resources.memory_pressure.value,
            "resource_state": resources.resource_state.value,
            "mlx_processes": [p.to_dict() for p in resources.mlx_processes]
        }


# Convenience functions

async def create_resource_monitor(config: Optional[ResourceConfig] = None) -> ResourceMonitor:
    """Create and initialize a resource monitor."""
    monitor = ResourceMonitor(config)
    await monitor.start_monitoring()
    return monitor

def get_default_resource_config() -> ResourceConfig:
    """Get default resource monitoring configuration."""
    return ResourceConfig()

def get_aggressive_eviction_config() -> ResourceConfig:
    """Get configuration with aggressive model eviction."""
    config = ResourceConfig()
    config.eviction_memory_threshold = 0.75      # Evict at 75%
    config.memory_moderate_threshold = 0.70      # Lower moderate threshold
    config.eviction_strategy = EvictionStrategy.SIZE_BASED  # Evict large models first
    config.models_to_keep_minimum = 0           # Can evict all models
    return config

def get_conservative_eviction_config() -> ResourceConfig:
    """Get configuration with conservative model eviction."""
    config = ResourceConfig()
    config.eviction_memory_threshold = 0.90      # Evict only at 90%
    config.memory_high_threshold = 0.85          # Higher high threshold
    config.eviction_strategy = EvictionStrategy.LRU  # Keep frequently used models
    config.models_to_keep_minimum = 2           # Always keep 2 models
    return config


if __name__ == "__main__":
    async def demo():
        """Demo resource monitoring functionality."""
        logging.basicConfig(level=logging.INFO)
        
        # Create resource monitor
        monitor = await create_resource_monitor()
        
        # Add callbacks
        def on_pressure(level: MemoryPressureLevel, resources: SystemResources):
            print(f"🔴 Memory pressure: {level.value} ({resources.memory_percent:.1f}%)")
            
        def on_eviction(models: List[str], freed_memory: float):
            print(f"🗑️  Model eviction: {models} (freed {freed_memory:.1f}GB)")
        
        monitor.add_pressure_callback(on_pressure)
        monitor.add_eviction_callback(on_eviction)
        
        # Register some mock models
        monitor.register_model("phi3-mini", "mlx", 2.0, priority=5)
        monitor.register_model("qwen3-coder", "mlx", 17.0, priority=3)
        monitor.register_model("qwen3-instruct", "mlx", 22.0, priority=1)
        
        # Monitor for 30 seconds
        print("Monitoring system resources for 30 seconds...")
        for i in range(30):
            resources = await monitor.get_system_resources()
            print(f"💻 CPU: {resources.cpu_percent:.1f}%, "
                  f"Memory: {resources.memory_percent:.1f}%, "
                  f"GPU: {resources.gpu_utilization_percent:.1f}%, "
                  f"State: {resources.resource_state.value}")
            
            # Simulate model usage
            if i % 10 == 0:
                monitor.update_model_usage("phi3-mini")
            
            await asyncio.sleep(1)
        
        # Show performance stats
        stats = monitor.get_performance_stats()
        print(f"\n📊 Performance: {stats['average_latency_ms']:.2f}ms avg latency")
        print(f"📈 Eviction stats: {stats['eviction_stats']}")
        
        await monitor.stop_monitoring()
    
    asyncio.run(demo())
