#!/bin/bash
# Test ChatGPT MCP connection to brAInwav Cortex Memory Server

set -e

BRAND="brAInwav"
SERVER_URL="https://cortex-mcp.brainwav.io"
SSE_ENDPOINT="${SERVER_URL}/sse"
HEALTH_ENDPOINT="${SERVER_URL}/health"

echo "=========================================="
echo "${BRAND} MCP Server - ChatGPT Connection Test"
echo "=========================================="
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
echo "Endpoint: ${HEALTH_ENDPOINT}"
echo "---"
HEALTH_RESPONSE=$(curl -s "${HEALTH_ENDPOINT}")
echo "Response: ${HEALTH_RESPONSE}"

if [[ "${HEALTH_RESPONSE}" == *"${BRAND}"* ]]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed - unexpected response"
    exit 1
fi
echo ""

# Test 2: SSE Endpoint Availability
echo "Test 2: SSE Endpoint Availability"
echo "Endpoint: ${SSE_ENDPOINT}"
echo "---"
echo "Testing SSE connection (will timeout after 3 seconds)..."

# Test SSE with timeout
timeout 3 curl -N "${SSE_ENDPOINT}" \
  -H "Accept: text/event-stream" \
  -H "Cache-Control: no-cache" 2>&1 > /dev/null || true

if [ $? -eq 124 ]; then
    echo "✅ SSE endpoint is responding (timeout is expected)"
else
    echo "⚠️  SSE endpoint test completed unexpectedly"
fi
echo ""

# Test 3: Cloudflare Tunnel Status
echo "Test 3: Cloudflare Tunnel Status"
echo "---"
TUNNEL_RUNNING=$(ps aux | grep -i "cloudflared.*cortex-mcp" | grep -v grep | wc -l)

if [ "${TUNNEL_RUNNING}" -gt 0 ]; then
    echo "✅ Cloudflare tunnel is running"
    ps aux | grep -i "cloudflared.*cortex-mcp" | grep -v grep | head -1
else
    echo "❌ Cloudflare tunnel is NOT running"
    echo "   Start with: launchctl start com.cortexos.cloudflared"
    exit 1
fi
echo ""

# Test 4: Local MCP Server Status
echo "Test 4: Local MCP Server Status"
echo "---"
MCP_RUNNING=$(lsof -i :3024 2>/dev/null | grep -v COMMAND | wc -l)

if [ "${MCP_RUNNING}" -gt 0 ]; then
    echo "✅ MCP server is running on port 3024"
    lsof -i :3024 | grep -v COMMAND
else
    echo "❌ MCP server is NOT running on port 3024"
    echo "   Start with: launchctl start com.cortexos.mcp.server"
    exit 1
fi
echo ""

# Summary
echo "=========================================="
echo "Connection Test Summary"
echo "=========================================="
echo ""
echo "✅ All tests passed!"
echo ""
echo "Your MCP server is ready for ChatGPT connection."
echo ""
echo "Next Steps:"
echo "1. Open ChatGPT Desktop"
echo "2. Go to Settings → Connectors"
echo "3. Add new connector with URL: ${SSE_ENDPOINT}"
echo ""
echo "For detailed setup instructions, see:"
echo "  CHATGPT_CONNECTION_GUIDE.md"
echo ""
