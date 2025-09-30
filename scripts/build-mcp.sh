#!/bin/bash

# Quick MCP Build Script - Alternative to the full deployment script
# This script just builds the MCP package locally for manual deployment

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly MCP_PACKAGE_DIR="${PROJECT_ROOT}/packages/cortex-mcp"

echo "🏗️  Building Cortex MCP package..."

cd "$MCP_PACKAGE_DIR"

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist build

# Sync dependencies and build
echo "Installing dependencies..."
uv sync

echo "Building package..."
uv build

# Check output
WHEEL_FILE=$(find dist -name "cortex_mcp-*.whl" | head -1)
SDIST_FILE=$(find dist -name "cortex_mcp-*.tar.gz" | head -1)

if [[ -n "$WHEEL_FILE" ]]; then
    echo "✅ Wheel built successfully: $WHEEL_FILE"
    echo "   Size: $(du -h "$WHEEL_FILE" | cut -f1)"
fi

if [[ -n "$SDIST_FILE" ]]; then
    echo "✅ Source distribution built: $SDIST_FILE"  
    echo "   Size: $(du -h "$SDIST_FILE" | cut -f1)"
fi

echo ""
echo "📦 Build complete! Files in: $MCP_PACKAGE_DIR/dist/"
echo ""
echo "Next steps for manual deployment:"
echo "  1. Copy dist/cortex_mcp-*.whl to your MCP host"
echo "  2. On the host, run:"
echo "     sudo systemctl stop cortex-fastmcp.service"
echo "     pip install --upgrade /path/to/cortex_mcp-*.whl"
echo "     export CORTEX_MCP_TRANSPORT=streamable-http"
echo "     sudo systemctl start cortex-fastmcp.service"
echo "     sudo systemctl status cortex-fastmcp.service --no-pager"
echo ""
echo "Or use the automated deployment script:"
echo "  ./scripts/deploy-mcp.sh"
