#!/bin/bash

# Cortex Semgrep GitHub App with Cloudflare Tunnel Startup Script
# This script starts both the GitHub App and the Cloudflare tunnel

set -euo pipefail

echo "🛡️  Setting up Cortex Semgrep GitHub App..."

# Navigate to the package root
cd "$(cd "$(dirname "$0")" && pwd)"

# Create logs directory if it doesn't exist
mkdir -p logs

# Load .env if present for secrets and configuration
if [[ -f ".env" ]]; then
  echo "🔐 Loading environment from .env"
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Defaults
PORT="${PORT:-3002}"
CF_HOSTNAME="${CF_HOSTNAME:-semgrep-github.brainwav.io}"
TUNNEL_CONFIG="infrastructure/cloudflare/tunnel.config.yml"

# Ensure dependencies and build
if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable
  corepack use pnpm@8
fi

echo "📦 Installing deps and building..."
pnpm install --silent || true
pnpm build

# Start the GitHub App with PM2
echo "🚀 Starting Semgrep GitHub App on port ${PORT}..."

# Check if PM2 is running the app
if pm2 list | grep -q "cortex-semgrep-github"; then
  echo "♻️  Restarting existing PM2 process..."
  pm2 restart cortex-semgrep-github
else
  echo "🚀 Starting new PM2 process..."
  pm2 start ecosystem.config.js --env production
fi

# Save PM2 configuration
pm2 save

# Start Cloudflare tunnel (if not already running)
if [[ -f "$TUNNEL_CONFIG" ]]; then
  echo "🌐 Ensuring Cloudflare tunnel is running..."

  # If any cloudflared process already running with our config, reuse it
  if pgrep -af "cloudflared" | grep -q "insula-semgrep-app"; then
    echo "ℹ️  Cloudflare tunnel (insula-semgrep-app) is already running"
  else
    echo "🚀 Starting Cloudflare tunnel: insula-semgrep-app"
    nohup cloudflared tunnel --config "$TUNNEL_CONFIG" run insula-semgrep-app > logs/tunnel.log 2>&1 &
    sleep 2
  fi
else
  echo "⚠️  Cloudflare tunnel configuration not found at $TUNNEL_CONFIG"
fi

# Show status
echo ""
echo "📊 PM2 Status:"
pm2 status cortex-semgrep-github

echo ""
echo "✅ Cortex Semgrep GitHub App is running!"
echo "🌐 Server running on port ${PORT}"
echo "📡 Expected public URL: https://${CF_HOSTNAME}"
echo "📋 View app logs: pm2 logs cortex-semgrep-github"
echo "📋 View tunnel logs: tail -f logs/tunnel.log"
echo "♻️  Restart app: pm2 restart cortex-semgrep-github"
echo "⏹️   Stop app: pm2 stop cortex-semgrep-github"
echo ""
echo "🔧 Test endpoints (via Cloudflare):"
echo "   Health:  https://${CF_HOSTNAME}/health"
echo "   Webhook: https://${CF_HOSTNAME}/webhook"
