#!/usr/bin/env bash
# brAInwav Cortex MCP Server - Perplexity STDIO Launcher WITH Codebase Search
# This enables memory tools + lightweight codebase search
# Uses LOCAL SQLite memory storage (no remote server needed)

set -euo pipefail

# CRITICAL: Change to the MCP server directory
cd /Users/jamiecraik/.Cortex-OS/packages/mcp-server || exit 1

# Set environment for STDIO mode with LOCAL memory storage
export MCP_TRANSPORT=stdio
# REMOVED: LOCAL_MEMORY_BASE_URL - will use local SQLite instead
export PIECES_MCP_ENABLED=false
export AGENT_TOOLKIT_ENABLED=false
export CODEBASE_SEARCH_ENABLED=true
export CODEBASE_ROOT=/Users/jamiecraik/.Cortex-OS
export MCP_LOG_LEVEL=error
export PIECES_MCP_ENDPOINT=""
export MEMORY_DB_PATH=/Users/jamiecraik/.Cortex-OS/data/memories.db

# Use absolute path to node (Perplexity doesn't use built-in node)
exec /Users/jamiecraik/.local/share/mise/installs/node/22.19.0/bin/node dist/index.js

