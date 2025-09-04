#!/usr/bin/env python3
"""
Simple MCP Health Server
Runs on port 3000 to serve health checks for Cloudflare tunnel
"""

import http.server
import json
import signal
import socketserver
import sys
from datetime import datetime


class MCPHealthHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ["/", "/health"]:
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            response = {
                "status": "ok",
                "service": "mcp-health",
                "port": 3000,
                "timestamp": datetime.now().isoformat(),
                "message": "MCP server health check endpoint",
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            error_response = {"error": "Not found", "path": self.path}
            self.wfile.write(json.dumps(error_response).encode())

    def log_message(self, format, *args):
        # Suppress default HTTP server logs
        pass


def signal_handler(sig, frame):
    print("\nShutting down MCP health service...")
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    PORT = 3000

    try:
        with socketserver.TCPServer(("", PORT), MCPHealthHandler) as httpd:
            print(f"MCP Health Server started on port {PORT}")
            print(f"Health check: http://localhost:{PORT}/health")
            print("Press Ctrl+C to stop")
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"ERROR: Port {PORT} is already in use")
            sys.exit(1)
        else:
            raise
    except KeyboardInterrupt:
        print("\nService stopped by user")
        sys.exit(0)
