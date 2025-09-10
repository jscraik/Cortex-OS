#!/usr/bin/env python3
"""
OrbStack-specific metrics collector for Cortex-OS
Monitors container performance, resource usage, and OrbStack-specific metrics
"""

import time
import logging
import os
import docker
import psutil
from datetime import datetime
from typing import Dict, List, Any
from prometheus_client import start_http_server, Gauge, Counter, Histogram
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
import threading

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv('LOG_LEVEL', 'INFO')),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Prometheus metrics
container_cpu_usage = Gauge('orbstack_container_cpu_usage_percent', 'Container CPU usage', ['container_name', 'service'])
container_memory_usage = Gauge('orbstack_container_memory_usage_bytes', 'Container memory usage', ['container_name', 'service'])
container_memory_limit = Gauge('orbstack_container_memory_limit_bytes', 'Container memory limit', ['container_name', 'service'])
container_network_rx = Counter('orbstack_container_network_rx_bytes_total', 'Container network RX bytes', ['container_name', 'service'])
container_network_tx = Counter('orbstack_container_network_tx_bytes_total', 'Container network TX bytes', ['container_name', 'service'])
container_disk_io_read = Counter('orbstack_container_disk_read_bytes_total', 'Container disk read bytes', ['container_name', 'service'])
container_disk_io_write = Counter('orbstack_container_disk_write_bytes_total', 'Container disk write bytes', ['container_name', 'service'])

# OrbStack-specific metrics
orbstack_rosetta_usage = Gauge('orbstack_rosetta_containers_total', 'Number of containers using Rosetta emulation')
orbstack_native_containers = Gauge('orbstack_native_containers_total', 'Number of containers running natively')
orbstack_volume_size = Gauge('orbstack_volume_size_bytes', 'OrbStack volume sizes', ['volume_name', 'service'])
orbstack_build_cache_size = Gauge('orbstack_build_cache_size_bytes', 'OrbStack build cache size')

# Performance metrics
build_time = Histogram('orbstack_build_time_seconds', 'Container build times', ['service', 'platform'])
startup_time = Histogram('orbstack_container_startup_time_seconds', 'Container startup times', ['service'])

class ContainerMetrics(BaseModel):
    name: str
    service: str
    cpu_percent: float
    memory_usage: int
    memory_limit: int
    network_rx: int
    network_tx: int
    disk_read: int
    disk_write: int
    is_rosetta: bool
    platform: str

