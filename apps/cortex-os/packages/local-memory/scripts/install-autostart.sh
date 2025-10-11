#!/usr/bin/env bash
#
# Local Memory LaunchAgent Installation Script
# brAInwav Cortex-OS
#
# This script installs the local-memory service to start automatically
# at system boot (user login) and shutdown gracefully at system shutdown.
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOCAL_MEMORY_DIR="$SCRIPT_DIR/.."
LAUNCHD_DIR="$LOCAL_MEMORY_DIR/launchd"
PLIST_TEMPLATE="$LAUNCHD_DIR/com.brainwav.local-memory.plist"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_DEST="$LAUNCH_AGENTS_DIR/com.brainwav.local-memory.plist"
SERVICE_LABEL="com.brainwav.local-memory"

echo -e "${BLUE}=== brAInwav Local Memory LaunchAgent Installation ===${NC}"
echo ""

# Step 1: Verify we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo -e "${RED}✗ This script is for macOS only${NC}"
  echo "For Linux, use systemd. For Windows, use Task Scheduler."
  exit 1
fi

echo -e "${GREEN}✓ macOS detected${NC}"

# Step 2: Check if service is already installed
if [ -f "$PLIST_DEST" ]; then
  echo -e "${YELLOW}⚠ Service is already installed${NC}"
  read -p "Reinstall? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Installation cancelled${NC}"
    exit 0
  fi
  
  # Unload existing service
  echo -e "${YELLOW}Unloading existing service...${NC}"
  launchctl unload "$PLIST_DEST" 2>/dev/null || true
  launchctl remove "$SERVICE_LABEL" 2>/dev/null || true
  sleep 2
fi

# Step 3: Verify plist template exists
if [ ! -f "$PLIST_TEMPLATE" ]; then
  echo -e "${RED}✗ LaunchAgent plist template not found${NC}"
  echo "Expected at: $PLIST_TEMPLATE"
  exit 1
fi

echo -e "${GREEN}✓ Plist template found${NC}"

# Step 4: Resolve absolute paths
INSTALL_DIR=$(cd "$LOCAL_MEMORY_DIR" && pwd)
echo -e "${BLUE}Install directory: ${INSTALL_DIR}${NC}"

# Find node path (check multiple locations)
NODE_PATH=""
if command -v node &> /dev/null; then
  NODE_BIN=$(which node)
  NODE_PATH=$(dirname "$NODE_BIN")
  echo -e "${GREEN}✓ Node found at: ${NODE_PATH}${NC}"
else
  echo -e "${RED}✗ Node.js not found in PATH${NC}"
  echo "Please install Node.js first"
  exit 1
fi

# Find pnpm
if ! command -v pnpm &> /dev/null; then
  echo -e "${RED}✗ pnpm not found${NC}"
  echo "Please install pnpm: npm install -g pnpm"
  exit 1
fi

echo -e "${GREEN}✓ pnpm found${NC}"

# Step 5: Create LaunchAgents directory if needed
if [ ! -d "$LAUNCH_AGENTS_DIR" ]; then
  echo -e "${YELLOW}Creating LaunchAgents directory...${NC}"
  mkdir -p "$LAUNCH_AGENTS_DIR"
fi

echo -e "${GREEN}✓ LaunchAgents directory ready${NC}"

# Step 6: Create logs directory
LOGS_DIR="$INSTALL_DIR/logs"
if [ ! -d "$LOGS_DIR" ]; then
  echo -e "${YELLOW}Creating logs directory...${NC}"
  mkdir -p "$LOGS_DIR"
fi

echo -e "${GREEN}✓ Logs directory ready${NC}"

# Step 7: Build the service if needed
if [ ! -d "$INSTALL_DIR/dist" ]; then
  echo -e "${YELLOW}Building TypeScript code...${NC}"
  cd "$INSTALL_DIR"
  pnpm install
  pnpm build
  echo -e "${GREEN}✓ Build complete${NC}"
else
  echo -e "${GREEN}✓ Build directory exists${NC}"
fi

# Step 8: Create plist with substituted paths
echo -e "${YELLOW}Creating LaunchAgent plist...${NC}"

