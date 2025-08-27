#!/bin/bash

# Test script for MCP server
# This script verifies that the MCP server is working correctly

echo "Testing MCP Server..."

# Test 1: Health endpoint
echo "1. Testing health endpoint..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health | grep -q "200"
if [ $? -eq 0 ]; then
    echo "   ✓ Health endpoint is working"
    HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
    echo "   Response: $HEALTH_RESPONSE"
else
    echo "   ✗ Health endpoint is not working"
fi

# Test 2: SSE endpoint
echo "2. Testing SSE endpoint (5 second timeout)..."
curl -s --max-time 5 -N http://localhost:3000/sse | head -n 1 | grep -q "event: endpoint"
if [ $? -eq 0 ]; then
    echo "   ✓ SSE endpoint is working"
    SSE_RESPONSE=$(curl -s --max-time 2 -N http://localhost:3000/sse | head -n 1)
    echo "   First line: $SSE_RESPONSE"
else
    echo "   ✗ SSE endpoint is not working"
fi

echo "Test complete!"