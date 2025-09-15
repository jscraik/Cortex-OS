#!/bin/bash

# Start MCP Server for brAInwav Cortex-OS
# This script starts the MCP server with the correct configuration

set -euo pipefail

# Enable logging
exec 1> >(tee -a /Users/jamiecraik/.Cortex-OS/logs/mcp-server-startup.log)
exec 2>&1

echo "[$(date)] Starting MCP Server startup script..."

# Define paths
MCP_DIR="/Users/jamiecraik/.Cortex-OS/packages/mcp"
PYTHON_PATH="/Users/jamiecraik/.local/share/mise/installs/python/3.12.6/bin/python"
LOG_DIR="/Users/jamiecraik/.Cortex-OS/logs"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

echo "[$(date)] MCP_DIR: $MCP_DIR"
echo "[$(date)] PYTHON_PATH: $PYTHON_PATH"
echo "[$(date)] LOG_DIR: $LOG_DIR"

# Check if the Python interpreter exists
if [ ! -f "$PYTHON_PATH" ]; then
    echo "[$(date)] Error: Python interpreter not found at $PYTHON_PATH"
    exit 1
fi

# Check if the MCP directory exists
if [ ! -d "$MCP_DIR" ]; then
    echo "[$(date)] Error: MCP directory not found at $MCP_DIR"
    exit 1
fi

# Validate Python interpreter and check packages
echo "[$(date)] Validating Python environment..."
"$PYTHON_PATH" -c "import sys; print(f'Python version: {sys.version}')" || {
    echo "[$(date)] Error: Python interpreter validation failed"
    exit 1
}

# Check FastAPI and Uvicorn
"$PYTHON_PATH" -c "import fastapi, uvicorn; print('FastAPI and Uvicorn available')" || {
    echo "[$(date)] Error: FastAPI or Uvicorn not available"
    echo "[$(date)] Installing required packages..."
    "$PYTHON_PATH" -m pip install fastapi uvicorn
}

# Change to MCP directory
cd "$MCP_DIR" || {
    echo "[$(date)] Error: Failed to change to MCP directory"
    exit 1
}


# Start the MCP server with proper Python path
echo "[$(date)] Starting MCP Server for brAInwav Cortex-OS..."
echo "[$(date)] Server will be available at http://0.0.0.0:3024"
echo "[$(date)] Local access: http://127.0.0.1:3024"
echo "[$(date)] Access via Cloudflare tunnel at: https://cortex-mcp.brainwav.io"

# Self-check guard: refuse startup if legacy port 3004 reintroduced
if grep -En '3004' "$MCP_DIR/run_server.py" >/dev/null; then
    echo "[$(date)] ERROR: Detected forbidden legacy port 3004 in run_server.py. Aborting startup." >&2
    grep -En '3004' "$MCP_DIR/run_server.py" | head -5 >&2
    exit 1
fi

if [ "${MCP_PORT:-3024}" = "3004" ]; then
    echo "[$(date)] ERROR: MCP_PORT resolved to forbidden legacy port 3004. Set MCP_PORT=3024 (fixed) or update config." >&2
    exit 1
fi

# Set environment variables
export PYTHONPATH="$MCP_DIR:${PYTHONPATH:-}"
export UVICORN_LOG_LEVEL="info"
export PYTHONUNBUFFERED="1"

echo "[$(date)] Environment:"
echo "[$(date)] PYTHONPATH=$PYTHONPATH"
echo "[$(date)] UVICORN_LOG_LEVEL=$UVICORN_LOG_LEVEL"
echo "[$(date)] PYTHONUNBUFFERED=$PYTHONUNBUFFERED"
echo "[$(date)] PWD=$(pwd)"

# Run the server directly with proper error handling
echo "[$(date)] Executing: $PYTHON_PATH run_server.py"
exec "$PYTHON_PATH" run_server.py
