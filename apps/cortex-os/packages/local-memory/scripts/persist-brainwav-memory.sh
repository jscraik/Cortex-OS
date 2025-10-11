#!/usr/bin/env bash
#
# Local Memory - Store brAInwav Memory
# Stores the OpenAI Agents + Instructor plan memory
#

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOCAL_MEMORY_DIR="$SCRIPT_DIR/.."

# Source port configuration
if [ -f "$LOCAL_MEMORY_DIR/port.env" ]; then
  source "$LOCAL_MEMORY_DIR/port.env"
fi

BASE_URL=${LOCAL_MEMORY_BASE_URL:-http://127.0.0.1:3028}

echo -e "${BLUE}=== brAInwav Memory Persistence ===${NC}"
echo -e "${BLUE}Target: ${BASE_URL}${NC}"
echo ""

# Check if service is running
echo -e "${YELLOW}Checking service status...${NC}"
if curl -f -s "${BASE_URL}/healthz" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Service is running${NC}"
else
  echo -e "${RED}✗ Service is not running${NC}"
  echo -e "${YELLOW}Starting service...${NC}"
  
  # Try to start the service
  bash "$SCRIPT_DIR/start-local-memory.sh"
  
  # Wait and check again
  sleep 3
  if ! curl -f -s "${BASE_URL}/healthz" > /dev/null 2>&1; then
    echo -e "${RED}✗ Failed to start service${NC}"
    echo "Please start the service manually:"
    echo "  cd apps/cortex-os/packages/local-memory"
    echo "  pnpm start:service"
    exit 1
  fi
fi

echo ""

# Store the memory
echo -e "${YELLOW}Storing brAInwav memory...${NC}"

MEMORY_DATA='{
  "content": "OpenAI Agents + Instructor plan (brAInwav)",
  "importance": 9,
  "tags": ["openai-agents", "instructor", "brainwav", "hybrid"],
  "domain": "github-integration",
  "metadata": {
    "branding": "brAInwav",
    "feature": "agent-orchestration",
    "integration": "openai-instructor",
    "date_added": "2025-10-11"
  }
}'

response=$(curl -sS -X POST \
  -H 'Content-Type: application/json' \
  -d "$MEMORY_DATA" \
  "${BASE_URL}/memory/store")

# Check response
if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Memory stored successfully${NC}"
  
  # Extract and display memory ID
  memory_id=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 || echo "")
  
  if [ -n "$memory_id" ]; then
    echo -e "${GREEN}✓ Memory ID: ${memory_id}${NC}"
  fi
  
  echo ""
  echo -e "${BLUE}Full Response:${NC}"
  echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
  
  echo ""
  echo -e "${GREEN}=== Success ===${NC}"
  echo -e "${BLUE}The OpenAI Agents + Instructor plan has been persisted to local memory${NC}"
  echo ""
  echo "You can now:"
  echo "  1. Search for it: curl -X POST ${BASE_URL}/memory/search \\"
  echo "       -H 'Content-Type: application/json' \\"
  echo "       -d '{\"query\":\"OpenAI agents\",\"search_type\":\"semantic\",\"use_ai\":true}'"
  echo ""
  echo "  2. View stats: curl -X POST ${BASE_URL}/memory/stats \\"
  echo "       -H 'Content-Type: application/json' \\"
  echo "       -d '{}'"
  echo ""
  echo "  3. Record in .github/instructions/memories.instructions.md"
  
else
  echo -e "${RED}✗ Failed to store memory${NC}"
  echo -e "${RED}Response:${NC}"
  echo "$response"
  exit 1
fi