# Read template and substitute paths
sed -e "s|__INSTALL_DIR__|${INSTALL_DIR}|g" \
    -e "s|__NODE_PATH__|${NODE_PATH}|g" \
    "$PLIST_TEMPLATE" > "$PLIST_DEST"

# Set proper permissions
chmod 644 "$PLIST_DEST"

echo -e "${GREEN}✓ Plist created at: ${PLIST_DEST}${NC}"

# Step 9: Load the service
echo -e "${YELLOW}Loading LaunchAgent...${NC}"

# Unload first (in case it's running)
launchctl unload "$PLIST_DEST" 2>/dev/null || true
launchctl remove "$SERVICE_LABEL" 2>/dev/null || true
sleep 2

# Load the service
if launchctl load "$PLIST_DEST" 2>&1; then
  echo -e "${GREEN}✓ LaunchAgent loaded${NC}"
else
  echo -e "${RED}✗ Failed to load LaunchAgent${NC}"
  echo "Check the plist file: $PLIST_DEST"
  exit 1
fi

# Wait a moment for service to start
sleep 5

# Step 10: Verify service is running
echo -e "${YELLOW}Verifying service status...${NC}"

if launchctl list | grep -q "$SERVICE_LABEL"; then
  echo -e "${GREEN}✓ Service is registered${NC}"
  
  # Test health endpoint
  if curl -f -s "http://127.0.0.1:3028/healthz" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Service is responding${NC}"
    echo ""
    echo -e "${GREEN}=== Installation Complete ===${NC}"
    echo ""
    echo -e "${BLUE}The local-memory service will now:${NC}"
    echo "  • Start automatically at login"
    echo "  • Restart automatically if it crashes"
    echo "  • Shutdown gracefully at logout/shutdown"
    echo ""
    echo -e "${BLUE}Service Management:${NC}"
    echo "  • Check status:  launchctl list | grep $SERVICE_LABEL"
    echo "  • View logs:     tail -f $LOGS_DIR/launchd-stdout.log"
    echo "  • Test health:   curl http://127.0.0.1:3028/healthz"
    echo "  • Uninstall:     bash scripts/uninstall-autostart.sh"
    echo ""
    echo -e "${BLUE}Manual Control:${NC}"
    echo "  • Stop:    launchctl stop $SERVICE_LABEL"
    echo "  • Start:   launchctl start $SERVICE_LABEL"
    echo "  • Restart: launchctl kickstart -k gui/\$(id -u)/$SERVICE_LABEL"
    echo ""
  else
    echo -e "${YELLOW}⚠ Service registered but not responding yet${NC}"
    echo "Check logs: tail -f $LOGS_DIR/launchd-stdout.log"
    echo "It may take a few more seconds to start"
  fi
else
  echo -e "${RED}✗ Service not registered${NC}"
  echo "Check system logs: log show --predicate 'process == \"launchd\"' --last 5m"
  exit 1
fi

# Step 11: Create quick reference
cat > "$INSTALL_DIR/AUTOSTART-INFO.txt" <<EOF
brAInwav Local Memory - Autostart Configuration

Installation Date: $(date)
Service Label: $SERVICE_LABEL
Plist Location: $PLIST_DEST
Install Directory: $INSTALL_DIR

The service is configured to:
- Start automatically at user login
- Restart if it crashes (with 30-second throttle)
- Shutdown gracefully at logout/shutdown
- Log to: $LOGS_DIR/

Management Commands:
  launchctl list | grep $SERVICE_LABEL    # Check status
  launchctl stop $SERVICE_LABEL           # Stop service
  launchctl start $SERVICE_LABEL          # Start service
  launchctl kickstart -k gui/\$(id -u)/$SERVICE_LABEL  # Restart

Logs:
  tail -f $LOGS_DIR/launchd-stdout.log    # Standard output
  tail -f $LOGS_DIR/launchd-stderr.log    # Errors
  tail -f $LOGS_DIR/local-memory.log      # Application logs

Uninstall:
  bash scripts/uninstall-autostart.sh

Health Check:
  curl http://127.0.0.1:3028/healthz

For more information, see: docs/AUTOSTART.md
EOF

echo -e "${GREEN}✓ Quick reference saved to: AUTOSTART-INFO.txt${NC}"
