#!/usr/bin/env bash
#
# Local Memory Service Test Script
# brAInwav Cortex-OS
#
# Tests the REST API endpoints and persists test data

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOCAL_MEMORY_DIR="$SCRIPT_DIR/.."

# Source port configuration
if [ -f "$LOCAL_MEMORY_DIR/port.env" ]; then
  source "$LOCAL_MEMORY_DIR/port.env"
fi

# Default values
BASE_URL=${LOCAL_MEMORY_BASE_URL:-http://127.0.0.1:3028}

echo -e "${BLUE}=== brAInwav Local Memory Service Tests ===${NC}"
echo -e "${BLUE}Base URL: ${BASE_URL}${NC}"
echo ""

# Function to test endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local description=$4
  
  echo -e "${YELLOW}Testing: ${description}${NC}"
  echo -e "${BLUE}  ${method} ${endpoint}${NC}"
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "${BASE_URL}${endpoint}")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "${BASE_URL}${endpoint}")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$ d')
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}  ✓ Success (${http_code})${NC}"
    echo -e "${BLUE}  Response: ${body}${NC}"
    echo ""
    return 0
  else
    echo -e "${RED}  ✗ Failed (${http_code})${NC}"
    echo -e "${RED}  Response: ${body}${NC}"
    echo ""
    return 1
  fi
}

# Test 1: Health Check
test_endpoint "GET" "/healthz" "" "Health Check" || exit 1

# Test 2: Readiness Check
test_endpoint "GET" "/readyz" "" "Readiness Check" || exit 1

# Test 3: Store Memory
echo -e "${YELLOW}=== Testing Memory Storage ===${NC}"
MEMORY_DATA='{
  "content": "OpenAI Agents + Instructor plan (brAInwav)",
  "importance": 9,
  "tags": ["openai-agents", "instructor", "brainwav", "hybrid"],
  "domain": "github-integration",
  "metadata": {
    "branding": "brAInwav",
    "feature": "agent-orchestration"
  }
}'

response=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "$MEMORY_DATA" \
  "${BASE_URL}/memory/store")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$ d')

if [ "$http_code" -eq 201 ]; then
  echo -e "${GREEN}✓ Memory stored successfully${NC}"
  
  # Extract memory ID
  memory_id=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 || echo "")
  
  if [ -n "$memory_id" ]; then
    echo -e "${GREEN}✓ Memory ID: ${memory_id}${NC}"
    echo -e "${BLUE}Response: ${body}${NC}"
  else
    echo -e "${YELLOW}⚠ Could not extract memory ID${NC}"
    echo -e "${BLUE}Response: ${body}${NC}"
  fi
else
  echo -e "${RED}✗ Failed to store memory (${http_code})${NC}"
  echo -e "${RED}Response: ${body}${NC}"
  exit 1
fi

echo ""

# Test 4: Search Memories
echo -e "${YELLOW}=== Testing Memory Search ===${NC}"
SEARCH_DATA='{
  "query": "OpenAI agents",
  "search_type": "semantic",
  "use_ai": true,
  "limit": 5
}'

test_endpoint "POST" "/memory/search" "$SEARCH_DATA" "Semantic Search"

# Test 5: Memory Stats
echo -e "${YELLOW}=== Testing Memory Stats ===${NC}"
test_endpoint "POST" "/memory/stats" "{}" "Memory Statistics"

# Summary
echo -e "${GREEN}=== All Tests Passed ===${NC}"
echo -e "${BLUE}Local Memory REST API is working correctly${NC}"
echo ""
echo "You can now use the REST API at: ${BASE_URL}"
echo ""
echo "Example curl commands:"
echo "  # Store memory"
echo "  curl -X POST ${BASE_URL}/memory/store \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"content\":\"...\",\"importance\":8,\"tags\":[\"...\"],\"domain\":\"...\"}'"
echo ""
echo "  # Search memories"
echo "  curl -X POST ${BASE_URL}/memory/search \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"query\":\"...\",\"search_type\":\"semantic\",\"use_ai\":true}'"
echo ""
echo "  # Get stats"
echo "  curl -X POST ${BASE_URL}/memory/stats \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{}'"
