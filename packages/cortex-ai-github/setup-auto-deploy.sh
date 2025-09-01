#!/bin/bash
# Setup script for automatic cortex-ai-github deployment

echo "🔧 Setting up automatic deployment for cortex-ai-github..."

# Create logs directory
mkdir -p logs

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Stop any existing instances
echo "🛑 Stopping existing instances..."
pm2 stop cortex-ai-github 2>/dev/null || true
pm2 delete cortex-ai-github 2>/dev/null || true

# Start with PM2
echo "▶️ Starting cortex-ai-github with PM2..."
pm2 start ecosystem.config.json

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup

echo "✅ Setup complete!"
echo ""
echo "📋 PM2 Commands:"
echo "  pm2 status           - View running processes"
echo "  pm2 logs cortex-ai-github - View logs"
echo "  pm2 restart cortex-ai-github - Restart app"
echo "  pm2 stop cortex-ai-github - Stop app"
echo "  pm2 delete cortex-ai-github - Remove app"
echo ""
echo "🌐 Your app should be running at:"
echo "  Local: http://localhost:3001/health"
echo "  Public: https://cortex-github.brainwav.io/health"
