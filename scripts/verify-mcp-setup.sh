#!/bin/bash

# Verification script for cortex-mcp auto-start setup (macOS launchd + optional systemd unit)
# Validates directories, files, permissions, and basic health readiness.

set -euo pipefail

echo "Verifying cortex-mcp auto-start setup..."
echo "======================================="

MCP_DIR="/Users/jamiecraik/.Cortex-OS/packages/cortex-mcp"
PLIST="/Users/jamiecraik/.Cortex-OS/infra/mcp/com.brainwav.mcp-server.plist"
START_SCRIPT="/Users/jamiecraik/.Cortex-OS/scripts/start-mcp-server.sh"
LOG_DIR="/Users/jamiecraik/.Cortex-OS/logs"

echo "1) Checking required directories..."
REQUIRED_DIRS=(
    "$MCP_DIR"
    "$LOG_DIR"
)
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "   ✅ $dir exists"
    else
        echo "   ❌ Missing directory: $dir"; exit 1
    fi
done

echo "2) Checking required files..."
REQUIRED_FILES=(
    "$MCP_DIR/cortex_fastmcp_server_v2.py"
    "$MCP_DIR/__init__.py"
    "$START_SCRIPT"
    "$PLIST"
)
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file exists"
    else
        echo "   ❌ Missing file: $file"; exit 1
    fi
done

echo "3) Validating plist contents point to cortex-mcp and correct label..."
if ! grep -q "/packages/cortex-mcp" "$PLIST"; then
    echo "   ❌ Plist WorkingDirectory does not reference cortex-mcp"; exit 1
fi
if ! grep -q "/scripts/start-mcp-server.sh" "$PLIST"; then
    echo "   ❌ Plist ProgramArguments does not reference start-mcp-server.sh"; exit 1
fi
if ! grep -q "<string>com.cortexos.mcp.server</string>" "$PLIST"; then
    echo "   ❌ Plist Label is not com.cortexos.mcp.server"; exit 1
fi
echo "   ✅ Plist references and label are correct"

echo "3a) Checking optional user LaunchAgent and health agent..."
USER_PLIST="/Users/jamiecraik/.Cortex-OS/infra/mcp/com.cortexos.mcp.server.plist"
HEALTH_PLIST="/Users/jamiecraik/.Cortex-OS/infra/mcp/com.cortexos.mcp.server.health.plist"
HEALTH_SCRIPT="/Users/jamiecraik/.Cortex-OS/scripts/mcp/health_probe.sh"
if [ -f "$USER_PLIST" ]; then echo "   ✅ User LaunchAgent present: $USER_PLIST"; fi
if [ -f "$HEALTH_PLIST" ]; then echo "   ✅ Health LaunchAgent present: $HEALTH_PLIST"; fi
if [ -f "$HEALTH_SCRIPT" ]; then echo "   ✅ Health probe script present: $HEALTH_SCRIPT"; fi

echo "4) Checking script permissions..."
if [ -x "$START_SCRIPT" ]; then
    echo "   ✅ Startup script is executable"
else
    echo "   ❌ Startup script is not executable; run: chmod +x $START_SCRIPT"; exit 1
fi

echo "5) Checking Python availability..."
if command -v python3 >/dev/null 2>&1; then
    echo "   ✅ python3 found: $(python3 -V)"
else
    echo "   ❌ python3 not found in PATH"; exit 1
fi

echo "6) Quick health check (if server already running on 3024)..."
if command -v curl >/dev/null 2>&1; then
    if curl -fsS "http://127.0.0.1:3024/health" >/dev/null 2>&1; then
        echo "   ✅ Health endpoint responded"
    else
        echo "   ℹ️  Health endpoint not reachable (server may not be loaded yet)"
    fi
else
    echo "   ℹ️  curl not available; skipping health probe"
fi

echo "\n✅ Verification complete"
echo "System LaunchDaemon (requires sudo):"
echo "  sudo cp $PLIST /Library/LaunchDaemons/"
echo "  sudo chown root:wheel /Library/LaunchDaemons/com.cortexos.mcp.server.plist"
echo "  sudo chmod 644 /Library/LaunchDaemons/com.cortexos.mcp.server.plist"
echo "  sudo launchctl unload /Library/LaunchDaemons/com.cortexos.mcp.server.plist 2>/dev/null || true"
echo "  sudo launchctl load /Library/LaunchDaemons/com.cortexos.mcp.server.plist"

echo "\nUser LaunchAgents (no sudo):"
echo "  mkdir -p ~/Library/LaunchAgents"
echo "  cp /Users/jamiecraik/.Cortex-OS/infra/mcp/com.cortexos.mcp.server.plist ~/Library/LaunchAgents/"
echo "  launchctl unload ~/Library/LaunchAgents/com.cortexos.mcp.server.plist 2>/dev/null || true"
echo "  launchctl load ~/Library/LaunchAgents/com.cortexos.mcp.server.plist"
echo "  # Optional health agent"
echo "  cp /Users/jamiecraik/.Cortex-OS/infra/mcp/com.cortexos.mcp.server.health.plist ~/Library/LaunchAgents/"
echo "  launchctl unload ~/Library/LaunchAgents/com.cortexos.mcp.server.health.plist 2>/dev/null || true"
echo "  launchctl load ~/Library/LaunchAgents/com.cortexos.mcp.server.health.plist"
