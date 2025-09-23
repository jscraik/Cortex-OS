# Scaphandre Bridge Service - Energy Metrics Collection (GPL Isolation)
# This service provides hardware and energy monitoring metrics
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    procps \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -u 1000 scaphandre && \
    mkdir -p /app && \
    chown -R scaphandre:scaphandre /app

# Set working directory
WORKDIR /app

# Copy application code
COPY --chown=scaphandre:scaphandre . .

# Create metrics endpoint implementation
RUN echo 'from http.server import HTTPServer, BaseHTTPRequestHandler\n\
import json\n\
import subprocess\n\
import os\n\
\nclass MetricsHandler(BaseHTTPRequestHandler):\n\
    def do_GET(self):\n\
        if self.path == "/metrics":\n\
            self.send_response(200)\n\
            self.send_header("Content-type", "text/plain")\n\
            self.end_headers()\n\
            \n\
            # Collect basic system metrics\n\
            try:\n\
                # CPU usage\n\
                cpu_usage = subprocess.run(["top", "-bn1"], capture_output=True, text=True).stdout\n\
                \n\
                # Memory info\n\
                with open("/proc/meminfo", "r") as f:\n\
                    mem_info = f.read()\n\
                \n\
                # Generate Prometheus-style metrics\n\
                metrics = [\n\
                    "# HELP scaphandre_system_cpu_usage System CPU usage percentage",\n\
                    "# TYPE scaphandre_system_cpu_usage gauge",\n\
                    "scaphandre_system_cpu_usage 0.0",\n\
                    "",\n\
                    "# HELP scaphandre_system_memory_bytes System memory usage in bytes",\n\
                    "# TYPE scaphandre_system_memory_bytes gauge",\n\
                ]\n\
                \n\
                # Parse memory info\n\
                for line in mem_info.split("\\n"):\n\
                    if "MemTotal:" in line:\n\
                        total_kb = int(line.split()[1])\n\
                        metrics.append(f"scaphandre_system_memory_total_bytes {total_kb * 1024}")\n\
                    elif "MemAvailable:" in line:\n\
                        avail_kb = int(line.split()[1])\n\
                        metrics.append(f"scaphandre_system_memory_available_bytes {avail_kb * 1024}")\n\
                        used_kb = total_kb - avail_kb\n\
                        metrics.append(f"scaphandre_system_memory_used_bytes {used_kb * 1024}")\n\
                \n\
                # Power metrics (placeholder for actual scaphandre integration)\n\
                metrics.extend([\n\
                    "",\n\
                    "# HELP scaphandre_power_watts System power consumption in watts",\n\
                    "# TYPE scaphandre_power_watts gauge",\n\
                    "scaphandre_power_watts 0.0",\n\
                ])\n\
                \n\
                self.wfile.write("\\n".join(metrics).encode())\n\
            except Exception as e:\n\
                self.send_error(500, str(e))\n\
        elif self.path == "/health":\n\
            self.send_response(200)\n\
            self.send_header("Content-type", "application/json")\n\
            self.end_headers()\n\
            self.wfile.write(json.dumps({"status": "healthy", "service": "scaphandre-bridge"}).encode())\n\
        else:\n\
            self.send_error(404)\n\
\n\
    def log_message(self, format, *args):\n\
        pass  # Disable logging for cleaner output\n\
\n\
if __name__ == "__main__":\n\
    port = int(os.environ.get("SCAPHANDRE_PROMETHEUS_PORT", 8080))\n\
    host = os.environ.get("SCAPHANDRE_PROMETHEUS_HOST", "0.0.0.0")\n\
    \n\
    server = HTTPServer((host, port), MetricsHandler)\n\
    print(f"Scaphandre Bridge metrics server running on {host}:{port}")\n\
    server.serve_forever()\n' > server.py

# Set permissions
RUN chmod +x server.py

# Switch to non-root user
USER scaphandre

# Expose metrics port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the service
CMD ["python", "server.py"]