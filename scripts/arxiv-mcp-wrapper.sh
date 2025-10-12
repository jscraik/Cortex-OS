#!/bin/bash

# arXiv MCP Server wrapper for Cortex-OS
# Ensures Python 3.11 is used for the arXiv MCP server

export ARXIV_EMAIL="jscraik@brainwav.io"
export PATH="/opt/homebrew/bin:$PATH"

# Use Python 3.11 explicitly
PYTHON_CMD="/opt/homebrew/bin/python3.11"

if [ ! -f "$PYTHON_CMD" ]; then
    echo "Error: Python 3.11 not found at $PYTHON_CMD"
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NPM_BIN_DIR="$(dirname $(which arxiv-mcp-server))"

# Find the arxiv-mcp-server package directory
PACKAGE_DIR="$NPM_BIN_DIR/../lib/node_modules/arxiv-mcp-server"

if [ ! -d "$PACKAGE_DIR" ]; then
    # Try alternative location
    PACKAGE_DIR="$NPM_BIN_DIR/../../../lib/node_modules/arxiv-mcp-server"
fi

if [ ! -d "$PACKAGE_DIR" ]; then
    echo "Error: arxiv-mcp-server package directory not found"
    echo "Looked in: $PACKAGE_DIR"
    exit 1
fi

echo "Starting arXiv MCP server with Python 3.11..."
echo "Package directory: $PACKAGE_DIR"
echo "ARXIV_EMAIL: $ARXIV_EMAIL"

# Run the server with Poetry
cd "$PACKAGE_DIR"
exec "$PYTHON_CMD" -m poetry run arxiv-mcp-server "$@"