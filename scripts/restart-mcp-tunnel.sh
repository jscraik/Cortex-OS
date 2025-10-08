#!/bin/bash

# Script to restart MCP Cloudflare tunnel with updated configuration
echo "🔄 Restarting MCP Cloudflare tunnel..."

# Kill existing tunnel processes
echo "⏹️  Stopping existing tunnel processes..."
sudo pkill -f "cloudflared.*cortex-mcp" 2>/dev/null || true
sleep 2

# Start tunnel with updated configuration
echo "🚀 Starting tunnel with configuration (port 3024)..."
sudo cloudflared tunnel --config /Users/jamiecraik/.Cortex-OS/packages/cortex-mcp/infrastructure/cloudflare/tunnel.config.yml run cortex-mcp &

# Wait for tunnel to initialize
sleep 5

# Test tunnel health
echo "🔍 Testing tunnel health..."
response=$(curl -s https://cortex-mcp.brainwav.io/health)
if [[ "$response" == *"healthy"* ]] || [[ "$response" == *"cortex-mcp"* ]]; then
    echo "✅ Tunnel is working correctly!"
    echo "📍 Public URL: https://cortex-mcp.brainwav.io"
    echo "🔧 Endpoints available:"
    echo "   - GET  /health - Health check"
    echo "   - GET  /tools  - List available tools"
    echo "   - POST /tools/call - Execute tool"
    echo "📋 Local port: 3024 (as per config/ports.env)"
else
    echo "❌ Tunnel not responding correctly"
    echo "Response: $response"
fi