"""
brAInwav Thermal Monitoring Service with Cross-Platform Guards

This module implements cross-platform thermal monitoring with platform-specific guards
and integrates with the A2A messaging system for thermal event dispatch.
"""

import asyncio
import logging
import os
import platform
import subprocess
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import UTC, datetime

from cortex_py.a2a.events import create_mlx_thermal_event

logger = logging.getLogger(__name__)


@dataclass
class ThermalReading:
    """Represents a thermal sensor reading."""

    device_id: str
    temperature: float
    threshold_warning: float
    threshold_critical: float
    timestamp: datetime
    sensor_type: str = "cpu"
    location: str = "unknown"


@dataclass
class ThermalConfig:
    """Configuration for thermal monitoring."""

    warning_threshold: float = 75.0
    critical_threshold: float = 85.0
    shutdown_threshold: float = 95.0
    check_interval_seconds: int = 5
    enabled_platforms: list[str] = None

    def __post_init__(self):
        if self.enabled_platforms is None:
            self.enabled_platforms = ["darwin", "linux", "win32"]


class ThermalMonitorError(Exception):
    """Base exception for thermal monitoring errors."""

    pass


class PlatformNotSupportedError(ThermalMonitorError):
    """Raised when thermal monitoring is not supported on the current platform."""

    pass


class ThermalSensorError(ThermalMonitorError):
    """Raised when thermal sensor reading fails."""

    pass


class ThermalGuard(ABC):
    """Abstract base class for platform-specific thermal guards."""

    @abstractmethod
    async def get_thermal_readings(self) -> list[ThermalReading]:
        """Get thermal readings from platform-specific sources."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if thermal monitoring is available on this platform."""
        pass

    @property
    @abstractmethod
    def platform_name(self) -> str:
        """Return the platform name this guard supports."""
        pass