class OrbStackMonitor:
    def __init__(self):
        self.docker_client = docker.from_env()
        self.monitor_interval = int(os.getenv('MONITOR_INTERVAL', '30'))
        self.app = FastAPI(title="OrbStack Monitor", version="1.0.0")
        self.setup_routes()

    def setup_routes(self):
        @self.app.get("/health")
        async def health_check():
            return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

        @self.app.get("/metrics/containers")
        async def get_container_metrics():
            return self.get_all_container_metrics()

        @self.app.get("/metrics/orbstack")
        async def get_orbstack_metrics():
            return self.get_orbstack_specific_metrics()

    def get_container_service_name(self, container) -> str:
        """Extract service name from container labels"""
        labels = container.attrs.get('Config', {}).get('Labels', {})

        # Check OrbStack service label
        if 'orbstack.service' in labels:
            return labels['orbstack.service']

        # Check docker-compose service label
        if 'com.docker.compose.service' in labels:
            return labels['com.docker.compose.service']

        # Fallback to container name
        return container.name.replace('cortexos_', '').replace('cortex_', '')

    def is_rosetta_container(self, container) -> bool:
        """Check if container is using Rosetta emulation"""
        labels = container.attrs.get('Config', {}).get('Labels', {})

        # Check explicit rosetta label
        if 'orbstack.rosetta' in labels:
            return labels['orbstack.rosetta'].lower() == 'true'

        # Check platform architecture
        platform = container.attrs.get('Platform', '')
        if 'amd64' in platform.lower() and psutil.cpu_count(logical=False) > 4:
            # Likely M1/M2 Mac running x86_64 container
            return True

        return False

    def get_container_platform(self, container) -> str:
        """Get container platform/architecture"""
        platform = container.attrs.get('Platform', 'unknown')
        if not platform or platform == 'unknown':
            # Try to detect from image
            try:
                image = self.docker_client.images.get(container.image.id)
                platform = image.attrs.get('Architecture', 'unknown')
            except:
                platform = 'unknown'
        return platform

    def collect_container_metrics(self) -> List[ContainerMetrics]:
        """Collect metrics from all running containers"""
        containers = []

        try:
            for container in self.docker_client.containers.list():
                try:
                    stats = container.stats(stream=False)

                    # Calculate CPU usage
                    cpu_percent = 0.0
                    if 'cpu_stats' in stats and 'precpu_stats' in stats:
                        cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                                   stats['precpu_stats']['cpu_usage']['total_usage']
                        system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                                      stats['precpu_stats']['system_cpu_usage']

                        if system_delta > 0:
                            cpu_percent = (cpu_delta / system_delta) * \
                                         len(stats['cpu_stats']['cpu_usage']['percpu_usage']) * 100

                    # Memory usage
                    memory_usage = stats.get('memory_stats', {}).get('usage', 0)
                    memory_limit = stats.get('memory_stats', {}).get('limit', 0)

                    # Network I/O
                    networks = stats.get('networks', {})
                    network_rx = sum(net.get('rx_bytes', 0) for net in networks.values())
                    network_tx = sum(net.get('tx_bytes', 0) for net in networks.values())

                    # Disk I/O
                    blkio_stats = stats.get('blkio_stats', {})
                    disk_read = sum(
                        stat.get('value', 0) for stat in blkio_stats.get('io_service_bytes_recursive', [])
                        if stat.get('op') == 'Read'
                    )
                    disk_write = sum(
                        stat.get('value', 0) for stat in blkio_stats.get('io_service_bytes_recursive', [])
                        if stat.get('op') == 'Write'
                    )

                    service_name = self.get_container_service_name(container)
                    is_rosetta = self.is_rosetta_container(container)
                    platform = self.get_container_platform(container)

                    container_metrics = ContainerMetrics(
                        name=container.name,
                        service=service_name,
                        cpu_percent=cpu_percent,
                        memory_usage=memory_usage,
                        memory_limit=memory_limit,
                        network_rx=network_rx,
                        network_tx=network_tx,
                        disk_read=disk_read,
                        disk_write=disk_write,
                        is_rosetta=is_rosetta,
                        platform=platform
                    )

                    containers.append(container_metrics)

                except Exception as e:
                    logger.warning(f"Failed to collect metrics for container {container.name}: {e}")

        except Exception as e:
            logger.error(f"Failed to collect container metrics: {e}")

        return containers

    def update_prometheus_metrics(self, containers: List[ContainerMetrics]):
        """Update Prometheus metrics with collected data"""
        rosetta_count = 0
        native_count = 0

        for container in containers:
            # Update container metrics
            container_cpu_usage.labels(
                container_name=container.name,
                service=container.service
            ).set(container.cpu_percent)

            container_memory_usage.labels(
                container_name=container.name,
                service=container.service
            ).set(container.memory_usage)

            container_memory_limit.labels(
                container_name=container.name,
                service=container.service
            ).set(container.memory_limit)

            # Update counters (these should be monotonically increasing)
            container_network_rx.labels(
                container_name=container.name,
                service=container.service
            )._value._value = container.network_rx

            container_network_tx.labels(
                container_name=container.name,
                service=container.service
            )._value._value = container.network_tx

            container_disk_io_read.labels(
                container_name=container.name,
                service=container.service
            )._value._value = container.disk_read

            container_disk_io_write.labels(
                container_name=container.name,
                service=container.service
            )._value._value = container.disk_write

            # Count Rosetta vs native containers
            if container.is_rosetta:
                rosetta_count += 1
            else:
                native_count += 1

        # Update OrbStack-specific metrics
        orbstack_rosetta_usage.set(rosetta_count)
        orbstack_native_containers.set(native_count)

    def collect_volume_metrics(self):
        """Collect OrbStack volume metrics"""
        try:
            volumes = self.docker_client.volumes.list()
            for volume in volumes:
                # Try to get volume size (this may not work on all systems)
                try:
                    volume_info = volume.attrs
                    labels = volume_info.get('Labels', {})
                    service_name = labels.get('orbstack.service', 'unknown')

                    # This is a simplified approach - actual volume size detection
                    # would require more sophisticated methods
                    orbstack_volume_size.labels(
                        volume_name=volume.name,
                        service=service_name
                    ).set(0)  # Placeholder - implement actual size detection

                except Exception as e:
                    logger.debug(f"Could not get size for volume {volume.name}: {e}")

        except Exception as e:
            logger.error(f"Failed to collect volume metrics: {e}")

    def get_all_container_metrics(self) -> Dict[str, Any]:
        """Get all container metrics as JSON"""
        containers = self.collect_container_metrics()
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "containers": [container.dict() for container in containers],
            "summary": {
                "total_containers": len(containers),
                "rosetta_containers": sum(1 for c in containers if c.is_rosetta),
                "native_containers": sum(1 for c in containers if not c.is_rosetta)
            }
        }

    def get_orbstack_specific_metrics(self) -> Dict[str, Any]:
        """Get OrbStack-specific metrics"""
        try:
            # System information
            system_info = {
                "cpu_count": psutil.cpu_count(),
                "memory_total": psutil.virtual_memory().total,
                "disk_usage": psutil.disk_usage('/').percent,
                "docker_version": self.docker_client.version()
            }

            return {
                "timestamp": datetime.utcnow().isoformat(),
                "system": system_info,
                "orbstack_optimizations": {
                    "rosetta_containers": orbstack_rosetta_usage._value._value,
                    "native_containers": orbstack_native_containers._value._value
                }
            }
        except Exception as e:
            logger.error(f"Failed to get OrbStack metrics: {e}")
            return {"error": str(e)}

    def monitor_loop(self):
        """Main monitoring loop"""
        logger.info(f"Starting OrbStack monitor with {self.monitor_interval}s interval")

        while True:
            try:
                # Collect container metrics
                containers = self.collect_container_metrics()
                self.update_prometheus_metrics(containers)

                # Collect volume metrics
                self.collect_volume_metrics()

                logger.info(f"Collected metrics for {len(containers)} containers")

            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")

            time.sleep(self.monitor_interval)

    def start(self):
        """Start the monitoring service"""
        # Start Prometheus metrics server
        start_http_server(9201)
        logger.info("Prometheus metrics server started on port 9201")

        # Start monitoring loop in background thread
        monitor_thread = threading.Thread(target=self.monitor_loop, daemon=True)
        monitor_thread.start()

        # Start FastAPI server for REST API
        uvicorn.run(self.app, host="0.0.0.0", port=9200, log_level="info")

if __name__ == "__main__":
    monitor = OrbStackMonitor()
    monitor.start()
