#!/usr/bin/env bash
# Local Memory Dual-Mode Startup Script
# Starts local-memory in dual mode with both MCP and REST API
# brAInwav Development Team

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load port configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PORTS_FILE="${ROOT_DIR}/config/ports.env"

if [ -f "${PORTS_FILE}" ]; then
  # shellcheck source=/dev/null
  source "${PORTS_FILE}"
  echo -e "${BLUE}[brAInwav]${NC} Loaded port configuration from ${PORTS_FILE}"
else
  echo -e "${RED}[brAInwav]${NC} Error: Port configuration file not found: ${PORTS_FILE}"
  exit 1
fi

# Set default values if not in config
MEMORY_API_PORT="${MEMORY_API_PORT:-3028}"
LOCAL_MEMORY_BASE_URL="${LOCAL_MEMORY_BASE_URL:-http://127.0.0.1:${MEMORY_API_PORT}}"

echo -e "${BLUE}[brAInwav]${NC} Starting Local Memory Service in Dual Mode..."
echo -e "${BLUE}[brAInwav]${NC} REST API Port: ${MEMORY_API_PORT}"
echo -e "${BLUE}[brAInwav]${NC} Base URL: ${LOCAL_MEMORY_BASE_URL}"

# Check if local-memory binary exists
if ! command -v local-memory &> /dev/null; then
  echo -e "${YELLOW}[brAInwav]${NC} Warning: local-memory binary not found in PATH"
  echo -e "${YELLOW}[brAInwav]${NC} Attempting to use from ${ROOT_DIR}/apps/cortex-os/packages/local-memory/dist/server.js"
  
  # Build if needed
  if [ ! -f "${ROOT_DIR}/apps/cortex-os/packages/local-memory/dist/server.js" ]; then
    echo -e "${BLUE}[brAInwav]${NC} Building local-memory package..."
    cd "${ROOT_DIR}/apps/cortex-os/packages/local-memory"
    pnpm build
  fi
  
  # Start the server directly
  export MEMORY_API_PORT
  export LOCAL_MEMORY_BASE_URL
  node "${ROOT_DIR}/apps/cortex-os/packages/local-memory/dist/server.js" &
  SERVER_PID=$!
  echo -e "${GREEN}[brAInwav]${NC} Started REST API server (PID: ${SERVER_PID})"
else
  # Use local-memory binary
  local-memory start-server --port "${MEMORY_API_PORT}" &
  SERVER_PID=$!
  echo -e "${GREEN}[brAInwav]${NC} Started local-memory server (PID: ${SERVER_PID})"
fi

# Wait for server to be ready
echo -e "${BLUE}[brAInwav]${NC} Waiting for REST API to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -sf "${LOCAL_MEMORY_BASE_URL}/healthz" > /dev/null 2>&1; then
    echo -e "${GREEN}[brAInwav]${NC} REST API is ready!"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo -e "${YELLOW}[brAInwav]${NC} Waiting... (${RETRY_COUNT}/${MAX_RETRIES})"
  sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo -e "${RED}[brAInwav]${NC} Error: REST API failed to start within ${MAX_RETRIES} seconds"
  kill "${SERVER_PID}" 2>/dev/null || true
  exit 1
fi

# Test the REST API
echo -e "${BLUE}[brAInwav]${NC} Testing REST API endpoints..."

# Health check
HEALTH_RESPONSE=$(curl -s "${LOCAL_MEMORY_BASE_URL}/healthz")
if echo "${HEALTH_RESPONSE}" | grep -q '"success":true'; then
  echo -e "${GREEN}[brAInwav]${NC} ✓ Health check passed"
else
  echo -e "${RED}[brAInwav]${NC} ✗ Health check failed"
  echo "${HEALTH_RESPONSE}"
fi

# Test memory store endpoint
TEST_RESPONSE=$(curl -s -X POST "${LOCAL_MEMORY_BASE_URL}/memory/store" \
  -H 'Content-Type: application/json' \
  -d '{
    "content": "Local Memory dual-mode startup test",
    "importance": 9,
    "tags": ["test", "dual-mode", "brainwav"],
    "domain": "cortex-os",
    "metadata": {
      "branding": "brAInwav",
      "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
    }
  }')

if echo "${TEST_RESPONSE}" | grep -q '"success":true'; then
  echo -e "${GREEN}[brAInwav]${NC} ✓ Memory store test passed"
  MEMORY_ID=$(echo "${TEST_RESPONSE}" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo -e "${GREEN}[brAInwav]${NC} Created test memory with ID: ${MEMORY_ID}"
else
  echo -e "${RED}[brAInwav]${NC} ✗ Memory store test failed"
  echo "${TEST_RESPONSE}"
fi

echo ""
echo -e "${GREEN}[brAInwav]${NC} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}[brAInwav]${NC} Local Memory Service Started Successfully!"
echo -e "${GREEN}[brAInwav]${NC} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}[brAInwav]${NC} REST API Base URL: ${LOCAL_MEMORY_BASE_URL}"
echo -e "${BLUE}[brAInwav]${NC} Server PID: ${SERVER_PID}"
echo ""
echo -e "${YELLOW}[brAInwav]${NC} Available Endpoints:"
echo -e "${YELLOW}[brAInwav]${NC}   • GET  ${LOCAL_MEMORY_BASE_URL}/healthz"
echo -e "${YELLOW}[brAInwav]${NC}   • GET  ${LOCAL_MEMORY_BASE_URL}/readyz"
echo -e "${YELLOW}[brAInwav]${NC}   • POST ${LOCAL_MEMORY_BASE_URL}/memory/store"
echo -e "${YELLOW}[brAInwav]${NC}   • POST ${LOCAL_MEMORY_BASE_URL}/memory/search"
echo -e "${YELLOW}[brAInwav]${NC}   • POST ${LOCAL_MEMORY_BASE_URL}/memory/analysis"
echo -e "${YELLOW}[brAInwav]${NC}   • POST ${LOCAL_MEMORY_BASE_URL}/memory/relationships"
echo -e "${YELLOW}[brAInwav]${NC}   • POST ${LOCAL_MEMORY_BASE_URL}/memory/stats"
echo ""
echo -e "${YELLOW}[brAInwav]${NC} To stop the service: kill ${SERVER_PID}"
echo -e "${YELLOW}[brAInwav]${NC} To check status: curl ${LOCAL_MEMORY_BASE_URL}/healthz"
echo ""
echo -e "${GREEN}[brAInwav]${NC} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Keep script running to maintain server
echo -e "${BLUE}[brAInwav]${NC} Press Ctrl+C to stop the service..."
trap "echo -e '${YELLOW}[brAInwav]${NC} Stopping server...'; kill ${SERVER_PID} 2>/dev/null || true; exit 0" INT TERM

wait "${SERVER_PID}"