class DarwinThermalGuard(ThermalGuard):
    """Thermal guard for macOS (Darwin) platform."""

    @property
    def platform_name(self) -> str:
        return "darwin"

    def is_available(self) -> bool:
        """Check if macOS thermal tools are available."""
        try:
            # Check for powermetrics (requires sudo, so we just check existence)
            result = subprocess.run(
                ["which", "powermetrics"], capture_output=True, text=True
            )
            if result.returncode == 0:
                return True

            # Fallback: Check for system_profiler
            result = subprocess.run(
                ["which", "system_profiler"], capture_output=True, text=True
            )
            return result.returncode == 0

        except Exception as e:
            logger.warning(
                f"brAInwav macOS thermal guard availability check failed: {e}"
            )
            return False

    async def get_thermal_readings(self) -> list[ThermalReading]:
        """Get thermal readings from macOS system tools."""
        readings = []

        try:
            # Method 1: Try to get thermal state (doesn't require sudo)
            thermal_reading = await self._get_thermal_from_pmset()
            if thermal_reading:
                readings.append(thermal_reading)

            # Method 2: Get CPU temperature estimation
            cpu_reading = await self._get_cpu_thermal_estimate()
            if cpu_reading:
                readings.append(cpu_reading)

        except Exception as e:
            logger.error(f"brAInwav macOS thermal reading failed: {e}")
            raise ThermalSensorError(f"Failed to get macOS thermal readings: {e}")

        if not readings:
            # Fallback: Create a synthetic reading based on system load
            readings.append(await self._get_synthetic_thermal_reading())

        return readings

    async def _get_thermal_from_pmset(self) -> ThermalReading | None:
        """Get thermal state from pmset."""
        try:
            result = await asyncio.create_subprocess_exec(
                "pmset",
                "-g",
                "therm",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await result.communicate()

            if result.returncode == 0:
                output = stdout.decode("utf-8")
                # Parse thermal state - this is a simplified parser
                if "CPU_Speed_Limit" in output:
                    # Estimate temperature based on CPU throttling
                    if "CPU_Speed_Limit = 0" in output:
                        estimated_temp = 45.0  # Normal operation
                    else:
                        estimated_temp = 80.0  # Throttling detected

                    return ThermalReading(
                        device_id="darwin_cpu_thermal",
                        temperature=estimated_temp,
                        threshold_warning=75.0,
                        threshold_critical=85.0,
                        timestamp=datetime.now(UTC),
                        sensor_type="cpu",
                        location="system",
                    )

        except Exception as e:
            logger.debug(f"brAInwav pmset thermal check failed: {e}")

        return None

    async def _get_cpu_thermal_estimate(self) -> ThermalReading | None:
        """Get CPU temperature estimate based on system metrics."""
        try:
            # Get system load to estimate thermal load
            load_avg = os.getloadavg()
            cpu_count = os.cpu_count() or 1

            # Estimate temperature based on load average
            normalized_load = min(1.0, load_avg[0] / cpu_count)
            base_temp = 35.0  # Base temperature
            load_temp = normalized_load * 30.0  # Load contribution
            estimated_temp = base_temp + load_temp

            return ThermalReading(
                device_id="darwin_cpu_estimate",
                temperature=estimated_temp,
                threshold_warning=75.0,
                threshold_critical=85.0,
                timestamp=datetime.now(UTC),
                sensor_type="cpu",
                location="estimated",
            )

        except Exception as e:
            logger.debug(f"brAInwav CPU thermal estimate failed: {e}")

        return None

    async def _get_synthetic_thermal_reading(self) -> ThermalReading:
        """Generate a synthetic thermal reading as fallback."""
        return ThermalReading(
            device_id="darwin_synthetic",
            temperature=45.0,  # Safe default
            threshold_warning=75.0,
            threshold_critical=85.0,
            timestamp=datetime.now(UTC),
            sensor_type="synthetic",
            location="fallback",
        )


class LinuxThermalGuard(ThermalGuard):
    """Thermal guard for Linux platform."""

    @property
    def platform_name(self) -> str:
        return "linux"

    def is_available(self) -> bool:
        """Check if Linux thermal monitoring is available."""
        try:
            # Check for thermal zone files
            thermal_zones = list(self._find_thermal_zones())
            if thermal_zones:
                return True

            # Fallback: Check for sensors command
            result = subprocess.run(
                ["which", "sensors"], capture_output=True, text=True
            )
            return result.returncode == 0

        except Exception as e:
            logger.warning(
                f"brAInwav Linux thermal guard availability check failed: {e}"
            )
            return False

    def _find_thermal_zones(self):
        """Find available thermal zones in /sys/class/thermal/."""
        try:
            thermal_dir = "/sys/class/thermal"
            if os.path.exists(thermal_dir):
                for entry in os.listdir(thermal_dir):
                    if entry.startswith("thermal_zone"):
                        zone_path = os.path.join(thermal_dir, entry)
                        temp_file = os.path.join(zone_path, "temp")
                        if os.path.exists(temp_file):
                            yield zone_path
        except Exception as e:
            logger.debug(f"brAInwav thermal zone discovery failed: {e}")

    async def get_thermal_readings(self) -> list[ThermalReading]:
        """Get thermal readings from Linux thermal zones."""
        readings = []

        try:
            # Method 1: Read from thermal zones
            for zone_path in self._find_thermal_zones():
                reading = await self._read_thermal_zone(zone_path)
                if reading:
                    readings.append(reading)

            # Method 2: Try sensors command
            if not readings:
                sensor_readings = await self._get_sensors_readings()
                readings.extend(sensor_readings)

        except Exception as e:
            logger.error(f"brAInwav Linux thermal reading failed: {e}")
            raise ThermalSensorError(f"Failed to get Linux thermal readings: {e}")

        if not readings:
            # Fallback: Create a synthetic reading
            readings.append(await self._get_synthetic_thermal_reading())

        return readings

    async def _read_thermal_zone(self, zone_path: str) -> ThermalReading | None:
        """Read temperature from a thermal zone."""
        try:
            temp_file = os.path.join(zone_path, "temp")
            type_file = os.path.join(zone_path, "type")

            # Read temperature (in millidegrees Celsius)
            with open(temp_file) as f:
                temp_millidegrees = int(f.read().strip())
                temperature = temp_millidegrees / 1000.0

            # Read sensor type
            sensor_type = "unknown"
            if os.path.exists(type_file):
                with open(type_file) as f:
                    sensor_type = f.read().strip()

            zone_name = os.path.basename(zone_path)

            return ThermalReading(
                device_id=f"linux_{zone_name}",
                temperature=temperature,
                threshold_warning=75.0,
                threshold_critical=85.0,
                timestamp=datetime.now(UTC),
                sensor_type=sensor_type,
                location=zone_path,
            )

        except Exception as e:
            logger.debug(f"brAInwav failed to read thermal zone {zone_path}: {e}")

        return None

    async def _get_sensors_readings(self) -> list[ThermalReading]:
        """Get thermal readings using the sensors command."""
        readings = []

        try:
            result = await asyncio.create_subprocess_exec(
                "sensors",
                "-A",
                "-j",  # JSON output if available
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await result.communicate()

            if result.returncode == 0:
                output = stdout.decode("utf-8")
                # Parse sensors output (simplified)
                lines = output.split("\n")
                for line in lines:
                    if "°C" in line and "+" in line:
                        # Simple parsing for temperature values
                        try:
                            temp_start = line.find("+") + 1
                            temp_end = line.find("°C")
                            if temp_start > 0 and temp_end > temp_start:
                                temp_str = line[temp_start:temp_end]
                                temperature = float(temp_str)

                                readings.append(
                                    ThermalReading(
                                        device_id=f"linux_sensors_{len(readings)}",
                                        temperature=temperature,
                                        threshold_warning=75.0,
                                        threshold_critical=85.0,
                                        timestamp=datetime.now(UTC),
                                        sensor_type="sensors",
                                        location="sensors_command",
                                    )
                                )
                        except ValueError:
                            continue

        except Exception as e:
            logger.debug(f"brAInwav sensors command failed: {e}")

        return readings

    async def _get_synthetic_thermal_reading(self) -> ThermalReading:
        """Generate a synthetic thermal reading as fallback."""
        return ThermalReading(
            device_id="linux_synthetic",
            temperature=50.0,  # Safe default
            threshold_warning=75.0,
            threshold_critical=85.0,
            timestamp=datetime.now(UTC),
            sensor_type="synthetic",
            location="fallback",
        )


class WindowsThermalGuard(ThermalGuard):
    """Thermal guard for Windows platform."""

    @property
    def platform_name(self) -> str:
        return "win32"

    def is_available(self) -> bool:
        """Check if Windows thermal monitoring is available."""
        try:
            # Check WMI availability for thermal monitoring
            result = subprocess.run(
                [
                    "wmic",
                    "/namespace:\\\\root\\wmi",
                    "PATH",
                    "MSAcpi_ThermalZoneTemperature",
                    "get",
                    "CurrentTemperature",
                    "/format:list",
                ],
                capture_output=True,
                text=True,
                shell=True,
            )

            return result.returncode == 0 and "CurrentTemperature" in result.stdout

        except Exception as e:
            logger.warning(
                f"brAInwav Windows thermal guard availability check failed: {e}"
            )
            return False

    async def get_thermal_readings(self) -> list[ThermalReading]:
        """Get thermal readings from Windows WMI."""
        readings = []

        try:
            # Method 1: WMI thermal zones
            wmi_readings = await self._get_wmi_thermal_readings()
            readings.extend(wmi_readings)

        except Exception as e:
            logger.error(f"brAInwav Windows thermal reading failed: {e}")
            raise ThermalSensorError(f"Failed to get Windows thermal readings: {e}")

        if not readings:
            # Fallback: Create a synthetic reading
            readings.append(await self._get_synthetic_thermal_reading())

        return readings

    async def _get_wmi_thermal_readings(self) -> list[ThermalReading]:
        """Get thermal readings from WMI."""
        readings = []

        try:
            result = await asyncio.create_subprocess_exec(
                "wmic",
                "/namespace:\\\\root\\wmi",
                "PATH",
                "MSAcpi_ThermalZoneTemperature",
                "get",
                "InstanceName,CurrentTemperature",
                "/format:csv",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                shell=True,
            )
            stdout, stderr = await result.communicate()

            if result.returncode == 0:
                output = stdout.decode("utf-8")
                lines = output.strip().split("\n")[1:]  # Skip header

                for i, line in enumerate(lines):
                    if line.strip():
                        parts = line.split(",")
                        if len(parts) >= 3:
                            try:
                                # WMI temperature is in tenths of Kelvin
                                temp_kelvin_tenths = int(parts[1])
                                temp_celsius = (temp_kelvin_tenths / 10.0) - 273.15

                                readings.append(
                                    ThermalReading(
                                        device_id=f"windows_thermal_zone_{i}",
                                        temperature=temp_celsius,
                                        threshold_warning=75.0,
                                        threshold_critical=85.0,
                                        timestamp=datetime.now(UTC),
                                        sensor_type="thermal_zone",
                                        location=parts[2]
                                        if len(parts) > 2
                                        else "unknown",
                                    )
                                )
                            except (ValueError, IndexError):
                                continue

        except Exception as e:
            logger.debug(f"brAInwav WMI thermal reading failed: {e}")

        return readings

    async def _get_synthetic_thermal_reading(self) -> ThermalReading:
        """Generate a synthetic thermal reading as fallback."""
        return ThermalReading(
            device_id="windows_synthetic",
            temperature=55.0,  # Safe default
            threshold_warning=75.0,
            threshold_critical=85.0,
            timestamp=datetime.now(UTC),
            sensor_type="synthetic",
            location="fallback",
        )


class ThermalMonitor:
    """brAInwav cross-platform thermal monitoring service."""

    def __init__(self, config: ThermalConfig = None, bus=None):
        self.config = config or ThermalConfig()
        self.bus = bus  # A2A message bus for event dispatch
        self._guard = self._create_platform_guard()
        self._monitoring = False
        self._monitor_task: asyncio.Task | None = None
        self._lock = asyncio.Lock()

        logger.info(
            f"brAInwav thermal monitor initialized for platform: {platform.system()}"
        )

    def _create_platform_guard(self) -> ThermalGuard:
        """Create the appropriate thermal guard for the current platform."""
        current_platform = platform.system().lower()

        if current_platform not in self.config.enabled_platforms:
            raise PlatformNotSupportedError(
                f"brAInwav thermal monitoring not enabled for platform: {current_platform}"
            )

        if current_platform == "darwin":
            guard = DarwinThermalGuard()
        elif current_platform == "linux":
            guard = LinuxThermalGuard()
        elif current_platform in ["windows", "win32"]:
            guard = WindowsThermalGuard()
        else:
            raise PlatformNotSupportedError(
                f"brAInwav thermal monitoring not supported for platform: {current_platform}"
            )

        if not guard.is_available():
            logger.warning(
                f"brAInwav thermal monitoring not available on {current_platform}, "
                "will use synthetic readings"
            )

        return guard

    async def start_monitoring(self):
        """Start continuous thermal monitoring."""
        async with self._lock:
            if self._monitoring:
                logger.warning("brAInwav thermal monitoring already running")
                return

            self._monitoring = True
            self._monitor_task = asyncio.create_task(self._monitor_loop())
            logger.info("brAInwav thermal monitoring started")

    async def stop_monitoring(self):
        """Stop thermal monitoring."""
        async with self._lock:
            if not self._monitoring:
                return

            self._monitoring = False
            if self._monitor_task:
                self._monitor_task.cancel()
                try:
                    await self._monitor_task
                except asyncio.CancelledError:
                    pass
                self._monitor_task = None

            logger.info("brAInwav thermal monitoring stopped")

    async def get_current_readings(self) -> list[ThermalReading]:
        """Get current thermal readings."""
        try:
            return await self._guard.get_thermal_readings()
        except Exception as e:
            logger.error(f"brAInwav failed to get thermal readings: {e}")
            return []

    async def _monitor_loop(self):
        """Main monitoring loop."""
        logger.info(
            f"brAInwav thermal monitoring loop started (interval: {self.config.check_interval_seconds}s)"
        )

        while self._monitoring:
            try:
                readings = await self._guard.get_thermal_readings()
                await self._process_readings(readings)

                await asyncio.sleep(self.config.check_interval_seconds)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"brAInwav thermal monitoring error: {e}")
                await asyncio.sleep(self.config.check_interval_seconds)

    async def _process_readings(self, readings: list[ThermalReading]):
        """Process thermal readings and dispatch events."""
        for reading in readings:
            await self._check_thermal_thresholds(reading)

    async def _check_thermal_thresholds(self, reading: ThermalReading):
        """Check thermal thresholds and dispatch events."""
        temperature = reading.temperature

        if temperature >= self.config.shutdown_threshold:
            await self._dispatch_thermal_event(
                reading, "critical", "emergency_shutdown_required"
            )
        elif temperature >= self.config.critical_threshold:
            await self._dispatch_thermal_event(
                reading, "critical", "critical_temperature_reached"
            )
        elif temperature >= self.config.warning_threshold:
            await self._dispatch_thermal_event(
                reading, "warning", "temperature_warning"
            )
        else:
            await self._dispatch_thermal_event(reading, "normal", None)

    async def _dispatch_thermal_event(
        self, reading: ThermalReading, status: str, action: str | None
    ):
        """Dispatch thermal event via A2A messaging."""
        if not self.bus:
            logger.debug("brAInwav no A2A bus configured, thermal event not dispatched")
            return

        try:
            event = create_mlx_thermal_event(
                device_id=reading.device_id,
                temperature=reading.temperature,
                threshold=reading.threshold_critical,
                status=status,
                action_taken=action,
            )

            # Dispatch via A2A bus
            await self.bus.handle_message(event)

            logger.info(
                f"brAInwav thermal event dispatched: device={reading.device_id}, "
                f"temp={reading.temperature:.1f}°C, status={status}"
            )

        except Exception as e:
            logger.error(f"brAInwav failed to dispatch thermal event: {e}")

    def is_monitoring(self) -> bool:
        """Check if thermal monitoring is active."""
        return self._monitoring

    @property
    def platform_guard(self) -> ThermalGuard:
        """Get the current platform guard."""
        return self._guard
