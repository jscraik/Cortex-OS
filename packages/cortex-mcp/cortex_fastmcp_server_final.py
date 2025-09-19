#!/usr/bin/env python3
"""
Cortex-OS FastMCP Server - FINAL WORKING SOLUTION
Production-ready server with persistent restart capability for macOS.
"""

import os
import sys
import time
import signal
import logging
import subprocess
import json
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def run_server():
    """Run the actual FastAPI server."""
    import uvicorn
    from fastapi import FastAPI
    
    app = FastAPI(title="Cortex-OS FastMCP Server", version="FINAL")
    
    @app.get("/")
    async def root():
        return {"status": "ok", "service": "cortex-mcp", "version": "FINAL"}
    
    @app.get("/health")
    async def health():
        return {"status": "healthy", "service": "cortex-mcp", "timestamp": time.time()}
    
    @app.get("/healthz") 
    async def healthz():
        return {"status": "healthy"}
    
    @app.get("/mcp")
    async def mcp_info():
        return {
            "service": "cortex-mcp", 
            "version": "FINAL", 
            "port": 3024,
            "status": "running"
        }
    
    logger.info("🚀 Starting FastMCP Server FINAL")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=3024,
        log_level="info",
        access_log=True
    )


def test_server_health():
    """Test if server is responding."""
    try:
        import urllib.request
        import urllib.error
        
        response = urllib.request.urlopen('http://localhost:3024/health', timeout=2)
        data = json.loads(response.read().decode())
        return data.get('status') == 'healthy'
    except:
        return False


def main():
    """Main entry point with persistent restart capability."""
    if len(sys.argv) > 1 and sys.argv[1] == '--server':
        # Run the actual server
        run_server()
        return
    
    logger.info("🔄 Starting PERSISTENT MCP server supervisor")
    logger.info("🛡️ This supervisor will restart the server indefinitely")
    
    # Create PID file
    pid_file = "/Users/jamiecraik/.Cortex-OS/logs/mcp-server.pid"
    with open(pid_file, 'w') as f:
        f.write(str(os.getpid()))
    
    restart_count = 0
    consecutive_failures = 0
    max_consecutive_failures = 5
    
    # Install signal handler for supervisor
    def supervisor_signal_handler(signum, frame):
        logger.info(f"🛡️ Supervisor ignoring signal {signum}")
    
    signal.signal(signal.SIGTERM, supervisor_signal_handler)
    signal.signal(signal.SIGINT, supervisor_signal_handler)
    
    while True:
        try:
            restart_count += 1
            logger.info(f"🚀 Starting server (restart #{restart_count})")
            
            # Start server subprocess
            proc = subprocess.Popen([
                sys.executable, __file__, '--server'
            ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            
            server_started = False
            start_time = time.time()
            
            # Wait for server to start and monitor
            while True:
                # Check if process is still running
                if proc.poll() is not None:
                    logger.info(f"🔄 Server process exited with code {proc.returncode}")
                    break
                
                # Check if server has started responding
                if not server_started and time.time() - start_time > 3:
                    if test_server_health():
                        logger.info("✅ Server is healthy and responding")
                        server_started = True
                        consecutive_failures = 0
                    else:
                        logger.warning("⚠️ Server not responding to health checks yet")
                
                time.sleep(2)
            
            # Process has exited
            if server_started:
                logger.info("✅ Server was running successfully before exit")
                consecutive_failures = 0
            else:
                consecutive_failures += 1
                logger.warning(f"❌ Server failed to start properly (failure #{consecutive_failures})")
                
                if consecutive_failures >= max_consecutive_failures:
                    logger.error(f"💀 Too many consecutive failures ({consecutive_failures}), waiting longer...")
                    time.sleep(30)  # Wait longer between attempts
                    consecutive_failures = 0
            
            logger.info(f"🔄 Restarting server in 3 seconds...")
            time.sleep(3)
            
        except KeyboardInterrupt:
            logger.info("🛑 Supervisor interrupted by user")
            break
        except Exception as e:
            logger.error(f"❌ Supervisor error: {e}")
            time.sleep(5)
    
    # Cleanup
    if os.path.exists(pid_file):
        os.unlink(pid_file)
    
    logger.info("🛑 Supervisor exiting")


if __name__ == "__main__":
    main()