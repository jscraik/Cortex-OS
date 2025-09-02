#!/bin/bash

# Cortex Structure Guard GitHub App PM2 Startup Script
# This script starts the Structure Guard GitHub App with PM2 using tsx

set -e

echo "🏗️  Setting up Cortex Structure Guard GitHub App..."

# Navigate to the app directory
cd "$(dirname "$0")"

# Create logs directory if it doesn't exist
mkdir -p logs

# Use tsx to run TypeScript directly instead of building
echo "🚀 Starting with tsx (no build required)..."

# Check if PM2 is running the app
if pm2 list | grep -q "cortex-structure-github"; then
    echo "🔄 Restarting existing PM2 process..."
    pm2 restart cortex-structure-github
else
    echo "🚀 Starting new PM2 process..."
    pm2 start ecosystem.config.js --env production
fi

# Save PM2 configuration
pm2 save

# Show status
echo "📊 PM2 Status:"
pm2 status cortex-structure-github

echo "✅ Cortex Structure Guard GitHub App is running!"
echo "🌐 Server running on port ${PORT:-3003}"
echo "📁 Monitoring repository structure with automated organization"
echo "📋 View logs: pm2 logs cortex-structure-github"
echo "🔄 Restart: pm2 restart cortex-structure-github"
echo "⏹️  Stop: pm2 stop cortex-structure-github"
