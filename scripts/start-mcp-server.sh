#!/bin/bash

# Start MCP Server for brAInwav Cortex-OS
# This script starts the MCP server with the correct configuration

set -e

# Define paths
MCP_DIR="/Users/jamiecraik/.Cortex-OS/packages/mcp"
PYTHON_PATH="/Users/jamiecraik/.local/share/mise/installs/python/3.12.6/bin/python"

# Check if the MCP directory exists
if [ ! -d "$MCP_DIR" ]; then
    echo "Error: MCP directory not found at $MCP_DIR"
    exit 1
fi

# Change to MCP directory
cd "$MCP_DIR"

# Start the MCP server with proper Python path
echo "Starting MCP Server for brAInwav Cortex-OS..."
echo "Server will be available at http://127.0.0.1:3000"
echo "Access via Cloudflare tunnel at: https://cortex-mcp.brainwav.io"

# Set PYTHONPATH to include the MCP directory
export PYTHONPATH="$MCP_DIR:$PYTHONPATH"

# Run the server directly with proper error handling
exec "$PYTHON_PATH" run_server.py
