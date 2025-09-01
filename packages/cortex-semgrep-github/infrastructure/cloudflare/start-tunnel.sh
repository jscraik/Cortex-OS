#!/bin/bash

# Quick start script for Cortex Semgrep Cloudflare Tunnel
# Runs the tunnel: insula-semgrep-app -> insula-semgrep.brainwav.io:3002

TUNNEL_NAME="insula-semgrep-app"
CONFIG_FILE="$(dirname "$0")/tunnel.config.yml"

echo "🚀 Starting Cloudflare Tunnel for Semgrep GitHub App"
echo "   Tunnel: $TUNNEL_NAME"
echo "   Config: $CONFIG_FILE"
echo "   URL: https://insula-semgrep.brainwav.io"
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

# Start the tunnel
echo "🌐 Starting tunnel..."
exec cloudflared tunnel --config "$CONFIG_FILE" run "$TUNNEL_NAME"
