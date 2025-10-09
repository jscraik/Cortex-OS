#!/usr/bin/env bash
# brAInwav Cortex MCP Server - Minimal Perplexity STDIO Launcher
# This script disables all optional features for maximum compatibility

set -euo pipefail

# CRITICAL: Change to the MCP server directory
cd /Users/jamiecraik/.Cortex-OS/packages/mcp-server || exit 1

# Set environment for STDIO mode with minimal features
export MCP_TRANSPORT=stdio
export LOCAL_MEMORY_BASE_URL="${LOCAL_MEMORY_BASE_URL:-http://localhost:9400}"
export PIECES_MCP_ENABLED=false
export AGENT_TOOLKIT_ENABLED=false
export MCP_LOG_LEVEL="${MCP_LOG_LEVEL:-error}"
export PIECES_MCP_ENDPOINT=""

# Use absolute path to node (Perplexity doesn't use built-in node)
exec /Users/jamiecraik/.local/share/mise/installs/node/22.19.0/bin/node dist/index.js
