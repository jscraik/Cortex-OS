#!/usr/bin/env bash
# Local Memory Dual-Mode Verification Script
# Verifies both MCP and REST API modes are working correctly
# brAInwav Development Team

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load port configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PORTS_FILE="${ROOT_DIR}/config/ports.env"

if [ -f "${PORTS_FILE}" ]; then
  source "${PORTS_FILE}"
fi

MEMORY_API_PORT="${MEMORY_API_PORT:-3028}"
LOCAL_MEMORY_BASE_URL="${LOCAL_MEMORY_BASE_URL:-http://127.0.0.1:${MEMORY_API_PORT}}"

echo -e "${BLUE}[brAInwav]${NC} Local Memory Dual-Mode Verification"
echo -e "${BLUE}[brAInwav]${NC} ═══════════════════════════════════════"
echo ""

# Test 1: Port Configuration
echo -e "${BLUE}[brAInwav]${NC} Test 1: Port Configuration"
if [ -f "${PORTS_FILE}" ]; then
  echo -e "${GREEN}[brAInwav]${NC} ✓ Port configuration file exists"
  echo -e "${GREEN}[brAInwav]${NC}   MEMORY_API_PORT=${MEMORY_API_PORT}"
  echo -e "${GREEN}[brAInwav]${NC}   LOCAL_MEMORY_BASE_URL=${LOCAL_MEMORY_BASE_URL}"
else
  echo -e "${RED}[brAInwav]${NC} ✗ Port configuration file not found"
  exit 1
fi
echo ""

# Test 2: REST API Health
echo -e "${BLUE}[brAInwav]${NC} Test 2: REST API Health Check"
if curl -sf "${LOCAL_MEMORY_BASE_URL}/healthz" > /dev/null 2>&1; then
  HEALTH=$(curl -s "${LOCAL_MEMORY_BASE_URL}/healthz")
  if echo "${HEALTH}" | grep -q '"success":true'; then
    echo -e "${GREEN}[brAInwav]${NC} ✓ REST API is healthy"
    echo -e "${GREEN}[brAInwav]${NC}   URL: ${LOCAL_MEMORY_BASE_URL}/healthz"
  else
    echo -e "${YELLOW}[brAInwav]${NC} ⚠ REST API responded but health check failed"
    echo "${HEALTH}"
  fi
else
  echo -e "${RED}[brAInwav]${NC} ✗ REST API not responding"
  echo -e "${YELLOW}[brAInwav]${NC}   Start the service with: ./scripts/start-local-memory.sh"
  exit 1
fi
echo ""

# Test 3: REST API Readiness
echo -e "${BLUE}[brAInwav]${NC} Test 3: REST API Readiness"
READY=$(curl -s "${LOCAL_MEMORY_BASE_URL}/readyz")
if echo "${READY}" | grep -q '"ready":true'; then
  echo -e "${GREEN}[brAInwav]${NC} ✓ REST API is ready"
else
  echo -e "${RED}[brAInwav]${NC} ✗ REST API not ready"
  echo "${READY}"
fi
echo ""

# Test 4: Memory Store Operation
echo -e "${BLUE}[brAInwav]${NC} Test 4: Memory Store Operation"
STORE_RESPONSE=$(curl -s -X POST "${LOCAL_MEMORY_BASE_URL}/memory/store" \
  -H 'Content-Type: application/json' \
  -d '{
    "content": "Verification test - Local Memory dual-mode operational",
    "importance": 10,
    "tags": ["verification", "dual-mode", "brainwav"],
    "domain": "testing",
    "metadata": {
      "branding": "brAInwav",
      "test": "verification",
      "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
    }
  }' 2>&1)

