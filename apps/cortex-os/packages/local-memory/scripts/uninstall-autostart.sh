#!/usr/bin/env bash
#
# Local Memory LaunchAgent Uninstallation Script
# brAInwav Cortex-OS
#
# This script removes the local-memory autostart service
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Paths
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_FILE="$LAUNCH_AGENTS_DIR/com.brainwav.local-memory.plist"
SERVICE_LABEL="com.brainwav.local-memory"

echo -e "${BLUE}=== brAInwav Local Memory LaunchAgent Uninstallation ===${NC}"
echo ""

# Verify we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo -e "${RED}✗ This script is for macOS only${NC}"
  exit 1
fi

# Check if service is installed
if [ ! -f "$PLIST_FILE" ]; then
  echo -e "${YELLOW}⚠ LaunchAgent is not installed${NC}"
  echo "Nothing to uninstall"
  exit 0
fi

echo -e "${GREEN}✓ LaunchAgent found${NC}"

# Confirm uninstallation
echo -e "${YELLOW}This will remove the autostart configuration.${NC}"
echo "The service will no longer start automatically at login."
echo ""
read -p "Continue with uninstallation? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${BLUE}Uninstallation cancelled${NC}"
  exit 0
fi

# Step 1: Stop the service
echo -e "${YELLOW}Stopping service...${NC}"

if launchctl list | grep -q "$SERVICE_LABEL"; then
  launchctl stop "$SERVICE_LABEL" 2>/dev/null || true
  echo -e "${GREEN}✓ Service stopped${NC}"
else
  echo -e "${BLUE}Service was not running${NC}"
fi

# Step 2: Unload the LaunchAgent
echo -e "${YELLOW}Unloading LaunchAgent...${NC}"

if launchctl unload "$PLIST_FILE" 2>&1; then
  echo -e "${GREEN}✓ LaunchAgent unloaded${NC}"
else
  echo -e "${YELLOW}⚠ Warning during unload (may be okay)${NC}"
fi

# Remove from launchctl
launchctl remove "$SERVICE_LABEL" 2>/dev/null || true

# Step 3: Remove plist file
echo -e "${YELLOW}Removing plist file...${NC}"

if rm "$PLIST_FILE"; then
  echo -e "${GREEN}✓ Plist file removed${NC}"
else
  echo -e "${RED}✗ Failed to remove plist file${NC}"
  echo "You may need to remove it manually: $PLIST_FILE"
fi

# Step 4: Verify removal
sleep 2

if launchctl list | grep -q "$SERVICE_LABEL"; then
  echo -e "${YELLOW}⚠ Service still appears in launchctl list${NC}"
  echo "It should be removed after logout/login"
else
  echo -e "${GREEN}✓ Service removed from launchctl${NC}"
fi

if [ -f "$PLIST_FILE" ]; then
  echo -e "${RED}✗ Plist file still exists${NC}"
else
  echo -e "${GREEN}✓ Plist file removed${NC}"
fi

# Step 5: Clean up info file
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOCAL_MEMORY_DIR="$SCRIPT_DIR/.."
INFO_FILE="$LOCAL_MEMORY_DIR/AUTOSTART-INFO.txt"

if [ -f "$INFO_FILE" ]; then
  rm "$INFO_FILE"
  echo -e "${GREEN}✓ Info file removed${NC}"
fi

echo ""
echo -e "${GREEN}=== Uninstallation Complete ===${NC}"
echo ""
echo -e "${BLUE}The local-memory service will no longer start automatically.${NC}"
echo ""
echo "You can still run it manually:"
echo "  cd apps/cortex-os/packages/local-memory"
echo "  pnpm start:service"
echo ""
echo "To reinstall autostart:"
echo "  bash scripts/install-autostart.sh"
echo ""
