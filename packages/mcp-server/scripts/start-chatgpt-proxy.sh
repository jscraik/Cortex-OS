#!/usr/bin/env bash
# brAInwav ChatGPT Compatibility Proxy Launcher
# This script starts the proxy that adds missing headers for ChatGPT Desktop

set -euo pipefail

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >&2
}

log "Starting brAInwav ChatGPT Compatibility Proxy..."

# Navigate to MCP server directory
cd /Users/jamiecraik/.Cortex-OS/packages/mcp-server || {
    log "ERROR: Cannot change to MCP server directory"
    exit 1
}

# Find node executable
NODE_BIN=""
if [ -f "/Users/jamiecraik/.local/share/mise/installs/node/22.19.0/bin/node" ]; then
    NODE_BIN="/Users/jamiecraik/.local/share/mise/installs/node/22.19.0/bin/node"
elif [ -f "/Users/jamiecraik/.local/share/mise/installs/node/22.12.0/bin/node" ]; then
    NODE_BIN="/Users/jamiecraik/.local/share/mise/installs/node/22.12.0/bin/node"
elif command -v node &> /dev/null; then
    NODE_BIN=$(command -v node)
else
    log "ERROR: node executable not found"
    exit 127
fi

# Environment configuration
export CHATGPT_PROXY_PORT="${CHATGPT_PROXY_PORT:-3025}"
export MCP_PORT="${MCP_PORT:-3024}"
export MCP_HOST="${MCP_HOST:-localhost}"
export PROXY_LOG_LEVEL="${PROXY_LOG_LEVEL:-info}"

log "Using node: $NODE_BIN"
log "Node version: $("$NODE_BIN" --version)"
log "Proxy will listen on port: $CHATGPT_PROXY_PORT"
log "Forwarding to MCP server: $MCP_HOST:$MCP_PORT"

# Start the proxy
exec "$NODE_BIN" dist/chatgpt-proxy.js
