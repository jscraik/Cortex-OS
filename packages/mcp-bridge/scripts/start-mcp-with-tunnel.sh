#!/bin/bash

# Start MCP server and tunnel together
# This script starts the MCP server and ensures the tunnel is running

echo "Starting Cortex MCP Server with Cloudflare Tunnel..."

# Start the MCP server in the background
echo "Starting MCP server..."
MCP_SERVER_DIR="${MCP_SERVER_DIR:-$(dirname "$0")/../}"
cd "$MCP_SERVER_DIR"
npm start &
MCP_PID=$!

# Wait a moment for the server to start
sleep 2

# Verify the server is running
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health | grep -q "200"
if [ $? -eq 0 ]; then
    echo "✓ MCP server is running"
else
    echo "✗ MCP server failed to start"
    kill $MCP_PID 2>/dev/null
    exit 1
fi

# Restart the tunnel
echo "Restarting Cloudflare tunnel..."
launchctl kickstart -k gui/$(id -u)/com.cloudflare.cloudflared

# Verify the tunnel is working
sleep 3
curl -s -o /dev/null -w "%{http_code}" https://mcp.brainwav.io/health | grep -q "200"
if [ $? -eq 0 ]; then
    echo "✓ Cloudflare tunnel is working"
else
    echo "✗ Cloudflare tunnel is not responding"
fi

echo "MCP server and tunnel are running!"
echo "Press Ctrl+C to stop"

# Wait for the user to press Ctrl+C
wait $MCP_PID
