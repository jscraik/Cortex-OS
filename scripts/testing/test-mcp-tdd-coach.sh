#!/bin/bash

# Test script to verify MCP server and TDD Coach plugin integration
# This script checks if the MCP server is running and if the TDD Coach tools are available

set -e

echo "Testing MCP Server and TDD Coach Plugin Integration..."
echo "======================================================"

# Check if MCP server is running
echo "1. Checking if MCP server is running on http://127.0.0.1:3000..."
if curl -f http://127.0.0.1:3000/health > /dev/null 2>&1; then
    echo "   ✅ MCP Server is running"
else
    echo "   ❌ MCP Server is not running"
    echo "   Please start the MCP server first:"
    echo "   cd /Users/jamiecraik/.Cortex-OS/packages/mcp && python cli/main.py serve --host 127.0.0.1 --port 3000"
    exit 1
fi

# Check available tools
echo "2. Checking available tools..."
TOOLS_RESPONSE=$(curl -s -X POST http://127.0.0.1:3000/tools/list)
if echo "$TOOLS_RESPONSE" | grep -q "tdd_coach"; then
    echo "   ✅ TDD Coach plugin is loaded"
    
    # List TDD Coach tools
    echo "3. Listing TDD Coach tools:"
    echo "$TOOLS_RESPONSE" | python3 -m json.tool | grep -A 1 -B 1 "tdd_coach"
else
    echo "   ❌ TDD Coach plugin is not loaded"
    echo "   Please ensure the TDD Coach plugin is in the plugins directory"
    exit 1
fi

echo ""
echo "✅ All tests passed! MCP server and TDD Coach plugin are working correctly."
echo "The MCP server is available at http://127.0.0.1:3000"
echo "Access via Cloudflare tunnel at: https://cortex-mcp.brainwav.io"
