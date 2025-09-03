#!/bin/bash

# Start Cortex MCP Server with Cloudflare Tunnel
# Runs the MCP server and exposes it via mcp.brainwav.io

set -e

TUNNEL_NAME="mcp-brainwav"
CONFIG_FILE="$(dirname "$0")/../infrastructure/cloudflare/tunnel.config.yml"
MCP_PORT="3000"

echo "🚀 Starting Cortex MCP Server with Cloudflare Tunnel"
echo "   Tunnel: $TUNNEL_NAME"
echo "   Config: $CONFIG_FILE"
echo "   Local Port: $MCP_PORT"
echo "   Public URL: https://mcp.brainwav.io"
echo

# Check if tunnel exists
if ! cloudflared tunnel list | grep -q "$TUNNEL_NAME"; then
    echo "❌ Tunnel '$TUNNEL_NAME' not found"
    echo "   Run setup first: ./setup-tunnel.sh"
    exit 1
fi

# Check if configuration file exists
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "❌ Configuration file not found: $CONFIG_FILE"
    exit 1
fi

# Check if MCP server is running on the expected port
echo "🔍 Checking if MCP server is running on port $MCP_PORT..."
if ! lsof -i :$MCP_PORT >/dev/null 2>&1; then
    echo "⚠️  No service detected on port $MCP_PORT"
    echo "   Make sure to start the MCP server first:"
    echo "   cd packages/mcp && pnpm start"
    echo ""
    echo "🔄 Starting tunnel anyway (server can be started later)..."
else
    echo "✅ Service detected on port $MCP_PORT"
fi

# Function to handle cleanup
cleanup() {
    echo ""
    echo "🛑 Stopping tunnel..."
    pkill -f "cloudflared tunnel.*$TUNNEL_NAME" || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo "🌐 Starting tunnel..."
echo "   Press Ctrl+C to stop"
echo ""

# Start the tunnel
exec cloudflared tunnel --config "$CONFIG_FILE" run "$TUNNEL_NAME"
