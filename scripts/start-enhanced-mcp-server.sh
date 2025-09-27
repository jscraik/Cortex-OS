#!/bin/bash

# brAInwav Cortex-OS Enhanced MCP Server Startup Script
# This script starts the enhanced MCP server with Local Memory integration for ChatGPT Connectors

set -euo pipefail

# Configuration
DEFAULT_PORT=3024
DEFAULT_HOST="127.0.0.1"
DEFAULT_TRANSPORT="http"

# Environment variables
export PORT="${PORT:-$DEFAULT_PORT}"
export HOST="${HOST:-$DEFAULT_HOST}"
export TRANSPORT="${TRANSPORT:-$DEFAULT_TRANSPORT}"

# Local Memory configuration
export LOCAL_MEMORY_BIN="${LOCAL_MEMORY_BIN:-$HOME/.local/bin/local-memory}"
export LOCAL_MEMORY_BASE_URL="${LOCAL_MEMORY_BASE_URL:-http://localhost:3028/api/v1}"
export LOCAL_MEMORY_NAMESPACE="${LOCAL_MEMORY_NAMESPACE:-cortex-chatgpt}"

# brAInwav specific configuration
export BRAINWAV_ENVIRONMENT="${BRAINWAV_ENVIRONMENT:-development}"
export BRAINWAV_VERSION="2.1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}brAInwav Cortex-OS Enhanced MCP Server v2.1${NC}"
echo "=================================================="
echo "Starting enhanced MCP server with Local Memory integration"
echo "Port: $PORT"
echo "Host: $HOST"
echo "Transport: $TRANSPORT"
echo "Local Memory URL: $LOCAL_MEMORY_BASE_URL"
echo "Local Memory Namespace: $LOCAL_MEMORY_NAMESPACE"
echo ""

# Check if Local Memory binary exists
if [ ! -f "$LOCAL_MEMORY_BIN" ]; then
    echo -e "${YELLOW}Warning: Local Memory binary not found at $LOCAL_MEMORY_BIN${NC}"
    echo "Local Memory integration will be limited to REST API only"
else
    echo -e "${GREEN}Local Memory binary found: $LOCAL_MEMORY_BIN${NC}"
fi

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "Working directory: $(pwd)"

# Check if virtual environment exists
if [ -f ".venv/bin/python" ]; then
    PYTHON_CMD=".venv/bin/python"
    echo -e "${GREEN}Using virtual environment Python: $PYTHON_CMD${NC}"
else
    PYTHON_CMD="python3"
    echo -e "${YELLOW}Using system Python: $PYTHON_CMD${NC}"
fi

# Check for required dependencies
echo "Checking dependencies..."

check_dependencies() {
    set +e
    "$PYTHON_CMD" -c "import fastmcp, httpx; print('✓ Required dependencies found')"
    local status=$?
    set -e
    return $status
}

if ! check_dependencies; then
    echo -e "${YELLOW}brAInwav notice: FastMCP dependencies missing${NC}"
    if command -v uv >/dev/null 2>&1; then
        echo "Attempting automatic install with uv (editable cortex-mcp package)"
        if ! uv pip install --python "$PYTHON_CMD" -e ./packages/cortex-mcp >/dev/null; then
            echo -e "${RED}brAInwav: uv install failed. Please run:${NC}"
            echo "  uv pip install --python $PYTHON_CMD -e ./packages/cortex-mcp"
            exit 1
        fi
    else
        echo -e "${YELLOW}uv not detected. Falling back to pip guidance${NC}"
        echo -e "${YELLOW}Run:${NC} $PYTHON_CMD -m pip install --upgrade pip"
        echo -e "${YELLOW}Then:${NC} $PYTHON_CMD -m pip install -e ./packages/cortex-mcp"
        exit 1
    fi

    if ! check_dependencies; then
        echo -e "${RED}brAInwav: Dependencies still missing after install attempt${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}Dependencies verified for brAInwav MCP server${NC}"

echo ""
echo -e "${GREEN}Starting brAInwav Enhanced MCP Server...${NC}"
echo "=========================================="

# Start the enhanced server
exec $PYTHON_CMD packages/cortex-mcp/cortex_fastmcp_server_v2_enhanced.py
