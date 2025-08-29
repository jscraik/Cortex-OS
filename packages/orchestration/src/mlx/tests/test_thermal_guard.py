#!/usr/bin/env python3
"""
Comprehensive test suite for Thermal Guard

Tests cover:
- Temperature monitoring and state transitions
- Thermal throttling behavior
- Emergency CPU-only fallback
- Resource monitoring accuracy
- Apple Silicon integration
"""

import asyncio
import json
import pytest
import time
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any

# Import the module under test
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from thermal_guard import (
    ThermalGuard,
    ThermalState,
    ResourceState,
    ThermalMetrics,
    ResourceMonitor
)


class TestThermalMetrics:
    """Test suite for ThermalMetrics dataclass"""
    
    def test_thermal_metrics_creation(self):
        """Test ThermalMetrics creation"""
        timestamp = time.time()
        metrics = ThermalMetrics(
            gpu_temp_celsius=85.5,
            cpu_temp_celsius=70.2,
            memory_pressure=0.75,
            gpu_utilization=60.0,
            power_draw_watts=120.5,
            thermal_state=ThermalState.THROTTLED,
            resource_state=ResourceState.HIGH,
            timestamp=timestamp
        )
        
        assert metrics.gpu_temp_celsius == 85.5
        assert metrics.cpu_temp_celsius == 70.2
        assert metrics.memory_pressure == 0.75
        assert metrics.gpu_utilization == 60.0
        assert metrics.power_draw_watts == 120.5
        assert metrics.thermal_state == ThermalState.THROTTLED
        assert metrics.resource_state == ResourceState.HIGH
        assert metrics.timestamp == timestamp

    def test_thermal_metrics_to_dict(self):
        """Test ThermalMetrics to_dict conversion"""
        timestamp = time.time()
        metrics = ThermalMetrics(
            gpu_temp_celsius=80.0,
            cpu_temp_celsius=65.0,
            memory_pressure=0.6,
            gpu_utilization=50.0,
            power_draw_watts=100.0,
            thermal_state=ThermalState.NORMAL,
            resource_state=ResourceState.MODERATE,
            timestamp=timestamp
        )
        
        metrics_dict = metrics.to_dict()
        
        assert isinstance(metrics_dict, dict)
        assert metrics_dict["gpu_temp_celsius"] == 80.0
        assert metrics_dict["cpu_temp_celsius"] == 65.0
        assert metrics_dict["memory_pressure"] == 0.6
        assert metrics_dict["gpu_utilization"] == 50.0
        assert metrics_dict["power_draw_watts"] == 100.0
        assert metrics_dict["thermal_state"] == "normal"
        assert metrics_dict["resource_state"] == "moderate"
        assert metrics_dict["timestamp"] == timestamp


