#!/bin/bash

# Cortex Semgrep GitHub App PM2 Startup Script
# This script starts the Semgrep GitHub App with PM2 using tsx

set -e

echo "🔧 Setting up Cortex Semgrep GitHub App..."

# Navigate to the app directory
cd "$(dirname "$0")"

# Create logs directory if it doesn't exist
mkdir -p logs

# Use tsx to run TypeScript directly instead of building
echo "🚀 Starting with tsx (no build required)..."

# Direct PM2 start without config file complexity

# Check if PM2 is running the app
if pm2 list | grep -q "cortex-semgrep-github"; then
    echo "🔄 Restarting existing PM2 process..."
    pm2 restart cortex-semgrep-github
else
    echo "🚀 Starting new PM2 process..."
    pm2 start "pnpm tsx src/server/start.ts" --name cortex-semgrep-github --env production
fi

# Save PM2 configuration
pm2 save

# Show status
echo "📊 PM2 Status:"
pm2 status cortex-semgrep-github

echo "✅ Cortex Semgrep GitHub App is running!"
echo "🌐 Server running on port ${PORT:-3002}"
echo "📋 View logs: pm2 logs cortex-semgrep-github"
echo "🔄 Restart: pm2 restart cortex-semgrep-github"
echo "⏹️  Stop: pm2 stop cortex-semgrep-github"
