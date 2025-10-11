#!/usr/bin/env bash
#
# Local Memory Service Status Check
# brAInwav Cortex-OS
#

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== brAInwav Local Memory Service Status ===${NC}"
echo ""

# Check if process is running
echo -e "${YELLOW}[1/5] Checking process status...${NC}"
if ps aux | grep -q "[n]ode.*server.js"; then
    PID=$(ps aux | grep "[n]ode.*server.js" | awk '{print $2}' | head -1)
    echo -e "${GREEN}✓ Service is running (PID: ${PID})${NC}"
else
    echo -e "${RED}✗ Service is not running${NC}"
    echo ""
    echo "To start the service:"
    echo "  cd apps/cortex-os/packages/local-memory"
    echo "  pnpm start:service"
    exit 1
fi

# Check port
echo -e "\n${YELLOW}[2/5] Checking port 3028...${NC}"
if lsof -i :3028 >/dev/null 2>&1; then
    PORT_INFO=$(lsof -i :3028 | tail -1)
    echo -e "${GREEN}✓ Port 3028 is bound${NC}"
    echo "  ${PORT_INFO}"
else
    echo -e "${RED}✗ Port 3028 is not listening${NC}"
fi

# Test health endpoint
echo -e "\n${YELLOW}[3/5] Testing health endpoint...${NC}"
if curl -f -s http://127.0.0.1:3028/healthz >/dev/null 2>&1; then
    HEALTH=$(curl -s http://127.0.0.1:3028/healthz)
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "  Response: ${HEALTH}"
else
    echo -e "${RED}✗ Health check failed${NC}"
    echo "  URL: http://127.0.0.1:3028/healthz"
fi

# Check LaunchAgent (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "\n${YELLOW}[4/5] Checking LaunchAgent status...${NC}"
    if [ -f "$HOME/Library/LaunchAgents/com.brainwav.local-memory.plist" ]; then
        echo -e "${GREEN}✓ LaunchAgent is installed${NC}"
        if launchctl list | grep -q "com.brainwav.local-memory"; then
            echo -e "${GREEN}✓ LaunchAgent is loaded${NC}"
        else
            echo -e "${YELLOW}⚠ LaunchAgent exists but not loaded${NC}"
            echo "  Load with: launchctl load ~/Library/LaunchAgents/com.brainwav.local-memory.plist"
        fi
    else
        echo -e "${YELLOW}⚠ LaunchAgent not installed${NC}"
        echo "  Install with: pnpm install:autostart"
    fi
else
    echo -e "\n${YELLOW}[4/5] LaunchAgent check skipped (not macOS)${NC}"
fi

# Check logs
echo -e "\n${YELLOW}[5/5] Checking logs...${NC}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOCAL_MEMORY_DIR="$SCRIPT_DIR/.."
LOGS_DIR="$LOCAL_MEMORY_DIR/logs"

if [ -d "$LOGS_DIR" ]; then
    echo -e "${GREEN}✓ Logs directory exists${NC}"
    
    if [ -f "$LOGS_DIR/local-memory.log" ]; then
        LOG_SIZE=$(du -h "$LOGS_DIR/local-memory.log" | cut -f1)
        LOG_LINES=$(wc -l < "$LOGS_DIR/local-memory.log")
        echo "  local-memory.log: ${LOG_SIZE} (${LOG_LINES} lines)"
    fi
    
    if [ -f "$LOGS_DIR/launchd-stdout.log" ]; then
        LOG_SIZE=$(du -h "$LOGS_DIR/launchd-stdout.log" | cut -f1)
        LOG_LINES=$(wc -l < "$LOGS_DIR/launchd-stdout.log")
        echo "  launchd-stdout.log: ${LOG_SIZE} (${LOG_LINES} lines)"
    fi
else
    echo -e "${YELLOW}⚠ Logs directory not found${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}=== Service Status Summary ===${NC}"
echo -e "${BLUE}REST API: http://127.0.0.1:3028${NC}"
echo ""
echo "Quick commands:"
echo "  Test: curl http://127.0.0.1:3028/healthz"
echo "  Logs: tail -f $LOGS_DIR/local-memory.log"
echo "  Stop: pnpm stop:service"
echo ""
