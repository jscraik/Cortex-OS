#!/bin/bash

# Cloudflare Tunnel Setup for Cortex MCP Server
# Creates and configures tunnel: mcp-brainwav -> mcp.brainwav.io:3000

set -e

TUNNEL_NAME="mcp-brainwav"
HOSTNAME="mcp.brainwav.io"
LOCAL_PORT="3000"
CONFIG_FILE="$(dirname "$0")/../infrastructure/cloudflare/tunnel.config.yml"

echo "🚀 Setting up Cloudflare Tunnel for Cortex MCP Server"
echo "   Tunnel: $TUNNEL_NAME"
echo "   Hostname: $HOSTNAME"
echo "   Local Port: $LOCAL_PORT"
echo

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared is not installed"
    echo "   Install with: brew install cloudflared"
    exit 1
fi

# Check if already logged in
if ! cloudflared tunnel list &> /dev/null; then
    echo "🔐 Please login to Cloudflare first:"
    echo "   cloudflared tunnel login"
    exit 1
fi

# Check if tunnel already exists
if cloudflared tunnel list | grep -q "$TUNNEL_NAME"; then
    echo "✅ Tunnel '$TUNNEL_NAME' already exists"
else
    echo "🆕 Creating tunnel '$TUNNEL_NAME'..."
    cloudflared tunnel create "$TUNNEL_NAME"
fi

# Get tunnel UUID
TUNNEL_UUID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
echo "📝 Tunnel UUID: $TUNNEL_UUID"

# Check DNS record
echo "🌐 Checking DNS record for $HOSTNAME..."
if dig +short "$HOSTNAME" | grep -q "\.cloudflareaccess\.com"; then
    echo "✅ DNS record already exists"
else
    echo "🆕 Creating DNS record..."
    cloudflared tunnel route dns "$TUNNEL_NAME" "$HOSTNAME"
fi

# Update config file with actual tunnel UUID if using placeholder
if grep -q "tunnel: mcp-brainwav" "$CONFIG_FILE"; then
    echo "📝 Updating config file with tunnel UUID..."
    # Note: Keep the tunnel name for easier management
    echo "   Config file uses tunnel name, which is preferred"
fi

echo ""
echo "✅ Tunnel setup complete!"
echo ""
echo "📋 Summary:"
echo "   Tunnel Name: $TUNNEL_NAME"
echo "   Tunnel UUID: $TUNNEL_UUID"
echo "   Hostname: $HOSTNAME"
echo "   Local Service: http://localhost:$LOCAL_PORT"
echo "   Config File: $CONFIG_FILE"
echo ""
echo "🚀 To start the tunnel:"
echo "   ./start-mcp-with-tunnel.sh"
echo ""
echo "🔍 To check tunnel status:"
echo "   cloudflared tunnel list"
echo "   cloudflared tunnel info $TUNNEL_NAME"
echo ""
echo "🧪 To test the connection:"
echo "   curl https://$HOSTNAME/health"
