#!/bin/bash

# Start MCP Server for brAInwav Cortex-OS
# This script starts the MCP server using FastMCP CLI over HTTP

set -euo pipefail

# Enable logging
exec 1> >(tee -a /Users/jamiecraik/.Cortex-OS/logs/mcp-server-startup.log)
exec 2>&1

echo "[$(date)] Starting MCP Server startup script..."

# Define paths
MCP_DIR="/Users/jamiecraik/.Cortex-OS/packages/cortex-mcp"
PYTHON_PATH="/Users/jamiecraik/.local/share/mise/installs/python/3.12.6/bin/python"
BIN_DIR="$(dirname "$PYTHON_PATH")"
LOG_DIR="/Users/jamiecraik/.Cortex-OS/logs"
SERVER_FILE="$MCP_DIR/cortex_fastmcp_server_v2.py"
MCP_PORT="${MCP_PORT:-3024}"
MCP_TRANSPORT="${MCP_TRANSPORT:-http}"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

echo "[$(date)] MCP_DIR: $MCP_DIR"
echo "[$(date)] PYTHON_PATH: $PYTHON_PATH"
echo "[$(date)] LOG_DIR: $LOG_DIR"
echo "[$(date)] SERVER_FILE: $SERVER_FILE"

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

# Check FastAPI and Uvicorn (used by FastMCP HTTP transport)
"$PYTHON_PATH" -c "import fastapi, uvicorn; print('FastAPI and Uvicorn available')" || {
    echo "[$(date)] Error: FastAPI or Uvicorn not available"
    echo "[$(date)] Installing required packages..."
    "$PYTHON_PATH" -m pip install --upgrade pip >/dev/null 2>&1 || true
    "$PYTHON_PATH" -m pip install fastapi uvicorn >/dev/null 2>&1
}

# Ensure FastMCP CLI is available
FASTMCP_BIN="$BIN_DIR/fastmcp"
if ! "$PYTHON_PATH" -c "import importlib, sys; import shutil; sys.exit(0 if shutil.which('fastmcp') else 1)"; then
  echo "[$(date)] FastMCP CLI not found in PATH; attempting installation into the selected Python env..."
  "$PYTHON_PATH" -m pip install fastmcp >/dev/null 2>&1 || true
fi
# Re-resolve CLI path after potential install
if [ ! -x "$FASTMCP_BIN" ]; then
  FASTMCP_BIN="$(command -v fastmcp || true)"
fi
if [ -z "${FASTMCP_BIN:-}" ] || [ ! -x "$FASTMCP_BIN" ]; then
  echo "[$(date)] Error: FastMCP CLI is not installed or not found in PATH. Please install with: $PYTHON_PATH -m pip install fastmcp"
  exit 1
fi

# Change to MCP directory
cd "$MCP_DIR" || {
    echo "[$(date)] Error: Failed to change to MCP directory"
    exit 1
}

# Startup banner
echo "[$(date)] Starting MCP Server for brAInwav Cortex-OS..."
echo "[$(date)] Server will be available at http://0.0.0.0:$MCP_PORT"
echo "[$(date)] Local access: http://127.0.0.1:$MCP_PORT"
echo "[$(date)] Access via Cloudflare tunnel at: https://cortex-mcp.brainwav.io"

# Self-check guard: refuse startup if legacy port 3004 reintroduced (suppress if file missing)
if grep -En '3004' "$MCP_DIR/run_server.py" >/dev/null 2>&1; then
    echo "[$(date)] ERROR: Detected forbidden legacy port 3004 in run_server.py. Aborting startup." >&2
    grep -En '3004' "$MCP_DIR/run_server.py" | head -5 >&2
    exit 1
fi

if [ "$MCP_PORT" = "3004" ]; then
    echo "[$(date)] ERROR: MCP_PORT resolved to forbidden legacy port 3004. Set MCP_PORT=3024 (fixed) or update config." >&2
    exit 1
fi

# Set environment variables
export PYTHONPATH="$MCP_DIR:/Users/jamiecraik/.Cortex-OS/python:${PYTHONPATH:-}"
export UVICORN_LOG_LEVEL="info"
export PYTHONUNBUFFERED="1"
# Hint to our server to force HTTP app detection when transport is HTTP
export MCP_FORCE_HTTP_APP="1"

echo "[$(date)] Environment:"
echo "[$(date)] PYTHONPATH=$PYTHONPATH"
echo "[$(date)] UVICORN_LOG_LEVEL=$UVICORN_LOG_LEVEL"
echo "[$(date)] PYTHONUNBUFFERED=$PYTHONUNBUFFERED"
echo "[$(date)] PWD=$(pwd)"
echo "[$(date)] FASTMCP_BIN=$FASTMCP_BIN"

# Compose and exec FastMCP run command
CMD=("$FASTMCP_BIN" run "$SERVER_FILE" --transport "$MCP_TRANSPORT" --port "$MCP_PORT")
echo "[$(date)] Executing: ${CMD[*]}"

# Optional daemon mode to keep process alive beyond invoking shell
if [ "${MCP_DAEMON:-0}" = "1" ] || [ "${1:-}" = "--daemon" ]; then
    echo "[$(date)] Daemon mode enabled; starting with nohup and writing PID file"
    mkdir -p /Users/jamiecraik/.Cortex-OS/logs
    LOG_FILE="/Users/jamiecraik/.Cortex-OS/logs/mcp-server.log"
    PID_FILE="/Users/jamiecraik/.Cortex-OS/logs/mcp-server.pid"
    # shellcheck disable=SC2086
    nohup "${CMD[@]}" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "[$(date)] MCP server started (PID $(cat "$PID_FILE")); logs: $LOG_FILE"
    exit 0
fi

exec "${CMD[@]}"