class TestThermalGuard:
    """Test suite for ThermalGuard"""
    
    @pytest.fixture
    def thermal_guard(self):
        """Create thermal guard instance for testing"""
        return ThermalGuard(
            temp_threshold=85.0,
            critical_temp=90.0,
            monitoring_interval=0.1  # Fast for testing
        )

    def test_initialization(self, thermal_guard):
        """Test thermal guard initialization"""
        assert thermal_guard.temp_threshold == 85.0
        assert thermal_guard.critical_temp == 90.0
        assert thermal_guard.monitoring_interval == 0.1
        assert thermal_guard.current_metrics is None
        assert thermal_guard.thermal_state == ThermalState.NORMAL
        assert thermal_guard.resource_state == ResourceState.OPTIMAL
        assert thermal_guard.metrics_history == []
        assert thermal_guard.thermal_callbacks == []
        assert thermal_guard.throttle_events == 0
        assert thermal_guard.emergency_events == 0

    def test_initialization_default_values(self):
        """Test thermal guard initialization with default values"""
        guard = ThermalGuard()
        assert guard.temp_threshold == 85.0
        assert guard.critical_temp == 90.0
        assert guard.monitoring_interval == 5.0

    def test_detect_apple_silicon_darwin(self, thermal_guard):
        """Test Apple Silicon detection on Darwin platform"""
        with patch('platform.system', return_value='Darwin'), \
             patch('subprocess.run') as mock_run:
            
            # Mock successful Apple Silicon detection
            mock_result = Mock()
            mock_result.returncode = 0
            mock_result.stdout = "Apple M1 Pro"
            mock_run.return_value = mock_result
            
            is_apple = thermal_guard._detect_apple_silicon()
            assert is_apple is True

    def test_detect_apple_silicon_non_darwin(self, thermal_guard):
        """Test Apple Silicon detection on non-Darwin platform"""
        with patch('platform.system', return_value='Linux'):
            is_apple = thermal_guard._detect_apple_silicon()
            assert is_apple is False

    def test_detect_apple_silicon_intel_mac(self, thermal_guard):
        """Test Apple Silicon detection on Intel Mac"""
        with patch('platform.system', return_value='Darwin'), \
             patch('subprocess.run') as mock_run:
            
            mock_result = Mock()
            mock_result.returncode = 0
            mock_result.stdout = "Intel(R) Core(TM) i7-9750H"
            mock_run.return_value = mock_result
            
            is_apple = thermal_guard._detect_apple_silicon()
            assert is_apple is False

    def test_detect_apple_silicon_error(self, thermal_guard):
        """Test Apple Silicon detection with subprocess error"""
        with patch('platform.system', return_value='Darwin'), \
             patch('subprocess.run', side_effect=Exception("Command failed")):
            
            is_apple = thermal_guard._detect_apple_silicon()
            assert is_apple is False

    @pytest.mark.asyncio
    async def test_start_monitoring(self, thermal_guard):
        """Test starting thermal monitoring"""
        with patch.object(thermal_guard, '_monitoring_loop') as mock_loop:
            mock_loop.return_value = AsyncMock()
            
            await thermal_guard.start_monitoring()
            
            assert thermal_guard._monitoring_task is not None
            assert not thermal_guard._shutdown_event.is_set()

    @pytest.mark.asyncio
    async def test_start_monitoring_already_running(self, thermal_guard):
        """Test starting monitoring when already running"""
        # Mock running task
        thermal_guard._monitoring_task = Mock()
        thermal_guard._monitoring_task.done.return_value = False
        
        with patch.object(thermal_guard, '_monitoring_loop'):
            await thermal_guard.start_monitoring()
            # Should not create new task

    @pytest.mark.asyncio
    async def test_stop_monitoring(self, thermal_guard):
        """Test stopping thermal monitoring"""
        # Start monitoring first
        with patch.object(thermal_guard, '_monitoring_loop', return_value=AsyncMock()):
            await thermal_guard.start_monitoring()
            
            # Stop monitoring
            await thermal_guard.stop_monitoring()
            
            assert thermal_guard._shutdown_event.is_set()

    @pytest.mark.asyncio
    async def test_stop_monitoring_timeout(self, thermal_guard):
        """Test stopping monitoring with timeout"""
        # Mock a task that doesn't stop
        mock_task = AsyncMock()
        mock_task.cancel = Mock()
        thermal_guard._monitoring_task = mock_task
        
        with patch('asyncio.wait_for', side_effect=asyncio.TimeoutError):
            await thermal_guard.stop_monitoring()
            mock_task.cancel.assert_called_once()

    @pytest.mark.asyncio
    async def test_collect_metrics_success(self, thermal_guard):
        """Test successful metrics collection"""
        with patch.object(thermal_guard, '_get_gpu_temperature', return_value=80.0), \
             patch.object(thermal_guard, '_get_cpu_temperature', return_value=65.0), \
             patch.object(thermal_guard, '_get_gpu_utilization', return_value=50.0), \
             patch.object(thermal_guard, '_get_power_draw', return_value=100.0), \
             patch('thermal_guard.psutil') as mock_psutil:
            
            # Mock memory info
            mock_memory = Mock()
            mock_memory.percent = 60.0
            mock_psutil.virtual_memory.return_value = mock_memory
            
            metrics = await thermal_guard._collect_metrics()
            
            assert isinstance(metrics, ThermalMetrics)
            assert metrics.gpu_temp_celsius == 80.0
            assert metrics.cpu_temp_celsius == 65.0
            assert metrics.memory_pressure == 0.6
            assert metrics.gpu_utilization == 50.0
            assert metrics.power_draw_watts == 100.0

    @pytest.mark.asyncio
    async def test_collect_metrics_error(self, thermal_guard):
        """Test metrics collection with error"""
        with patch.object(thermal_guard, '_get_gpu_temperature', side_effect=Exception("GPU error")):
            metrics = await thermal_guard._collect_metrics()
            assert metrics is None

    @pytest.mark.asyncio
    async def test_get_gpu_temperature_apple_silicon(self, thermal_guard):
        """Test GPU temperature retrieval on Apple Silicon"""
        thermal_guard.is_apple_silicon = True
        
        with patch('asyncio.create_subprocess_exec') as mock_subprocess:
            # Mock powermetrics output
            mock_process = Mock()
            mock_process.communicate = AsyncMock(return_value=(
                b'<key>gpu_temp</key><real>82.5</real>',
                b''
            ))
            mock_process.returncode = 0
            mock_subprocess.return_value = mock_process
            
            temp = await thermal_guard._get_gpu_temperature()
            assert temp == 82.5

    @pytest.mark.asyncio
    async def test_get_gpu_temperature_non_apple_silicon(self, thermal_guard):
        """Test GPU temperature on non-Apple Silicon"""
        thermal_guard.is_apple_silicon = False
        
        temp = await thermal_guard._get_gpu_temperature()
        assert temp == 70.0  # Mock temperature

    @pytest.mark.asyncio
    async def test_get_gpu_temperature_fallback_parsing(self, thermal_guard):
        """Test GPU temperature with fallback regex parsing"""
        thermal_guard.is_apple_silicon = True
        
        with patch('asyncio.create_subprocess_exec') as mock_subprocess:
            mock_process = Mock()
            mock_process.communicate = AsyncMock(return_value=(
                b'Temperature: 78.3\xc2\xb0C',  # Different format
                b''
            ))
            mock_process.returncode = 0
            mock_subprocess.return_value = mock_process
            
            temp = await thermal_guard._get_gpu_temperature()
            assert temp == 78.3

    @pytest.mark.asyncio
    async def test_get_gpu_temperature_error(self, thermal_guard):
        """Test GPU temperature retrieval with error"""
        thermal_guard.is_apple_silicon = True
        
        with patch('asyncio.create_subprocess_exec', side_effect=Exception("Command failed")):
            temp = await thermal_guard._get_gpu_temperature()
            assert temp == 75.0  # Fallback temperature

    @pytest.mark.asyncio
    async def test_get_cpu_temperature_apple_silicon(self, thermal_guard):
        """Test CPU temperature retrieval on Apple Silicon"""
        thermal_guard.is_apple_silicon = True
        
        with patch('asyncio.create_subprocess_exec') as mock_subprocess:
            mock_process = Mock()
            mock_process.communicate = AsyncMock(return_value=(b'3', b''))
            mock_process.returncode = 0
            mock_subprocess.return_value = mock_process
            
            temp = await thermal_guard._get_cpu_temperature()
            assert temp == 65.0  # 50 + (3 * 5)

    @pytest.mark.asyncio
    async def test_get_cpu_temperature_non_apple_silicon(self, thermal_guard):
        """Test CPU temperature on non-Apple Silicon"""
        thermal_guard.is_apple_silicon = False
        
        temp = await thermal_guard._get_cpu_temperature()
        assert temp == 60.0  # Mock temperature

    @pytest.mark.asyncio
    async def test_get_gpu_utilization_apple_silicon(self, thermal_guard):
        """Test GPU utilization on Apple Silicon"""
        thermal_guard.is_apple_silicon = True
        
        with patch('asyncio.create_subprocess_exec') as mock_subprocess:
            mock_process = Mock()
            mock_process.communicate = AsyncMock(return_value=(
                b'"PerformanceStatistics" "GPU" "utilization" 75',
                b''
            ))
            mock_process.returncode = 0
            mock_subprocess.return_value = mock_process
            
            utilization = await thermal_guard._get_gpu_utilization()
            assert utilization == 75.0

    @pytest.mark.asyncio
    async def test_get_gpu_utilization_non_apple_silicon(self, thermal_guard):
        """Test GPU utilization on non-Apple Silicon"""
        thermal_guard.is_apple_silicon = False
        
        utilization = await thermal_guard._get_gpu_utilization()
        assert utilization == 30.0  # Mock utilization

    @pytest.mark.asyncio
    async def test_get_power_draw_success(self, thermal_guard):
        """Test power draw measurement"""
        with patch('asyncio.create_subprocess_exec') as mock_subprocess:
            mock_process = Mock()
            mock_process.communicate = AsyncMock(return_value=(
                b'<real>45.2</real><real>78.8</real>',  # CPU and GPU power
                b''
            ))
            mock_process.returncode = 0
            mock_subprocess.return_value = mock_process
            
            power = await thermal_guard._get_power_draw()
            assert power == 124.0  # 45.2 + 78.8

    @pytest.mark.asyncio
    async def test_get_power_draw_capped(self, thermal_guard):
        """Test power draw with cap applied"""
        with patch('asyncio.create_subprocess_exec') as mock_subprocess:
            mock_process = Mock()
            mock_process.communicate = AsyncMock(return_value=(
                b'<real>150.0</real><real>100.0</real>',  # High power values
                b''
            ))
            mock_process.returncode = 0
            mock_subprocess.return_value = mock_process
            
            power = await thermal_guard._get_power_draw()
            assert power == 200.0  # Capped at 200W

    @pytest.mark.asyncio
    async def test_get_power_draw_error(self, thermal_guard):
        """Test power draw measurement with error"""
        with patch('asyncio.create_subprocess_exec', side_effect=Exception("Power command failed")):
            power = await thermal_guard._get_power_draw()
            assert power == 50.0  # Default fallback

    def test_determine_thermal_state_normal(self, thermal_guard):
        """Test thermal state determination - normal"""
        metrics = ThermalMetrics(
            gpu_temp_celsius=75.0,  # Below threshold
            cpu_temp_celsius=60.0,
            memory_pressure=0.5,
            gpu_utilization=40.0,
            power_draw_watts=80.0,
            thermal_state=ThermalState.NORMAL,
            resource_state=ResourceState.OPTIMAL,
            timestamp=time.time()
        )
        
        state = thermal_guard._determine_thermal_state(metrics)
        assert state == ThermalState.NORMAL

    def test_determine_thermal_state_throttled(self, thermal_guard):
        """Test thermal state determination - throttled"""
        metrics = ThermalMetrics(
            gpu_temp_celsius=87.0,  # Above threshold, below critical
            cpu_temp_celsius=70.0,
            memory_pressure=0.6,
            gpu_utilization=60.0,
            power_draw_watts=120.0,
            thermal_state=ThermalState.NORMAL,
            resource_state=ResourceState.MODERATE,
            timestamp=time.time()
        )
        
        state = thermal_guard._determine_thermal_state(metrics)
        assert state == ThermalState.THROTTLED

    def test_determine_thermal_state_cpu_only(self, thermal_guard):
        """Test thermal state determination - CPU only"""
        metrics = ThermalMetrics(
            gpu_temp_celsius=92.0,  # Above critical threshold
            cpu_temp_celsius=75.0,
            memory_pressure=0.8,
            gpu_utilization=80.0,
            power_draw_watts=150.0,
            thermal_state=ThermalState.THROTTLED,
            resource_state=ResourceState.HIGH,
            timestamp=time.time()
        )
        
        state = thermal_guard._determine_thermal_state(metrics)
        assert state == ThermalState.CPU_ONLY

    def test_determine_resource_state_optimal(self, thermal_guard):
        """Test resource state determination - optimal"""
        metrics = ThermalMetrics(
            gpu_temp_celsius=70.0,
            cpu_temp_celsius=55.0,
            memory_pressure=0.4,  # Low pressure
            gpu_utilization=30.0,  # Low utilization
            power_draw_watts=60.0,  # Low power
            thermal_state=ThermalState.NORMAL,
            resource_state=ResourceState.OPTIMAL,
            timestamp=time.time()
        )
        
        state = thermal_guard._determine_resource_state(metrics)
        assert state == ResourceState.OPTIMAL

    def test_determine_resource_state_moderate(self, thermal_guard):
        """Test resource state determination - moderate"""
        metrics = ThermalMetrics(
            gpu_temp_celsius=75.0,
            cpu_temp_celsius=65.0,
            memory_pressure=0.65,  # Moderate pressure
            gpu_utilization=55.0,  # Moderate utilization
            power_draw_watts=85.0,  # Moderate power
            thermal_state=ThermalState.NORMAL,
            resource_state=ResourceState.OPTIMAL,
            timestamp=time.time()
        )
        
        state = thermal_guard._determine_resource_state(metrics)
        assert state == ResourceState.MODERATE

    def test_determine_resource_state_high(self, thermal_guard):
        """Test resource state determination - high"""
        metrics = ThermalMetrics(
            gpu_temp_celsius=82.0,
            cpu_temp_celsius=72.0,
            memory_pressure=0.85,  # High pressure
            gpu_utilization=75.0,  # High utilization
            power_draw_watts=120.0,  # High power
            thermal_state=ThermalState.NORMAL,
            resource_state=ResourceState.MODERATE,
            timestamp=time.time()
        )
        
        state = thermal_guard._determine_resource_state(metrics)
        assert state == ResourceState.HIGH

    def test_determine_resource_state_critical(self, thermal_guard):
        """Test resource state determination - critical"""
        metrics = ThermalMetrics(
            gpu_temp_celsius=88.0,
            cpu_temp_celsius=78.0,
            memory_pressure=0.98,  # Critical pressure
            gpu_utilization=95.0,  # Critical utilization
            power_draw_watts=180.0,  # High power
            thermal_state=ThermalState.THROTTLED,
            resource_state=ResourceState.HIGH,
            timestamp=time.time()
        )
        
        state = thermal_guard._determine_resource_state(metrics)
        assert state == ResourceState.CRITICAL

    @pytest.mark.asyncio
    async def test_handle_thermal_state_change(self, thermal_guard):
        """Test thermal state change handling"""
        # Add callback to track state changes
        state_changes = []
        
        def callback(state: ThermalState):
            state_changes.append(state)
        
        thermal_guard.add_thermal_callback(callback)
        
        # Trigger state change
        await thermal_guard._handle_thermal_state_change(ThermalState.THROTTLED)
        
        assert thermal_guard.thermal_state == ThermalState.THROTTLED
        assert thermal_guard.throttle_events == 1
        assert len(state_changes) == 1
        assert state_changes[0] == ThermalState.THROTTLED

    @pytest.mark.asyncio
    async def test_handle_thermal_state_change_emergency(self, thermal_guard):
        """Test thermal state change to emergency"""
        await thermal_guard._handle_thermal_state_change(ThermalState.CPU_ONLY)
        
        assert thermal_guard.thermal_state == ThermalState.CPU_ONLY
        assert thermal_guard.emergency_events == 1

    @pytest.mark.asyncio
    async def test_handle_thermal_state_change_callback_error(self, thermal_guard):
        """Test thermal state change with callback error"""
        def failing_callback(state: ThermalState):
            raise Exception("Callback failed")
        
        thermal_guard.add_thermal_callback(failing_callback)
        
        # Should not raise exception
        await thermal_guard._handle_thermal_state_change(ThermalState.THROTTLED)
        assert thermal_guard.thermal_state == ThermalState.THROTTLED

    def test_update_history(self, thermal_guard):
        """Test metrics history update"""
        metrics1 = ThermalMetrics(
            gpu_temp_celsius=80.0, cpu_temp_celsius=65.0, memory_pressure=0.6,
            gpu_utilization=50.0, power_draw_watts=100.0,
            thermal_state=ThermalState.NORMAL, resource_state=ResourceState.MODERATE,
            timestamp=time.time()
        )
        
        thermal_guard._update_history(metrics1)
        assert len(thermal_guard.metrics_history) == 1
        assert thermal_guard.metrics_history[0] == metrics1

    def test_update_history_trim(self, thermal_guard):
        """Test metrics history trimming when over limit"""
        # Fill history to max size
        for i in range(thermal_guard.max_history_size + 50):
            metrics = ThermalMetrics(
                gpu_temp_celsius=80.0, cpu_temp_celsius=65.0, memory_pressure=0.6,
                gpu_utilization=50.0, power_draw_watts=100.0,
                thermal_state=ThermalState.NORMAL, resource_state=ResourceState.MODERATE,
                timestamp=time.time() + i
            )
            thermal_guard._update_history(metrics)
        
        # Should be trimmed to max size
        assert len(thermal_guard.metrics_history) == thermal_guard.max_history_size
        
        # Should keep the most recent entries
        assert thermal_guard.metrics_history[-1].timestamp > thermal_guard.metrics_history[0].timestamp

    @pytest.mark.asyncio
    async def test_add_remove_thermal_callback(self, thermal_guard):
        """Test adding and removing thermal callbacks"""
        state_calls = []

        def callback(state: ThermalState):
            state_calls.append(state)

        thermal_guard.add_thermal_callback(callback)
        assert callback in thermal_guard.thermal_callbacks

        await thermal_guard._handle_thermal_state_change(ThermalState.THROTTLED)
        assert state_calls == [ThermalState.THROTTLED]

        thermal_guard.remove_thermal_callback(callback)
        assert callback not in thermal_guard.thermal_callbacks

        await thermal_guard._handle_thermal_state_change(ThermalState.CPU_ONLY)
        assert state_calls == [ThermalState.THROTTLED]

    @pytest.mark.asyncio
    async def test_remove_nonexistent_callback(self, thermal_guard):
        """Test removing non-existent callback"""
        state_calls = []

        def callback(state: ThermalState):
            state_calls.append(state)

        thermal_guard.remove_thermal_callback(callback)
        await thermal_guard._handle_thermal_state_change(ThermalState.THROTTLED)

        assert state_calls == []

    @pytest.mark.asyncio
    async def test_check_thermal_state_with_current_metrics(self, thermal_guard):
        """Test thermal state check with current metrics"""
        # Set current metrics
        thermal_guard.current_metrics = ThermalMetrics(
            gpu_temp_celsius=80.0, cpu_temp_celsius=65.0, memory_pressure=0.6,
            gpu_utilization=50.0, power_draw_watts=100.0,
            thermal_state=ThermalState.NORMAL, resource_state=ResourceState.MODERATE,
            timestamp=time.time()
        )
        thermal_guard.thermal_state = ThermalState.NORMAL
        
        state = await thermal_guard.check_thermal_state()
        assert state == ThermalState.NORMAL

    @pytest.mark.asyncio
    async def test_check_thermal_state_without_current_metrics(self, thermal_guard):
        """Test thermal state check without current metrics"""
        with patch.object(thermal_guard, '_collect_metrics') as mock_collect:
            mock_metrics = ThermalMetrics(
                gpu_temp_celsius=87.0, cpu_temp_celsius=70.0, memory_pressure=0.7,
                gpu_utilization=60.0, power_draw_watts=120.0,
                thermal_state=ThermalState.NORMAL, resource_state=ResourceState.MODERATE,
                timestamp=time.time()
            )
            mock_collect.return_value = mock_metrics
            
            state = await thermal_guard.check_thermal_state()
            assert state == ThermalState.THROTTLED  # Should be throttled based on temp

    @pytest.mark.asyncio
    async def test_check_thermal_state_error(self, thermal_guard):
        """Test thermal state check with collection error"""
        with patch.object(thermal_guard, '_collect_metrics', return_value=None):
            state = await thermal_guard.check_thermal_state()
            assert state == ThermalState.NORMAL  # Default fallback

    def test_get_thermal_recommendation_normal(self, thermal_guard):
        """Test thermal recommendations in normal state"""
        thermal_guard.thermal_state = ThermalState.NORMAL
        thermal_guard.resource_state = ResourceState.OPTIMAL
        thermal_guard.current_metrics = ThermalMetrics(
            gpu_temp_celsius=75.0, cpu_temp_celsius=60.0, memory_pressure=0.5,
            gpu_utilization=40.0, power_draw_watts=80.0,
            thermal_state=ThermalState.NORMAL, resource_state=ResourceState.OPTIMAL,
            timestamp=time.time()
        )
        
        recommendation = thermal_guard.get_thermal_recommendation()
        
        assert recommendation["can_load_large_models"] is True
        assert recommendation["recommended_batch_size"] == 4
        assert recommendation["inference_delay_ms"] == 0
        assert recommendation["recommended_action"] == "normal_operation"

    def test_get_thermal_recommendation_throttled(self, thermal_guard):
        """Test thermal recommendations in throttled state"""
        thermal_guard.thermal_state = ThermalState.THROTTLED
        thermal_guard.current_metrics = ThermalMetrics(
            gpu_temp_celsius=87.0, cpu_temp_celsius=70.0, memory_pressure=0.7,
            gpu_utilization=60.0, power_draw_watts=120.0,
            thermal_state=ThermalState.THROTTLED, resource_state=ResourceState.HIGH,
            timestamp=time.time()
        )
        
        recommendation = thermal_guard.get_thermal_recommendation()
        
        assert recommendation["can_load_large_models"] is False
        assert recommendation["recommended_batch_size"] == 2
        assert recommendation["inference_delay_ms"] == 1000
        assert recommendation["recommended_action"] == "throttled_operation"
        assert "GPU temperature high" in recommendation["reason"]

    def test_get_thermal_recommendation_cpu_only(self, thermal_guard):
        """Test thermal recommendations in CPU-only state"""
        thermal_guard.thermal_state = ThermalState.CPU_ONLY
        thermal_guard.current_metrics = ThermalMetrics(
            gpu_temp_celsius=92.0, cpu_temp_celsius=75.0, memory_pressure=0.8,
            gpu_utilization=80.0, power_draw_watts=150.0,
            thermal_state=ThermalState.CPU_ONLY, resource_state=ResourceState.CRITICAL,
            timestamp=time.time()
        )
        
        recommendation = thermal_guard.get_thermal_recommendation()
        
        assert recommendation["can_load_large_models"] is False
        assert recommendation["recommended_batch_size"] == 1
        assert recommendation["inference_delay_ms"] == 2000
        assert recommendation["recommended_action"] == "emergency_cpu_only"
        assert "GPU temperature critical" in recommendation["reason"]

    def test_get_thermal_recommendation_high_resource_pressure(self, thermal_guard):
        """Test thermal recommendations with high resource pressure"""
        thermal_guard.thermal_state = ThermalState.NORMAL
        thermal_guard.resource_state = ResourceState.HIGH
        thermal_guard.current_metrics = ThermalMetrics(
            gpu_temp_celsius=80.0, cpu_temp_celsius=65.0, memory_pressure=0.85,
            gpu_utilization=75.0, power_draw_watts=130.0,
            thermal_state=ThermalState.NORMAL, resource_state=ResourceState.HIGH,
            timestamp=time.time()
        )
        
        recommendation = thermal_guard.get_thermal_recommendation()
        
        assert recommendation["can_load_large_models"] is True
        assert recommendation["recommended_batch_size"] == 3  # Reduced from 4
        assert recommendation["inference_delay_ms"] == 200

    def test_get_thermal_recommendation_no_metrics(self, thermal_guard):
        """Test thermal recommendations without current metrics"""
        recommendation = thermal_guard.get_thermal_recommendation()
        
        assert recommendation["can_load_large_models"] is True
        assert recommendation["recommended_batch_size"] == 4
        assert recommendation["inference_delay_ms"] == 0
        assert recommendation["recommended_action"] == "normal_operation"

    def test_get_thermal_stats_no_data(self, thermal_guard):
        """Test thermal statistics with no data"""
        stats = thermal_guard.get_thermal_stats()
        assert stats == {"status": "no_data"}

    def test_get_thermal_stats_with_data(self, thermal_guard):
        """Test thermal statistics with metrics data"""
        # Add test metrics to history
        base_time = time.time()
        for i in range(15):
            metrics = ThermalMetrics(
                gpu_temp_celsius=75.0 + i,
                cpu_temp_celsius=60.0 + i,
                memory_pressure=0.5 + (i * 0.01),
                gpu_utilization=40.0 + i,
                power_draw_watts=80.0 + (i * 2),
                thermal_state=ThermalState.NORMAL,
                resource_state=ResourceState.OPTIMAL,
                timestamp=base_time + i
            )
            thermal_guard._update_history(metrics)
        
        thermal_guard.thermal_state = ThermalState.NORMAL
        thermal_guard.resource_state = ResourceState.MODERATE
        thermal_guard.throttle_events = 2
        thermal_guard.emergency_events = 0
        thermal_guard.total_monitoring_time = 3600  # 1 hour
        
        stats = thermal_guard.get_thermal_stats()
        
        assert stats["current_thermal_state"] == "normal"
        assert stats["current_resource_state"] == "moderate"
        assert stats["avg_gpu_temp_celsius"] > 75.0
        assert stats["max_gpu_temp_celsius"] >= stats["avg_gpu_temp_celsius"]
        assert stats["throttle_events"] == 2
        assert stats["emergency_events"] == 0
        assert stats["monitoring_time_hours"] == 1.0
        assert stats["metrics_collected"] == 15
        assert "apple_silicon" in stats
        assert stats["temp_threshold"] == 85.0
        assert stats["critical_temp"] == 90.0

    def test_export_metrics_history_all(self, thermal_guard):
        """Test exporting all metrics history"""
        # Add test metrics
        for i in range(5):
            metrics = ThermalMetrics(
                gpu_temp_celsius=75.0 + i,
                cpu_temp_celsius=60.0 + i,
                memory_pressure=0.5,
                gpu_utilization=40.0,
                power_draw_watts=80.0,
                thermal_state=ThermalState.NORMAL,
                resource_state=ResourceState.OPTIMAL,
                timestamp=time.time() + i
            )
            thermal_guard._update_history(metrics)
        
        history = thermal_guard.export_metrics_history()
        
        assert len(history) == 5
        assert all(isinstance(entry, dict) for entry in history)
        assert all("gpu_temp_celsius" in entry for entry in history)

    def test_export_metrics_history_limited(self, thermal_guard):
        """Test exporting limited metrics history"""
        # Add test metrics
        for i in range(10):
            metrics = ThermalMetrics(
                gpu_temp_celsius=75.0 + i,
                cpu_temp_celsius=60.0,
                memory_pressure=0.5,
                gpu_utilization=40.0,
                power_draw_watts=80.0,
                thermal_state=ThermalState.NORMAL,
                resource_state=ResourceState.OPTIMAL,
                timestamp=time.time() + i
            )
            thermal_guard._update_history(metrics)
        
        history = thermal_guard.export_metrics_history(last_n=3)
        
        assert len(history) == 3
        # Should be the last 3 entries
        assert history[0]["gpu_temp_celsius"] == 82.0  # 75 + 7
        assert history[1]["gpu_temp_celsius"] == 83.0  # 75 + 8
        assert history[2]["gpu_temp_celsius"] == 84.0  # 75 + 9


