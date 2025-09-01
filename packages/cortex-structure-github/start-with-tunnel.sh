#!/bin/bash

# Cortex Structure Guard GitHub App with Cloudflare Tunnel Startup Script
# This script starts both the GitHub App and the Cloudflare tunnel

set -euo pipefail

echo "🏗️  Setting up Cortex Structure Guard GitHub App..."

# Navigate to the app directory
cd "$(dirname "$0")"

# Create logs directory if it doesn't exist
mkdir -p logs

CF_HOSTNAME="${CF_HOSTNAME:-insula-github.brainwav.io}"
TUNNEL_CONFIG="infrastructure/cloudflare/tunnel.config.yml"
if [[ -f "$TUNNEL_CONFIG" ]]; then
    echo "📡 Cloudflare tunnel configuration found"
else
    echo "⚠️  Warning: Cloudflare tunnel configuration not found at $TUNNEL_CONFIG"
fi

# Start the GitHub App with PM2
echo "🚀 Starting Structure Guard GitHub App..."

# Check if PM2 is running the app
if pm2 list | grep -q "cortex-structure-github"; then
    echo "🔄 Restarting existing PM2 process..."
    pm2 restart cortex-structure-github
else
    echo "🚀 Starting new PM2 process..."
    pm2 start ecosystem.config.cjs --env production
fi

# Save PM2 configuration
pm2 save

# Start Cloudflare tunnel (if not already running)
if [[ -f "$TUNNEL_CONFIG" ]]; then
    echo "🌐 Ensuring Cloudflare tunnel is running..."

    # Check if a tunnel using this config is already running
    if pgrep -af "cloudflared" | grep -q "--config $TUNNEL_CONFIG"; then
        echo "ℹ️  Cloudflare tunnel (config: $TUNNEL_CONFIG) is already running"
    else
        echo "🚀 Starting new Cloudflare tunnel using config: $TUNNEL_CONFIG..."
        # Start tunnel in background; tunnel name is defined in the config file
        nohup cloudflared tunnel --config "$TUNNEL_CONFIG" run > logs/tunnel.log 2>&1 &
        echo "📡 Cloudflare tunnel started in background"
        sleep 2
    fi
fi

# Show status
echo ""
echo "📊 PM2 Status:"
pm2 status cortex-structure-github

echo ""
echo "✅ Cortex Structure Guard GitHub App is running!"
echo "🌐 Server running on port ${PORT:-3003}"
echo "📡 Expected public URL: https://${CF_HOSTNAME}"
echo "📋 View app logs: pm2 logs cortex-structure-github"
echo "📋 View tunnel logs: tail -f logs/tunnel.log"
echo "🔄 Restart app: pm2 restart cortex-structure-github"
echo "⏹️  Stop app: pm2 stop cortex-structure-github"
echo ""
echo "🔧 Test endpoints:"
echo "   Health:  https://${CF_HOSTNAME}/health"
echo "   Webhook: https://${CF_HOSTNAME}/webhook"
echo "   API:     https://${CF_HOSTNAME}/api/validate"
