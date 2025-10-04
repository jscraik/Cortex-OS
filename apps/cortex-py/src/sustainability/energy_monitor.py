"""
Energy Monitor for Cortex-Py (Phase 7.2)

Tracks energy consumption and carbon emissions for sustainability.

Following CODESTYLE.md:
- snake_case naming
- Type hints on all public functions
- Guard clauses for readability
- Functions ≤40 lines
- brAInwav branding in reports
"""

import time
from typing import Dict, List, Callable, Any, TypeVar, Optional
from contextlib import contextmanager

T = TypeVar('T')

# Global tracking
_global_emissions_kg: float = 0.0
_global_requests: int = 0
_global_energy_wh: float = 0.0


class EnergyMonitor:
    """
    Monitors energy consumption and emissions.
    
    Following CODESTYLE.md: Lightweight tracking in fast test mode
    """

    def __init__(self, power_threshold_w: float = 100.0):
        """
        Initialize energy monitor.
        
        Args:
            power_threshold_w: Power threshold in watts
        """
        self.power_threshold_w = power_threshold_w
        self.start_time: Optional[float] = None
        self.warnings: List[str] = []
        self.tracking: bool = False

    def start_tracking(self):
        """
        Start tracking energy consumption.
        
        Following CODESTYLE.md: Simple state management
        """
        self.start_time = time.time()
        self.tracking = True

    def stop_tracking(self) -> Dict[str, Any]:
        """
        Stop tracking and return energy data.
        
        Returns:
            Energy consumption data
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: check if tracking started
        if not self.tracking or self.start_time is None:
            return {
                "duration_s": 0.0,
                "energy_wh": 0.0,
                "emissions_g": 0.0,
                "brainwav": True,
            }

        duration_s = time.time() - self.start_time
        
        # Estimate energy (very conservative in fast test mode)
        # In production would use codecarbon actual measurements
        energy_wh = duration_s * 0.01  # Assume 10mW average
        emissions_g = energy_wh * 0.5  # ~500g CO2/kWh grid average
        
        self.tracking = False
        
        global _global_emissions_kg, _global_requests, _global_energy_wh
        _global_emissions_kg += emissions_g / 1000
        _global_requests += 1
        _global_energy_wh += energy_wh

        return {
            "duration_s": duration_s,
            "energy_wh": energy_wh,
            "emissions_g": emissions_g,
            "brainwav": True,
        }

    def get_warnings(self) -> List[str]:
        """
        Get power threshold warnings.
        
        Returns:
            List of warning messages
        
        Following CODESTYLE.md: Simple accessor
        """
        return self.warnings.copy()


def track_request_energy(func: Callable[[], T]) -> tuple[T, Dict[str, Any]]:
    """
    Track energy for a single request.
    
    Args:
        func: Function to execute
    
    Returns:
        Tuple of (result, energy_data)
    
    Following CODESTYLE.md: Functional wrapper
    """
    monitor = EnergyMonitor()
    monitor.start_tracking()
    
    start = time.time()
    result = func()
    duration_ms = (time.time() - start) * 1000
    
    energy_data = monitor.stop_tracking()
    energy_data["duration_ms"] = duration_ms
    
    return result, energy_data


def get_energy_metrics() -> Dict[str, Any]:
    """
    Get global energy metrics.
    
    Returns:
        Energy metrics dictionary
    
    Following CODESTYLE.md: Global state accessor
    """
    global _global_emissions_kg, _global_requests, _global_energy_wh
    
    avg_power_w = _global_energy_wh / max(_global_requests, 1)
    
    return {
        "total_emissions_kg": round(_global_emissions_kg, 6),
        "average_power_w": round(avg_power_w, 4),
        "total_energy_wh": round(_global_energy_wh, 4),
        "requests_tracked": _global_requests,
        "brainwav": True,
    }


def track_co2_emissions(energy_kwh: float, duration_s: float) -> Dict[str, Any]:
    """
    Calculate CO2 emissions for energy consumption.
    
    Args:
        energy_kwh: Energy in kilowatt-hours
        duration_s: Duration in seconds
    
    Returns:
        Emissions data
    
    Following CODESTYLE.md: Pure calculation
    """
    # Grid average: ~500g CO2/kWh
    co2_g = energy_kwh * 500.0
    
    return {
        "co2_g": round(co2_g, 4),
        "energy_kwh": energy_kwh,
        "duration_s": duration_s,
        "brainwav": True,
    }


def generate_sustainability_report() -> Dict[str, Any]:
    """
    Generate sustainability metrics report.
    
    Returns:
        Sustainability report
    
    Following CODESTYLE.md: Report aggregation
    """
    metrics = get_energy_metrics()
    
    efficiency = calculate_efficiency(
        metrics["requests_tracked"],
        metrics["total_energy_wh"]
    )
    
    return {
        "total_emissions_kg": metrics["total_emissions_kg"],
        "average_power_w": metrics["average_power_w"],
        "requests_tracked": metrics["requests_tracked"],
        "efficiency_req_per_wh": efficiency,
        "brainwav": True,
    }


def calculate_efficiency(requests: int, energy_wh: float) -> float:
    """
    Calculate energy efficiency (requests per watt-hour).
    
    Args:
        requests: Number of requests
        energy_wh: Energy consumed in Wh
    
    Returns:
        Efficiency ratio
    
    Following CODESTYLE.md: Pure calculation with guard
    """
    # Guard: avoid division by zero
    if energy_wh == 0:
        return 0.0
    
    return round(requests / energy_wh, 2)


def check_power_threshold(power_w: float, threshold_w: float) -> bool:
    """
    Check if power is under threshold.
    
    Args:
        power_w: Current power in watts
        threshold_w: Threshold in watts
    
    Returns:
        True if under threshold
    
    Following CODESTYLE.md: Simple comparison
    """
    return power_w <= threshold_w
