#!/usr/bin/env bash
#
# Local Memory REST API Server Startup Script
# brAInwav Cortex-OS
#
# IMPORTANT: This starts the OPTIONAL REST API server (port 3028).
# For MCP protocol access (recommended), use the MCP Server (port 3024).
#
# This script:
# 1. Checks prerequisites (Ollama, Qdrant)
# 2. Starts Qdrant if not running
# 3. Builds the REST API server
# 4. Configures hybrid model routing defaults
# 5. Starts the vibe-check oversight server
# 6. Starts the REST API server on port 3028
#
# Usage: ./start-local-memory.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../../../.."
LOCAL_MEMORY_DIR="$SCRIPT_DIR/.."
HYBRID_ENV_FILE="$PROJECT_ROOT/config/hybrid.env"

# Source port configuration
if [ -f "$LOCAL_MEMORY_DIR/port.env" ]; then
  source "$LOCAL_MEMORY_DIR/port.env"
else
  # Fallback to root config
  if [ -f "$PROJECT_ROOT/config/ports.env" ]; then
    source "$PROJECT_ROOT/config/ports.env"
  fi
fi

# Default values if not set
MEMORY_API_PORT=${MEMORY_API_PORT:-3028}
LOCAL_MEMORY_HOST=${LOCAL_MEMORY_HOST:-127.0.0.1}
LOCAL_MEMORY_BASE_URL=${LOCAL_MEMORY_BASE_URL:-http://127.0.0.1:3028}

# Helper to read a key from an env file without overriding explicit exports
read_env_default() {
  local key="$1"
  local file="$2"
  if [ ! -f "$file" ]; then
    return 1
  fi
  local line
  line=$(grep -E "^${key}=" "$file" | tail -n1 | cut -d'=' -f2-)
  if [ -z "$line" ]; then
    return 1
  fi
  line="${line%\"}"
  line="${line#\"}"
  printf '%s' "$line"
}

echo -e "${BLUE}=== brAInwav Local Memory REST API Server ===${NC}"
echo -e "${YELLOW}Note: This is the OPTIONAL REST API server (port 3028)${NC}"
echo -e "${YELLOW}MCP Server (port 3024) is the primary interface and already running${NC}"
echo ""
echo -e "${BLUE}Port: ${MEMORY_API_PORT}${NC}"
echo -e "${BLUE}Host: ${LOCAL_MEMORY_HOST}${NC}"
echo ""

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
  lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1
}

# Step 1: Check Prerequisites
echo -e "${YELLOW}[1/7] Checking prerequisites...${NC}"

if ! command_exists ollama; then
  echo -e "${RED}✗ Ollama not found${NC}"
  echo "Please install Ollama from: https://ollama.ai/download"
  exit 1
fi
echo -e "${GREEN}✓ Ollama installed${NC}"

# Check Ollama models
if ! ollama list | grep -q "nomic-embed-text"; then
  echo -e "${YELLOW}⚠ Installing nomic-embed-text model...${NC}"
  ollama pull nomic-embed-text
fi
echo -e "${GREEN}✓ Embedding model available${NC}"

# Step 2: Check/Start Qdrant
echo -e "\n${YELLOW}[2/7] Checking Qdrant status...${NC}"

if [ -f "$HOME/.local-memory/qdrant" ]; then
  if ! pgrep -f "qdrant" > /dev/null; then
    echo -e "${YELLOW}⚠ Starting Qdrant...${NC}"
    cd ~/.local-memory
    nohup ./qdrant > qdrant.log 2>&1 &
    sleep 3
    echo -e "${GREEN}✓ Qdrant started${NC}"
  else
    echo -e "${GREEN}✓ Qdrant already running${NC}"
  fi
  
  # Verify Qdrant health
  if curl -f -s http://localhost:6333/healthz > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Qdrant is healthy${NC}"
  else
    echo -e "${RED}✗ Qdrant health check failed${NC}"
    echo "Check logs at: ~/.local-memory/qdrant.log"
  fi
else
  echo -e "${YELLOW}⚠ Qdrant not installed${NC}"
  echo "Install Qdrant for better performance:"
  echo "  curl -L https://github.com/qdrant/qdrant/releases/latest/download/qdrant-$(uname -m)-apple-darwin.tar.gz -o ~/.local-memory/qdrant.tar.gz"
  echo "  cd ~/.local-memory && tar -xzf qdrant.tar.gz && chmod +x qdrant"
fi

