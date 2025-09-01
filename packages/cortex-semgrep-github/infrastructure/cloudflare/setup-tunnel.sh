#!/bin/bash

# Cloudflare Tunnel Setup for Cortex Semgrep GitHub App
# Creates and configures tunnel: insula-semgrep-app -> insula-semgrep.brainwav.io:3002

set -e

TUNNEL_NAME="insula-semgrep-app"
HOSTNAME="insula-semgrep.brainwav.io"
LOCAL_PORT="3002"
CONFIG_FILE="$(dirname "$0")/tunnel.config.yml"

echo "🚀 Setting up Cloudflare Tunnel for Cortex Semgrep GitHub App"
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

# Validate configuration file
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "❌ Configuration file not found: $CONFIG_FILE"
    exit 1
fi

echo "✅ Configuration file: $CONFIG_FILE"

# Test configuration
echo "🧪 Testing tunnel configuration..."
if cloudflared tunnel --config "$CONFIG_FILE" ingress validate; then
    echo "✅ Configuration is valid"
else
    echo "❌ Configuration validation failed"
    exit 1
fi

echo
echo "🎉 Tunnel setup complete!"
echo
echo "💡 Next steps:"
echo "   1. Start your Semgrep app on port $LOCAL_PORT:"
echo "      cd packages/cortex-semgrep-github && npm start"
echo
echo "   2. Start the tunnel:"
echo "      cloudflared tunnel --config '$CONFIG_FILE' run '$TUNNEL_NAME'"
echo
echo "   3. Test the tunnel:"
echo "      curl https://$HOSTNAME/health"
echo
echo "   4. Configure GitHub App webhook URL:"
echo "      https://$HOSTNAME/webhook"
echo
echo "🔒 Security:"
echo "   - Use webhook secret: SEMGREP_WEBHOOK_SECRET"
echo "   - Monitor tunnel logs for security events"
echo "   - Rotate credentials periodically"
