#!/bin/bash

# Verification script for MCP server and TDD Coach plugin setup
# This script checks if all components are properly configured for automatic operation

set -e

echo "Verifying MCP Server and TDD Coach Plugin Setup..."
echo "==================================================="

# Check if required directories exist
echo "1. Checking required directories..."
REQUIRED_DIRS=(
    "/Users/jamiecraik/.Cortex-OS/packages/mcp"
    "/Users/jamiecraik/.Cortex-OS/packages/mcp/plugins"
    "/Users/jamiecraik/.Cortex-OS/packages/tdd-coach"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "   ✅ $dir exists"
    else
        echo "   ❌ $dir not found"
        exit 1
    fi
done

# Check if required files exist
echo "2. Checking required files..."
REQUIRED_FILES=(
    "/Users/jamiecraik/.Cortex-OS/packages/mcp/config/server.json"
    "/Users/jamiecraik/.Cortex-OS/packages/mcp/plugins/tdd_coach_plugin.py"
    "/Users/jamiecraik/.Cortex-OS/packages/mcp/plugins/tdd_coach_plugin.json"
    "/Users/jamiecraik/.Cortex-OS/scripts/start-mcp-server.sh"
    "/Users/jamiecraik/.Cortex-OS/infra/mcp/com.brainwav.mcp-server.plist"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file exists"
    else
        echo "   ❌ $file not found"
        exit 1
    fi
done

# Check if TDD Coach Node.js package has required files
echo "3. Checking TDD Coach Node.js package..."
TDD_COACH_FILES=(
    "package.json"
    "src/mcp/server.ts"
)

cd /Users/jamiecraik/.Cortex-OS/packages/tdd-coach
for file in "${TDD_COACH_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file exists"
    else
        echo "   ❌ $file not found"
        exit 1
    fi
done

# Check if startup script is executable
echo "4. Checking script permissions..."
if [ -x "/Users/jamiecraik/.Cortex-OS/scripts/start-mcp-server.sh" ]; then
    echo "   ✅ Startup script is executable"
else
    echo "   ❌ Startup script is not executable"
    exit 1
fi

# Check if Node.js and Python are available
echo "5. Checking required runtimes..."
if command -v node &> /dev/null; then
    echo "   ✅ Node.js is available"
else
    echo "   ❌ Node.js not found"
    exit 1
fi

if command -v python3 &> /dev/null; then
    echo "   ✅ Python is available"
else
    echo "   ❌ Python not found"
    exit 1
fi

# Check if required Node.js dependencies are installed
echo "6. Checking Node.js dependencies..."
if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
    echo "   ✅ Node.js dependencies are installed"
else
    echo "   ⚠️  Node.js dependencies may not be installed"
    echo "   Run 'npm install' in /Users/jamiecraik/.Cortex-OS/packages/tdd-coach"
fi

echo ""
echo "✅ All verification checks passed!"
echo "The MCP server and TDD Coach plugin are properly configured for automatic operation."
echo ""
echo "To install the auto-startup service:"
echo "1. sudo cp /Users/jamiecraik/.Cortex-OS/infra/mcp/com.brainwav.mcp-server.plist /Library/LaunchDaemons/"
echo "2. sudo chown root:wheel /Library/LaunchDaemons/com.brainwav.mcp-server.plist"
echo "3. sudo chmod 644 /Library/LaunchDaemons/com.brainwav.mcp-server.plist"
echo "4. sudo launchctl load /Library/LaunchDaemons/com.brainwav.mcp-server.plist"
