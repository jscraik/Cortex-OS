# GPL Tools Service - Isolated GPL Terminal Visualization Tools
# This service provides isolated GPL-licensed visualization tools
FROM python:3.11-slim

# Install system dependencies including common visualization tools
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnuplot \
    graphviz \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -u 1000 gpluser && \
    mkdir -p /app/images /app/output && \
    chown -R gpluser:gpluser /app

# Set working directory
WORKDIR /app

# Copy application code
COPY --chown=gpluser:gpluser . .

# Create HTTP API for GPL tools
RUN echo 'from http.server import HTTPServer, BaseHTTPRequestHandler\n\
import json\n\
import subprocess\n\
import os\n\
import base64\n\
import tempfile\n\
import uuid\n\
from urllib.parse import urlparse, parse_qs\n\
\nclass GPLToolsHandler(BaseHTTPRequestHandler):\n\
    def do_GET(self):\n\
        if self.path == "/health":\n\
            self.send_response(200)\n\
            self.send_header("Content-type", "application/json")\n\
            self.end_headers()\n\
            self.wfile.write(json.dumps({\n\
                "status": "healthy", \n\
                "service": "gpl-tools",\n\
                "available_tools": ["gnuplot", "graphviz"]\n\
            }).encode())\n\
        else:\n\
            self.send_error(404)\n\
\n\
    def do_POST(self):\n\
        if self.path == "/plot":\n\
            content_length = int(self.headers["Content-Length"])\n\
            post_data = self.rfile.read(content_length)\n\
            \n\
            try:\n\
                data = json.loads(post_data.decode("utf-8"))\n\
                tool = data.get("tool", "gnuplot")\n\
                plot_data = data.get("data", "")\n\
                format_type = data.get("format", "png")\n\
                \n\
                if tool == "gnuplot":\n\
                    result = self._generate_gnuplot(plot_data, format_type)\n\
                elif tool == "graphviz":\n\
                    result = self._generate_graphviz(plot_data, format_type)\n\
                else:\n\
                    raise ValueError(f"Unsupported tool: {tool}")\n\
                \n\
                self.send_response(200)\n\
                self.send_header("Content-type", "application/json")\n\
                self.end_headers()\n\
                self.wfile.write(json.dumps({\n\
                    "success": True,\n\
                    "image": result,\n\
                    "format": format_type\n\
                }).encode())\n\
                \n\
            except Exception as e:\n\
                self.send_response(500)\n\
                self.send_header("Content-type", "application/json")\n\
                self.end_headers()\n\
                self.wfile.write(json.dumps({\n\
                    "success": False,\n\
                    "error": str(e)\n\
                }).encode())\n\
        else:\n\
            self.send_error(404)\n\
    \n\
    def _generate_gnuplot(self, data, format_type):\n\
        # Create temporary files\n\
        with tempfile.NamedTemporaryFile(mode="w", suffix=".gp", delete=False) as script_file:\n\
            script_file.write(data)\n\
            script_path = script_file.name\n\
        \n\
        output_path = f"/tmp/{uuid.uuid4()}.{format_type}"\n\
        \n\
        try:\n\
            # Run gnuplot\n\
            subprocess.run([\n\
                "gnuplot", \n\
                "-e", f"set terminal {format_type}",\n\
                "-e", f"set output \'{output_path}\'",\n\
                script_path\n\
            ], check=True, capture_output=True)\n\
            \n\
            # Read and encode the output\n\
            with open(output_path, "rb") as f:\n\
                image_data = f.read()\n\
            \n\
            return base64.b64encode(image_data).decode("utf-8")\n\
            \n\
        finally:\n\
            # Clean up\n\
            os.unlink(script_path)\n\
            if os.path.exists(output_path):\n\
                os.unlink(output_path)\n\
    \n\
    def _generate_graphviz(self, data, format_type):\n\
        # Create temporary files\n\
        with tempfile.NamedTemporaryFile(mode="w", suffix=".dot", delete=False) as dot_file:\n\
            dot_file.write(data)\n\
            dot_path = dot_file.name\n\
        \n\
        output_path = f"/tmp/{uuid.uuid4()}.{format_type}"\n\
        \n\
        try:\n\
            # Run graphviz\n\
            subprocess.run([\n\
                "dot", \n\
                f"-T{format_type}",\n\
                "-o", output_path,\n\
                dot_path\n\
            ], check=True, capture_output=True)\n\
            \n\
            # Read and encode the output\n\
            with open(output_path, "rb") as f:\n\
                image_data = f.read()\n\
            \n\
            return base64.b64encode(image_data).decode("utf-8")\n\
            \n\
        finally:\n\
            # Clean up\n\
            os.unlink(dot_path)\n\
            if os.path.exists(output_path):\n\
                os.unlink(output_path)\n\
    \n\
    def log_message(self, format, *args):\n\
        pass  # Disable logging for cleaner output\n\
\n\
if __name__ == "__main__":\n\
    port = 8765\n\
    host = "0.0.0.0"\n\
    \n\
    server = HTTPServer((host, port), GPLToolsHandler)\n\
    print(f"GPL Tools HTTP API running on {host}:{port}")\n\
    server.serve_forever()\n' > server.py

# Set permissions
RUN chmod +x server.py

# Switch to non-root user
USER gpluser

# Expose API port
EXPOSE 8765

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8765/health || exit 1

# Start the service
CMD ["python", "server.py"]