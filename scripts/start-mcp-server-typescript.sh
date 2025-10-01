#!/usr/bin/env bash
# brAInwav Cortex-OS MCP Server (TypeScript/FastMCP v3)
# LaunchAgent startup script for TypeScript MCP server on port 3024

set -euo pipefail

# Logging helper
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >&2
}

log "Starting brAInwav MCP Server (TypeScript) on port 3024..."

# Navigate to MCP server directory
cd /Users/jamiecraik/.Cortex-OS/packages/mcp-server || {
    log "ERROR: Cannot change to MCP server directory"
    exit 1
}

# Find pnpm for building if needed
PNPM_BIN=""
if [ -f "/Users/jamiecraik/.local/share/mise/installs/node/22.11.0/bin/pnpm" ]; then
    PNPM_BIN="/Users/jamiecraik/.local/share/mise/installs/node/22.11.0/bin/pnpm"
elif command -v pnpm &> /dev/null; then
    PNPM_BIN=$(command -v pnpm)
fi

# Ensure the build is up to date
if [ ! -d "dist" ] && [ -n "$PNPM_BIN" ]; then
    log "Building MCP server..."
    "$PNPM_BIN" build
fi

# Find node executable (prefer mise Node v22, fallback to system)
NODE_BIN=""
if [ -f "/Users/jamiecraik/.local/share/mise/installs/node/22.12.0/bin/node" ]; then
    NODE_BIN="/Users/jamiecraik/.local/share/mise/installs/node/22.12.0/bin/node"
elif [ -f "/Users/jamiecraik/.local/share/mise/installs/node/22.11.0/bin/node" ]; then
    NODE_BIN="/Users/jamiecraik/.local/share/mise/installs/node/22.11.0/bin/node"
elif command -v node &> /dev/null; then
    NODE_BIN=$(command -v node)
else
    log "ERROR: node executable not found"
    exit 127
fi

# Ensure we rebuild if using a different Node version than before
EXPECTED_NODE_VERSION="v22"
ACTUAL_NODE_VERSION=$("$NODE_BIN" --version)
if [[ ! "$ACTUAL_NODE_VERSION" =~ ^v22\. ]]; then
    log "WARNING: Using Node $ACTUAL_NODE_VERSION instead of v22.x"
    log "Rebuilding dependencies for this Node version..."
    if [ -n "$PNPM_BIN" ]; then
        cd /Users/jamiecraik/.Cortex-OS && "$PNPM_BIN" -r rebuild better-sqlite3 2>&1 | head -5
        cd /Users/jamiecraik/.Cortex-OS/packages/mcp-server
    fi
fi

log "Using node: $NODE_BIN"
log "Node version: $ACTUAL_NODE_VERSION"

# Start the server with HTTP transport on port 3024
log "Executing: FASTMCP_HOST=127.0.0.1 $NODE_BIN dist/index.js --transport http --port 3024 --host 127.0.0.1"
FASTMCP_HOST=127.0.0.1 exec "$NODE_BIN" dist/index.js --transport http --port 3024 --host 127.0.0.1
