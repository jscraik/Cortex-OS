#!/bin/bash

# Start MCP Server for brAInwav Cortex-OS
# This script starts the TypeScript MCP server

set -euo pipefail

# Enable logging
exec 1> >(tee -a /Users/jamiecraik/.Cortex-OS/logs/mcp-server-startup.log)
exec 2>&1

echo "[$(date)] Starting MCP Server startup script..."

# Define paths
CORTEX_DIR="/Users/jamiecraik/.Cortex-OS"
MCP_SERVER_DIR="$CORTEX_DIR/packages/mcp-server"
NODE_PATH="/Users/jamiecraik/.local/share/mise/installs/node/22.11.0/bin/node"
LOG_DIR="/Users/jamiecraik/.Cortex-OS/logs"
MCP_PORT="${MCP_PORT:-3024}"
MCP_LOG_LEVEL="${MCP_LOG_LEVEL:-info}"
LOCAL_MEMORY_BASE_URL="${LOCAL_MEMORY_BASE_URL:-http://127.0.0.1:9400}"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

echo "[$(date)] CORTEX_DIR: $CORTEX_DIR"
echo "[$(date)] MCP_SERVER_DIR: $MCP_SERVER_DIR"
echo "[$(date)] NODE_PATH: $NODE_PATH"
echo "[$(date)] LOG_DIR: $LOG_DIR"

# Check if Node.js exists
NODE_BIN="$NODE_PATH"
if [ ! -f "$NODE_BIN" ]; then
    echo "[$(date)] Error: Node.js not found at $NODE_BIN"
    # Try to find node in PATH
    NODE_BIN=$(which node 2>/dev/null || true)
    if [ -z "$NODE_BIN" ]; then
        echo "[$(date)] Error: Node.js not found in PATH"
        exit 1
    fi
    echo "[$(date)] Found Node.js at: $NODE_BIN"
fi

# Check if the MCP server directory exists
if [ ! -d "$MCP_SERVER_DIR" ]; then
    echo "[$(date)] Error: MCP server directory not found at $MCP_SERVER_DIR"
    exit 1
fi

# Validate Node.js version
echo "[$(date)] Validating Node.js environment..."
"$NODE_BIN" --version || {
    echo "[$(date)] Error: Node.js validation failed"
    exit 1
}

# Change to Cortex directory
cd "$CORTEX_DIR" || {
    echo "[$(date)] Error: Failed to change to Cortex directory"
    exit 1
}

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ ! -d "packages/mcp-server/node_modules" ]; then
    echo "[$(date)] Installing dependencies..."
    pnpm install || {
        echo "[$(date)] Error: Failed to install dependencies"
        exit 1
    }
fi

# Build packages if needed
if [ ! -f "packages/memory-core/dist/index.js" ] || [ ! -f "packages/tool-spec/dist/index.js" ]; then
    echo "[$(date)] Building packages..."
    pnpm build --filter="@cortex-os/memory-core" --filter="@cortex-os/tool-spec" || {
        echo "[$(date)] Error: Failed to build dependencies"
        exit 1
    }
fi

# Build mcp-server
if [ ! -f "packages/mcp-server/dist/index.js" ]; then
    echo "[$(date)] Building mcp-server..."
    cd packages/mcp-server
    pnpm build || {
        echo "[$(date)] Error: Failed to build mcp-server"
        exit 1
    }
    cd "$CORTEX_DIR"
fi

# Startup banner
echo "[$(date)] Starting TypeScript MCP Server for brAInwav Cortex-OS..."
echo "[$(date)] Server will be available at http://0.0.0.0:$MCP_PORT"
echo "[$(date)] Local access: http://127.0.0.1:$MCP_PORT"
echo "[$(date)] Access via Cloudflare tunnel at: https://cortex-mcp.brainwav.io"

# Set environment variables
export NODE_PATH="$CORTEX_DIR"
export NODE_ENV="production"
export MCP_PORT="$MCP_PORT"
export MCP_LOG_LEVEL="$MCP_LOG_LEVEL"

echo "[$(date)] Environment:"
echo "[$(date)] NODE_PATH=$NODE_PATH"
echo "[$(date)] NODE_ENV=$NODE_ENV"
echo "[$(date)] MCP_PORT=$MCP_PORT"
echo "[$(date)] MCP_LOG_LEVEL=$MCP_LOG_LEVEL"
echo "[$(date)] LOCAL_MEMORY_BASE_URL=$LOCAL_MEMORY_BASE_URL"
echo "[$(date)] PWD=$(pwd)"

# Prepare command
export LOCAL_MEMORY_BASE_URL
if [ -f "$MCP_SERVER_DIR/dist/index.js" ]; then
    CMD=("$NODE_BIN" "$MCP_SERVER_DIR/dist/index.js" --transport http --port "$MCP_PORT")
else
    echo "[$(date)] Error: MCP server build not found"
    exit 1
fi
echo "[$(date)] Executing: ${CMD[*]}"

# Optional daemon mode
if [ "${MCP_DAEMON:-0}" = "1" ] || [ "${1:-}" = "--daemon" ]; then
    echo "[$(date)] Daemon mode enabled; starting with nohup and writing PID file"
    mkdir -p "$LOG_DIR"
    LOG_FILE="$LOG_DIR/mcp-server.log"
    PID_FILE="$LOG_DIR/mcp-server.pid"
    nohup "${CMD[@]}" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "[$(date)] MCP server started (PID $(cat "$PID_FILE")); logs: $LOG_FILE"
    exit 0
fi

exec "${CMD[@]}"
