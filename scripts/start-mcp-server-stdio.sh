#!/usr/bin/env bash
#
# Start MCP server in stdio mode for ChatGPT integration
#
# This script is designed to be used by ChatGPT's MCP connector,
# which only supports stdio transport (not HTTP/SSE).
#
# Usage in ChatGPT MCP configuration:
#   {
#     "mcpServers": {
#       "cortex-mcp": {
#         "command": "/Users/jamiecraik/.Cortex-OS/scripts/start-mcp-server-stdio.sh"
#       }
#     }
#   }

set -euo pipefail

# Resolve script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Setup environment
export CORTEX_HOME="${CORTEX_HOME:-$HOME/.Cortex-OS}"
export NODE_ENV="${NODE_ENV:-production}"

# Memory configuration
export LOCAL_MEMORY_BASE_URL="${LOCAL_MEMORY_BASE_URL:-http://localhost:3028/api/v1}"
export MEMORIES_SHORT_STORE="${MEMORIES_SHORT_STORE:-local}"
export MEMORIES_ADAPTER="${MEMORIES_ADAPTER:-local}"

# Agent toolkit paths
export AGENT_TOOLKIT_TOOLS_DIR="${AGENT_TOOLKIT_TOOLS_DIR:-$CORTEX_HOME/tools/agent-toolkit}"

# Logging (stderr only, stdout is for MCP protocol)
log() {
  echo "[MCP-stdio] $*" >&2
}

log "Starting MCP server in stdio mode for ChatGPT"
log "Repository: $REPO_ROOT"
log "Memory URL: $LOCAL_MEMORY_BASE_URL"
log "Tools dir: $AGENT_TOOLKIT_TOOLS_DIR"

# Find Node.js binary (prefer mise-managed)
if command -v mise &>/dev/null; then
  NODE_BIN="$(mise which node 2>/dev/null || command -v node)"
else
  NODE_BIN="$(command -v node)"
fi

if [[ ! -x "$NODE_BIN" ]]; then
  log "ERROR: Node.js not found"
  exit 1
fi

log "Node.js: $NODE_BIN ($("$NODE_BIN" --version))"

# Navigate to mcp-server package
cd "$REPO_ROOT/packages/mcp-server"

# Verify build exists
if [[ ! -f "dist/index.js" ]]; then
  log "ERROR: MCP server not built. Run: pnpm --filter @cortex-os/mcp-server build"
  exit 1
fi

# Start server in stdio mode
# stdout/stdin are used for MCP protocol communication
# stderr is for logging
log "Starting stdio transport..."
exec "$NODE_BIN" dist/index.js --transport stdio
