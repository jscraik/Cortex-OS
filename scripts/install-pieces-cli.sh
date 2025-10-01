#!/usr/bin/env bash
#
# Install Pieces CLI
# https://docs.pieces.app/products/cli/get-started
#

set -euo pipefail

echo "🚀 brAInwav: Installing Pieces CLI..."

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    echo "Please install Python 3 from https://www.python.org/downloads/"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo "✅ Found $PYTHON_VERSION"

# Check if pip is available
if ! python3 -m pip --version &> /dev/null; then
    echo "❌ Error: pip is not available"
    echo "Please install pip for Python 3"
    exit 1
fi

echo "✅ pip is available"

# Try installing with pipx first (recommended for CLI tools)
if command -v pipx &> /dev/null; then
    echo "📦 Installing Pieces CLI via pipx..."
    pipx install pieces-cli
    INSTALL_METHOD="pipx"
else
    echo "📦 Installing Pieces CLI via pip (user installation)..."
    python3 -m pip install --user pieces-cli
    INSTALL_METHOD="pip"
    
    # Add user Python bin to PATH if not already there
    USER_BASE=$(python3 -m site --user-base)
    USER_BIN="$USER_BASE/bin"
    
    if [[ ":$PATH:" != *":$USER_BIN:"* ]]; then
        echo ""
        echo "⚠️  Note: Add the following to your shell profile (~/.zshrc or ~/.bash_profile):"
        echo "export PATH=\"\$PATH:$USER_BIN\""
    fi
fi

echo ""
echo "✅ Pieces CLI installation complete!"
echo ""

# Verify installation
if command -v pieces &> /dev/null; then
    echo "🎉 Pieces CLI is ready to use!"
    echo ""
    pieces version
    echo ""
    echo "📚 Next steps:"
    echo "   1. Ensure Pieces OS is installed: https://docs.pieces.app/products/core-dependencies/pieces-os"
    echo "   2. Start Pieces OS application"
    echo "   3. Run: pieces run"
    echo ""
    echo "For MCP integration:"
    echo "   • Pieces OS MCP endpoint: http://localhost:39300/model_context_protocol/2024-11-05/sse"
    echo "   • Set PIECES_MCP_ENABLED=true in your environment"
else
    echo "⚠️  Pieces CLI installed but not found in PATH"
    echo ""
    if [[ "$INSTALL_METHOD" == "pip" ]]; then
        USER_BASE=$(python3 -m site --user-base)
        USER_BIN="$USER_BASE/bin"
        echo "Add to your PATH:"
        echo "  export PATH=\"\$PATH:$USER_BIN\""
        echo ""
        echo "Or run directly:"
        echo "  python3 -m pieces version"
    fi
fi
