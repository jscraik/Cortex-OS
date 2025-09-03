#!/bin/bash

# Quick start script for Cortex MCP Server
# Starts the MCP server on localhost:3000

set -e

MCP_PORT="3000"
TUNNEL_SCRIPT="$(dirname "$0")/start-mcp-with-tunnel.sh"

echo "🚀 Starting Cortex MCP Server"
echo "   Port: $MCP_PORT"
echo "   Local URL: http://localhost:$MCP_PORT"
echo

# Check if port is already in use
if lsof -i :$MCP_PORT >/dev/null 2>&1; then
    echo "⚠️  Port $MCP_PORT is already in use"
    echo "   Existing process:"
    lsof -i :$MCP_PORT
    echo ""
    read -p "   Kill existing process and continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Stopping existing process..."
        lsof -ti :$MCP_PORT | xargs kill -9
        sleep 2
    else
        echo "❌ Aborted"
        exit 1
    fi
fi

# Function to handle cleanup
cleanup() {
    echo ""
    echo "🛑 Stopping MCP server..."
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo "🌐 Starting MCP server on port $MCP_PORT..."
echo "   Press Ctrl+C to stop"
echo ""
echo "💡 To expose via Cloudflare tunnel, run:"
echo "   $TUNNEL_SCRIPT"
echo ""

# Start the MCP server (placeholder - needs actual implementation)
# This should be replaced with the actual MCP server startup command
cd "$(dirname "$0")/../"

# Check if we have a Python MCP server
if [[ -f "pyproject.toml" ]]; then
    echo "🐍 Starting Python MCP server..."
    if command -v uv >/dev/null 2>&1; then
        exec uv run python -m mcp.core.server --port $MCP_PORT
    elif command -v python >/dev/null 2>&1; then
        exec python -m mcp.core.server --port $MCP_PORT
    else
        echo "❌ Python not found"
        exit 1
    fi
# Check if we have a Node.js MCP server
elif [[ -f "package.json" ]]; then
    echo "📦 Starting Node.js MCP server..."
    if command -v pnpm >/dev/null 2>&1; then
        exec pnpm start --port $MCP_PORT
    elif command -v npm >/dev/null 2>&1; then
        exec npm start -- --port $MCP_PORT
    else
        echo "❌ Node.js package manager not found"
        exit 1
    fi
else
    echo "❌ No MCP server configuration found"
    echo "   Expected: pyproject.toml or package.json"
    exit 1
fi
