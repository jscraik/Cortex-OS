#!/bin/bash

# Cortex Structure Guard GitHub App with Cloudflare Tunnel Startup Script
# This script starts both the GitHub App and the Cloudflare tunnel

set -e

echo "🏗️  Setting up Cortex Structure Guard GitHub App..."

# Navigate to the app directory
cd "$(dirname "$0")"

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if Cloudflare tunnel is configured
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
    echo "🌐 Starting Cloudflare tunnel..."

    # Check if tunnel is already running
    if pgrep -f "cloudflared tunnel run" > /dev/null; then
        echo "ℹ️  Cloudflare tunnel is already running"
    else
        echo "🚀 Starting new Cloudflare tunnel..."
        # Start tunnel in background
        nohup cloudflared tunnel --config "$TUNNEL_CONFIG" run insula-github-app > logs/tunnel.log 2>&1 &
        echo "📡 Cloudflare tunnel started in background"
    fi
fi

# Show status
echo ""
echo "📊 PM2 Status:"
pm2 status cortex-structure-github

echo ""
echo "✅ Cortex Structure Guard GitHub App is running!"
echo "🌐 Server running on port 3003"
echo "📡 Tunnel URL: https://insula-github.brainwav.io"
echo "📋 View app logs: pm2 logs cortex-structure-github"
echo "📋 View tunnel logs: tail -f logs/tunnel.log"
echo "🔄 Restart app: pm2 restart cortex-structure-github"
echo "⏹️  Stop app: pm2 stop cortex-structure-github"
echo ""
echo "🔧 Test endpoints:"
echo "   Health: https://insula-github.brainwav.io/health"
echo "   Webhook: https://insula-github.brainwav.io/webhook"
echo "   API: https://insula-github.brainwav.io/api/validate"