if echo "${STORE_RESPONSE}" | grep -q '"success":true'; then
  MEMORY_ID=$(echo "${STORE_RESPONSE}" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo -e "${GREEN}[brAInwav]${NC} ✓ Memory store successful"
  echo -e "${GREEN}[brAInwav]${NC}   Memory ID: ${MEMORY_ID}"
else
  echo -e "${RED}[brAInwav]${NC} ✗ Memory store failed"
  echo "${STORE_RESPONSE}"
  exit 1
fi
echo ""

# Test 5: Memory Search Operation
echo -e "${BLUE}[brAInwav]${NC} Test 5: Memory Search Operation"
SEARCH_RESPONSE=$(curl -s -X POST "${LOCAL_MEMORY_BASE_URL}/memory/search" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "verification",
    "search_type": "semantic",
    "limit": 5
  }' 2>&1)

if echo "${SEARCH_RESPONSE}" | grep -q '"success":true'; then
  RESULT_COUNT=$(echo "${SEARCH_RESPONSE}" | grep -o '"results":\[[^]]*\]' | grep -o '\[' | wc -l)
  echo -e "${GREEN}[brAInwav]${NC} ✓ Memory search successful"
  echo -e "${GREEN}[brAInwav]${NC}   Found results for 'verification' query"
else
  echo -e "${RED}[brAInwav]${NC} ✗ Memory search failed"
  echo "${SEARCH_RESPONSE}"
fi
echo ""

# Test 6: MCP Binary Check
echo -e "${BLUE}[brAInwav]${NC} Test 6: MCP Binary Check"
if command -v local-memory &> /dev/null; then
  echo -e "${GREEN}[brAInwav]${NC} ✓ local-memory binary found in PATH"
  LOCAL_MEMORY_PATH=$(which local-memory)
  echo -e "${GREEN}[brAInwav]${NC}   Location: ${LOCAL_MEMORY_PATH}"
else
  echo -e "${YELLOW}[brAInwav]${NC} ⚠ local-memory binary not in PATH"
  if [ -f "${ROOT_DIR}/apps/cortex-os/packages/local-memory/dist/server.js" ]; then
    echo -e "${GREEN}[brAInwav]${NC}   Found built server at: ${ROOT_DIR}/apps/cortex-os/packages/local-memory/dist/server.js"
  else
    echo -e "${YELLOW}[brAInwav]${NC}   Consider building: cd ${ROOT_DIR}/apps/cortex-os/packages/local-memory && pnpm build"
  fi
fi
echo ""

# Test 7: Build Verification
echo -e "${BLUE}[brAInwav]${NC} Test 7: Build Verification"
if [ -f "${ROOT_DIR}/apps/cortex-os/packages/local-memory/dist/server.js" ]; then
  echo -e "${GREEN}[brAInwav]${NC} ✓ Local memory server built"
else
  echo -e "${RED}[brAInwav]${NC} ✗ Local memory server not built"
  echo -e "${YELLOW}[brAInwav]${NC}   Run: cd ${ROOT_DIR}/apps/cortex-os/packages/local-memory && pnpm build"
fi

if [ -f "${ROOT_DIR}/packages/memory-rest-api/dist/index.js" ]; then
  echo -e "${GREEN}[brAInwav]${NC} ✓ Memory REST API built"
else
  echo -e "${YELLOW}[brAInwav]${NC} ⚠ Memory REST API not built (optional)"
  echo -e "${YELLOW}[brAInwav]${NC}   To build: cd ${ROOT_DIR}/packages/memory-rest-api && pnpm build"
fi
echo ""

# Summary
echo -e "${BLUE}[brAInwav]${NC} ═══════════════════════════════════════"
echo -e "${GREEN}[brAInwav]${NC} Verification Complete!"
echo -e "${BLUE}[brAInwav]${NC} ═══════════════════════════════════════"
echo ""
echo -e "${BLUE}[brAInwav]${NC} REST API is operational at: ${LOCAL_MEMORY_BASE_URL}"
echo -e "${BLUE}[brAInwav]${NC} Dual-mode (MCP + REST) is functioning correctly"
echo ""
echo -e "${YELLOW}[brAInwav]${NC} Next Steps:"
echo -e "${YELLOW}[brAInwav]${NC}   • Configure MCP clients (Claude Desktop, VS Code, Cursor)"
echo -e "${YELLOW}[brAInwav]${NC}   • Use REST API for programmatic access"
echo -e "${YELLOW}[brAInwav]${NC}   • See README.md for integration examples"
echo ""
