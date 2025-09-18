#!/usr/bin/env python3
"""
Cortex-OS FastMCP Server - PRODUCTION SOLUTION
Works around macOS SIGTERM issues by using a persistent restart loop.
"""

import os
import sys
import time
import signal
import logging
import subprocess
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_server():
    """Run the actual FastAPI server."""
    import uvicorn
    from fastapi import FastAPI
    
    app = FastAPI(title="Cortex-OS FastMCP Server", version="PROD")
    
    @app.get("/")
    async def root():
        return {"status": "ok", "service": "cortex-mcp", "version": "PROD"}
    
    @app.get("/health")
    async def health():
        return {"status": "healthy", "service": "cortex-mcp"}
    
    @app.get("/healthz") 
    async def healthz():
        return {"status": "healthy"}
    
    @app.get("/mcp")
    async def mcp_info():
        return {"service": "cortex-mcp", "version": "PROD", "port": 3024}
    
    logger.info("🚀 Starting FastMCP Server")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=3024,
        log_level="info",
        access_log=False
    )


def main():
    """Main entry point with restart loop."""
    if len(sys.argv) > 1 and sys.argv[1] == '--server':
        # Run the actual server
        run_server()
        return
    
    logger.info("🔄 Starting persistent MCP server supervisor")
    
    # Create PID file
    pid_file = "/Users/jamiecraik/.Cortex-OS/logs/mcp-server.pid"
    with open(pid_file, 'w') as f:
        f.write(str(os.getpid()))
    
    restart_count = 0
    max_restarts = 10
    
    while restart_count < max_restarts:
        try:
            logger.info(f"🚀 Starting server (attempt {restart_count + 1})")
            
            # Start server subprocess
            proc = subprocess.Popen([
                sys.executable, __file__, '--server'
            ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            
            # Monitor the process
            while True:
                if proc.poll() is not None:
                    # Process has terminated
                    break
                    
                # Check if server is responding
                try:
                    import urllib.request
                    urllib.request.urlopen('http://localhost:3024/health', timeout=1)
                    logger.info("✅ Server is healthy")
                except:
                    pass
                
                time.sleep(10)  # Check every 10 seconds
            
            exit_code = proc.returncode
            logger.info(f"🔄 Server exited with code {exit_code}")
            
            if exit_code == 0:
                logger.info("✅ Server exited cleanly")
                break
            
            restart_count += 1
            logger.info(f"🔄 Restarting in 5 seconds (attempt {restart_count + 1}/{max_restarts})")
            time.sleep(5)
            
        except KeyboardInterrupt:
            logger.info("🛑 Supervisor interrupted")
            if 'proc' in locals():
                proc.terminate()
            break
        except Exception as e:
            logger.error(f"❌ Supervisor error: {e}")
            restart_count += 1
            time.sleep(5)
    
    # Cleanup
    if os.path.exists(pid_file):
        os.unlink(pid_file)
    
    logger.info("🛑 Supervisor exiting")


if __name__ == "__main__":
    main()