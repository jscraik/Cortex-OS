#!/usr/bin/env bash
# brAInwav Cortex MCP Server - STDIO Launcher for Perplexity/Claude
# This script ensures the server starts in STDIO mode with proper environment

set -euo pipefail

# CRITICAL: Change to the MCP server directory to ensure correct module resolution
cd /Users/jamiecraik/.Cortex-OS/packages/mcp-server || exit 1

# Set environment for STDIO mode
export MCP_TRANSPORT=stdio
export LOCAL_MEMORY_BASE_URL="${LOCAL_MEMORY_BASE_URL:-http://localhost:9400}"
export PIECES_MCP_ENABLED="${PIECES_MCP_ENABLED:-false}"
export AGENT_TOOLKIT_ENABLED="${AGENT_TOOLKIT_ENABLED:-true}"
export MCP_LOG_LEVEL="${MCP_LOG_LEVEL:-info}"

# Find node executable - prefer 22.19.0 for compatibility
NODE_BIN=""
if [ -f "/Users/jamiecraik/.local/share/mise/installs/node/22.19.0/bin/node" ]; then
    NODE_BIN="/Users/jamiecraik/.local/share/mise/installs/node/22.19.0/bin/node"
elif command -v node &> /dev/null; then
    NODE_BIN=$(command -v node)
else
    echo "ERROR: node executable not found" >&2
    exit 127
fi

# Start the server in STDIO mode
exec "$NODE_BIN" dist/index.js
