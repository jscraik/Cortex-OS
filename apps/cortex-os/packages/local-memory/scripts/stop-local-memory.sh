#!/usr/bin/env bash
#
# Local Memory Service Stop Script
# brAInwav Cortex-OS
#
# This script stops the local-memory REST API server

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

echo -e "${BLUE}=== brAInwav Local Memory Service Stop ===${NC}"

# Check for PID file
PID_FILE="$LOCAL_MEMORY_DIR/logs/server.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p $PID > /dev/null 2>&1; then
    echo -e "${YELLOW}Stopping server (PID: ${PID})...${NC}"
    kill $PID
    sleep 2
    
    # Force kill if still running
    if ps -p $PID > /dev/null 2>&1; then
      echo -e "${YELLOW}Force killing server...${NC}"
      kill -9 $PID
    fi
    
    echo -e "${GREEN}✓ Server stopped${NC}"
    rm "$PID_FILE"
  else
    echo -e "${YELLOW}⚠ Server not running (stale PID file)${NC}"
    rm "$PID_FILE"
  fi
else
  # Try to find and kill by port
  source "$LOCAL_MEMORY_DIR/port.env" 2>/dev/null || true
  MEMORY_API_PORT=${MEMORY_API_PORT:-3028}
  
  if lsof -Pi :$MEMORY_API_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}Found process on port ${MEMORY_API_PORT}...${NC}"
    PID=$(lsof -ti:$MEMORY_API_PORT)
    kill $PID
    sleep 2
    echo -e "${GREEN}✓ Server stopped${NC}"
  else
    echo -e "${GREEN}✓ No server running on port ${MEMORY_API_PORT}${NC}"
  fi
fi

# Optional: Stop Qdrant if running
read -p "Stop Qdrant as well? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  if pgrep -f "qdrant" > /dev/null; then
    echo -e "${YELLOW}Stopping Qdrant...${NC}"
    pkill -f "qdrant"
    echo -e "${GREEN}✓ Qdrant stopped${NC}"
  else
    echo -e "${GREEN}✓ Qdrant not running${NC}"
  fi
fi

echo -e "${GREEN}=== Shutdown complete ===${NC}"