class TestResourceMonitor:
    """Test suite for ResourceMonitor"""
    
    @pytest.fixture
    def resource_monitor(self):
        """Create resource monitor instance for testing"""
        with patch.object(ThermalGuard, '__init__', return_value=None):
            monitor = ResourceMonitor()
            monitor.thermal_guard = Mock()
            monitor.start_time = time.time()
            monitor.inference_queue_size = 0
            monitor.avg_latency_ms = 0.0
            monitor.latency_samples = []
            monitor.max_latency_samples = 100
            return monitor

    @pytest.mark.asyncio
    async def test_start_stop(self, resource_monitor):
        """Test resource monitor start and stop"""
        resource_monitor.thermal_guard.start_monitoring = AsyncMock()
        resource_monitor.thermal_guard.stop_monitoring = AsyncMock()
        
        await resource_monitor.start()
        resource_monitor.thermal_guard.start_monitoring.assert_called_once()
        
        await resource_monitor.stop()
        resource_monitor.thermal_guard.stop_monitoring.assert_called_once()

    def test_record_inference_latency(self, resource_monitor):
        """Test inference latency recording"""
        latencies = [100.0, 150.0, 120.0, 200.0]
        
        for latency in latencies:
            resource_monitor.record_inference_latency(latency)
        
        assert len(resource_monitor.latency_samples) == 4
        assert resource_monitor.avg_latency_ms == 142.5  # Average of latencies

    def test_record_inference_latency_overflow(self, resource_monitor):
        """Test latency recording with sample overflow"""
        # Fill beyond max samples
        for i in range(resource_monitor.max_latency_samples + 20):
            resource_monitor.record_inference_latency(float(i))
        
        # Should keep only max_latency_samples
        assert len(resource_monitor.latency_samples) == resource_monitor.max_latency_samples
        
        # Should keep the most recent samples
        assert resource_monitor.latency_samples[0] == 20.0  # First kept sample
        assert resource_monitor.latency_samples[-1] == 119.0  # Last sample

    def test_update_queue_size(self, resource_monitor):
        """Test queue size update"""
        resource_monitor.update_queue_size(15)
        assert resource_monitor.inference_queue_size == 15

    def test_get_metrics(self, resource_monitor):
        """Test comprehensive metrics retrieval"""
        # Setup mock thermal stats
        thermal_stats = {
            'current_thermal_state': 'normal',
            'avg_gpu_temp_celsius': 75.5,
            'avg_power_draw_watts': 95.0,
            'apple_silicon': True
        }
        resource_monitor.thermal_guard.get_thermal_stats.return_value = thermal_stats
        
        # Setup test data
        resource_monitor.inference_queue_size = 5
        resource_monitor.avg_latency_ms = 125.5
        
        with patch('thermal_guard.psutil') as mock_psutil:
            # Mock system metrics
            mock_memory = Mock()
            mock_memory.percent = 65.0
            mock_psutil.virtual_memory.return_value = mock_memory
            mock_psutil.cpu_percent.return_value = 45.0
            
            metrics = resource_monitor.get_metrics()
        
        assert metrics['memory_pressure'] == 0.65
        assert metrics['cpu_utilization'] == 0.45
        assert metrics['inference_queue'] == 5
        assert metrics['avg_latency_ms'] == 125.5
        assert metrics['thermal_state'] == 'normal'
        assert metrics['gpu_temp_celsius'] == 75.5
        assert metrics['power_draw_watts'] == 95.0
        assert metrics['apple_silicon'] is True
        assert 'uptime_hours' in metrics


