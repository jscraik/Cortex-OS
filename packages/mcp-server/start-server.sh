#!/bin/bash
cd "$(dirname "$0")"
echo "Working directory: $(pwd)"

# Load environment variables
export CORTEX_MCP_ROOT=/Users/jamiecraik/.Cortex-OS
export CORTEX_MCP_TOKEN=mcp-secure-token-$(date +%s)
export PORT=3000

echo "Environment variables set:"
echo "CORTEX_MCP_ROOT: $CORTEX_MCP_ROOT"
echo "CORTEX_MCP_TOKEN: ${CORTEX_MCP_TOKEN:0:20}..."
echo "PORT: $PORT"

echo "Starting MCP server with tsx..."
# Use tsx from the workspace or install globally
if command -v tsx &> /dev/null; then
    tsx src/server.ts
else
    echo "Installing tsx globally..."
    npm install -g tsx
    tsx src/server.ts
fi
