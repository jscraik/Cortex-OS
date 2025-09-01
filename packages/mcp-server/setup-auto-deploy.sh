#!/bin/bash
# Setup script for automatic MCP server deployment

echo "🔧 Setting up automatic deployment for cortex-mcp-server..."

# Create logs directory
mkdir -p logs

# Stop any existing instances
echo "🛑 Stopping existing instances..."
pm2 stop cortex-mcp-server 2>/dev/null || true
pm2 delete cortex-mcp-server 2>/dev/null || true

# Start with PM2
echo "▶️ Starting cortex-mcp-server with PM2..."
pm2 start ecosystem.config.json

# Save PM2 configuration
pm2 save

echo "✅ Setup complete!"
echo ""
echo "📋 PM2 Commands:"
echo "  pm2 status               - View running processes"
echo "  pm2 logs cortex-mcp-server - View logs"
echo "  pm2 restart cortex-mcp-server - Restart app"
echo "  pm2 stop cortex-mcp-server - Stop app"
echo "  pm2 delete cortex-mcp-server - Remove app"
echo ""
echo "🌐 Your MCP server should be running at:"
echo "  Local: http://localhost:3000/health"