class TestThermalGuardIntegration:
    """Integration tests for ThermalGuard"""
    
    @pytest.mark.asyncio
    async def test_full_monitoring_cycle(self):
        """Test complete monitoring cycle"""
        thermal_guard = ThermalGuard(monitoring_interval=0.01)  # Very fast for testing
        
        collected_states = []
        
        def state_callback(state: ThermalState):
            collected_states.append(state)
        
        thermal_guard.add_thermal_callback(state_callback)
        
        with patch.object(thermal_guard, '_collect_metrics') as mock_collect:
            # First metrics - normal
            metrics1 = ThermalMetrics(
                gpu_temp_celsius=75.0, cpu_temp_celsius=60.0, memory_pressure=0.5,
                gpu_utilization=40.0, power_draw_watts=80.0,
                thermal_state=ThermalState.NORMAL, resource_state=ResourceState.OPTIMAL,
                timestamp=time.time()
            )
            
            # Second metrics - throttled
            metrics2 = ThermalMetrics(
                gpu_temp_celsius=87.0, cpu_temp_celsius=70.0, memory_pressure=0.7,
                gpu_utilization=60.0, power_draw_watts=120.0,
                thermal_state=ThermalState.NORMAL, resource_state=ResourceState.HIGH,
                timestamp=time.time()
            )
            
            mock_collect.side_effect = [metrics1, metrics2, None]  # End after 2 cycles
            
            await thermal_guard.start_monitoring()
            await asyncio.sleep(0.05)  # Let it run briefly
            await thermal_guard.stop_monitoring()
        
        # Should have detected state change
        assert ThermalState.THROTTLED in collected_states
        assert len(thermal_guard.metrics_history) >= 1

    @pytest.mark.asyncio
    async def test_thermal_state_transitions(self):
        """Test thermal state transitions"""
        thermal_guard = ThermalGuard()
        
        # Normal -> Throttled
        normal_metrics = ThermalMetrics(
            gpu_temp_celsius=75.0, cpu_temp_celsius=60.0, memory_pressure=0.5,
            gpu_utilization=40.0, power_draw_watts=80.0,
            thermal_state=ThermalState.NORMAL, resource_state=ResourceState.OPTIMAL,
            timestamp=time.time()
        )
        
        throttled_metrics = ThermalMetrics(
            gpu_temp_celsius=87.0, cpu_temp_celsius=70.0, memory_pressure=0.7,
            gpu_utilization=60.0, power_draw_watts=120.0,
            thermal_state=ThermalState.NORMAL, resource_state=ResourceState.HIGH,
            timestamp=time.time()
        )
        
        critical_metrics = ThermalMetrics(
            gpu_temp_celsius=92.0, cpu_temp_celsius=75.0, memory_pressure=0.8,
            gpu_utilization=80.0, power_draw_watts=150.0,
            thermal_state=ThermalState.THROTTLED, resource_state=ResourceState.CRITICAL,
            timestamp=time.time()
        )
        
        # Test state transitions
        assert thermal_guard._determine_thermal_state(normal_metrics) == ThermalState.NORMAL
        assert thermal_guard._determine_thermal_state(throttled_metrics) == ThermalState.THROTTLED
        assert thermal_guard._determine_thermal_state(critical_metrics) == ThermalState.CPU_ONLY

    def test_performance_meets_targets(self):
        """Test that thermal guard performance meets targets"""
        thermal_guard = ThermalGuard()
        
        # Test thermal recommendation performance
        thermal_guard.thermal_state = ThermalState.NORMAL
        thermal_guard.resource_state = ResourceState.OPTIMAL
        thermal_guard.current_metrics = ThermalMetrics(
            gpu_temp_celsius=75.0, cpu_temp_celsius=60.0, memory_pressure=0.5,
            gpu_utilization=40.0, power_draw_watts=80.0,
            thermal_state=ThermalState.NORMAL, resource_state=ResourceState.OPTIMAL,
            timestamp=time.time()
        )
        
        # Should be very fast
        start_time = time.time()
        recommendation = thermal_guard.get_thermal_recommendation()
        end_time = time.time()
        
        assert (end_time - start_time) < 0.001  # Under 1ms
        assert isinstance(recommendation, dict)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])