# Step 3: Check if port is available
echo -e "\n${YELLOW}[3/7] Checking port availability...${NC}"

if port_in_use $MEMORY_API_PORT; then
  echo -e "${YELLOW}⚠ Port ${MEMORY_API_PORT} is already in use${NC}"
  echo "Current process:"
  lsof -Pi :$MEMORY_API_PORT -sTCP:LISTEN
  read -p "Kill existing process? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    lsof -ti:$MEMORY_API_PORT | xargs kill -9
    echo -e "${GREEN}✓ Process killed${NC}"
    sleep 2
  else
    echo -e "${RED}✗ Cannot start service on occupied port${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✓ Port ${MEMORY_API_PORT} is available${NC}"
fi

# Step 4: Build the service
echo -e "\n${YELLOW}[4/7] Building local-memory service...${NC}"

cd "$LOCAL_MEMORY_DIR"

if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}⚠ Installing dependencies...${NC}"
  pnpm install
fi

if [ ! -d "dist" ]; then
  echo -e "${YELLOW}⚠ Building TypeScript...${NC}"
  pnpm build
else
  echo -e "${GREEN}✓ Build directory exists${NC}"
  read -p "Rebuild? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    pnpm build
  fi
fi

# Step 5: Export environment variables
echo -e "\n${YELLOW}[5/7] Configuring environment...${NC}"

export MEMORY_API_PORT
export LOCAL_MEMORY_HOST
export LOCAL_MEMORY_BASE_URL
export MEMORY_LOG_LEVEL=${MEMORY_LOG_LEVEL:-info}

echo -e "${GREEN}✓ Environment configured${NC}"
echo "  MEMORY_API_PORT=${MEMORY_API_PORT}"
echo "  LOCAL_MEMORY_HOST=${LOCAL_MEMORY_HOST}"
echo "  LOCAL_MEMORY_BASE_URL=${LOCAL_MEMORY_BASE_URL}"

# Derive hybrid routing defaults for the vibe-check server when not explicitly provided
if [ -z "${VIBE_CHECK_MODEL_GATEWAY_URL:-}" ]; then
  VIBE_CHECK_MODEL_GATEWAY_URL=$(read_env_default MODEL_GATEWAY_URL "$HYBRID_ENV_FILE" || printf '')
fi
if [ -z "${VIBE_CHECK_MODEL_GATEWAY_TIMEOUT:-}" ]; then
  VIBE_CHECK_MODEL_GATEWAY_TIMEOUT=$(read_env_default MODEL_GATEWAY_TIMEOUT "$HYBRID_ENV_FILE" || printf '5000')
fi
if [ -z "${VIBE_CHECK_MODEL_GATEWAY_API_KEY:-}" ]; then
  VIBE_CHECK_MODEL_GATEWAY_API_KEY=$(read_env_default MODEL_GATEWAY_API_KEY "$HYBRID_ENV_FILE" || printf '')
fi
if [ -z "${VIBE_CHECK_MODEL_GATEWAY_MODEL:-}" ]; then
  VIBE_CHECK_MODEL_GATEWAY_MODEL=$(read_env_default CORTEX_MODEL_GATEWAY_MODEL "$HYBRID_ENV_FILE" || printf '')
fi

export VIBE_CHECK_MODEL_GATEWAY_URL
export VIBE_CHECK_MODEL_GATEWAY_TIMEOUT
export VIBE_CHECK_MODEL_GATEWAY_API_KEY
export VIBE_CHECK_MODEL_GATEWAY_MODEL

echo "  VIBE_CHECK_MODEL_GATEWAY_URL=${VIBE_CHECK_MODEL_GATEWAY_URL:-<unset>}"
echo "  VIBE_CHECK_MODEL_GATEWAY_TIMEOUT=${VIBE_CHECK_MODEL_GATEWAY_TIMEOUT:-<unset>}"
echo "  VIBE_CHECK_MODEL_GATEWAY_MODEL=${VIBE_CHECK_MODEL_GATEWAY_MODEL:-<unset>}"

# Step 6: Ensure vibe-check oversight server is running with hybrid routing
echo -e "\n${YELLOW}[6/7] Starting brAInwav vibe-check server...${NC}"

mkdir -p "$LOCAL_MEMORY_DIR/logs"

if ! pgrep -f "vibe-check-mcp.*2091" > /dev/null; then
  echo -e "${BLUE}Starting vibe-check server on port 2091...${NC}"
  if command -v vibe-check-mcp >/dev/null 2>&1; then
    VIBE_CHECK_CMD=(vibe-check-mcp)
  else
    echo -e "${YELLOW}[brAInwav] vibe-check CLI not found globally, falling back to npx runner${NC}"
    VIBE_CHECK_CMD=(npx @pv-bhat/vibe-check-mcp)
  fi
  nohup "${VIBE_CHECK_CMD[@]}" start --http --port 2091 > "$LOCAL_MEMORY_DIR/logs/vibe-check.log" 2>&1 &
  VIBE_CHECK_PID=$!
  sleep 5
else
  VIBE_CHECK_PID=$(pgrep -f "vibe-check-mcp.*2091" | head -n1)
  echo -e "${GREEN}✓ Vibe-check server already running (PID: ${VIBE_CHECK_PID})${NC}"
fi

if [ -n "${VIBE_CHECK_PID:-}" ] && ps -p "$VIBE_CHECK_PID" > /dev/null 2>&1; then
  if curl -f -s "http://127.0.0.1:2091/healthz" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Vibe-check health check passed${NC}"
    VIBE_SMOKE_PAYLOAD='{"jsonrpc":"2.0","id":"startup-health","method":"tools/call","params":{"name":"vibe_check","arguments":{"goal":"startup smoke test","plan":"1) ensure availability","sessionId":"startup-health"}}}'
    if curl -s -f \
      -H 'Content-Type: application/json' \
      -H 'Accept: application/json, text/event-stream' \
      -d "$VIBE_SMOKE_PAYLOAD" \
      "http://127.0.0.1:2091/mcp" > /dev/null; then
      echo -e "${GREEN}✓ Vibe-check MCP smoke test passed${NC}"
    else
      echo -e "${RED}✗ Vibe-check MCP smoke test failed${NC}"
      echo "Check logs at: $LOCAL_MEMORY_DIR/logs/vibe-check.log"
      kill "$VIBE_CHECK_PID" 2>/dev/null || true
      wait "$VIBE_CHECK_PID" 2>/dev/null || true
      exit 1
    fi
  else
    echo -e "${RED}✗ Vibe-check health check failed${NC}"
    echo "Check logs at: $LOCAL_MEMORY_DIR/logs/vibe-check.log"
    kill "$VIBE_CHECK_PID" 2>/dev/null || true
    wait "$VIBE_CHECK_PID" 2>/dev/null || true
    exit 1
  fi
else
  echo -e "${RED}✗ Vibe-check server failed to start${NC}"
  echo "Check logs at: $LOCAL_MEMORY_DIR/logs/vibe-check.log"
  exit 1
fi

# Step 6: Start the service
echo -e "\n${YELLOW}[7/7] Starting local-memory REST API server...${NC}"

# Create log directory if it doesn't exist
mkdir -p "$LOCAL_MEMORY_DIR/logs"

# Start the server
echo -e "${BLUE}Starting server...${NC}"
node ./dist/server.js > logs/local-memory.log 2>&1 &
SERVER_PID=$!

# Wait a bit for startup
sleep 3

# Verify the server is running
if ps -p $SERVER_PID > /dev/null; then
  echo -e "${GREEN}✓ Server started (PID: ${SERVER_PID})${NC}"
  
  # Test health endpoint
  if curl -f -s "${LOCAL_MEMORY_BASE_URL}/healthz" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo ""
    echo -e "${GREEN}=== Local Memory Service Ready ===${NC}"
    echo -e "${BLUE}REST API: ${LOCAL_MEMORY_BASE_URL}${NC}"
    echo -e "${BLUE}Health: ${LOCAL_MEMORY_BASE_URL}/healthz${NC}"
    echo -e "${BLUE}Logs: ${LOCAL_MEMORY_DIR}/logs/local-memory.log${NC}"
    echo ""
    echo "Test with:"
    echo "  curl ${LOCAL_MEMORY_BASE_URL}/healthz"
    echo ""
    echo "To stop:"
    echo "  kill ${SERVER_PID}"
    
    # Save PID for later
    echo $SERVER_PID > "$LOCAL_MEMORY_DIR/logs/server.pid"
  else
    echo -e "${RED}✗ Health check failed${NC}"
    echo "Check logs at: $LOCAL_MEMORY_DIR/logs/local-memory.log"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
  fi
else
  echo -e "${RED}✗ Server failed to start${NC}"
  echo "Check logs at: $LOCAL_MEMORY_DIR/logs/local-memory.log"
  exit 1
fi
