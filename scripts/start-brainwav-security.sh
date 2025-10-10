#!/bin/bash
# brAInwav Security Stack Startup Script for macOS
# Starts the enhanced security infrastructure alongside your existing Cortex-OS

set -e

# brAInwav branding
echo "🧠 brAInwav Security Stack for Cortex-OS"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print brAInwav branded messages
brainwav_log() {
    echo -e "${BLUE}[brAInwav]${NC} $1"
}

brainwav_success() {
    echo -e "${GREEN}✅ [brAInwav]${NC} $1"
}

brainwav_warning() {
    echo -e "${YELLOW}⚠️  [brAInwav]${NC} $1"
}

brainwav_error() {
    echo -e "${RED}❌ [brAInwav]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    brainwav_error "Docker is not running. Please start Docker Desktop."
    exit 1
fi

brainwav_success "Docker is running"

# Check if existing Cortex-OS network exists
if ! docker network ls | grep -q cortex-network; then
    brainwav_log "Creating cortex-network..."
    docker network create cortex-network
    brainwav_success "Created cortex-network"
else
    brainwav_success "Found existing cortex-network"
fi

# Build the brAInwav security components
brainwav_log "Building brAInwav security components..."

# Build security package
cd packages/security
brainwav_log "Building brAInwav policy engine..."
pnpm build
brainwav_success "Policy engine built"

# Build enhanced MCP server
cd ../mcp-server
brainwav_log "Building enhanced MCP server..."
pnpm build
brainwav_success "Enhanced MCP server built"

cd ../..

# Start the brAInwav security stack
brainwav_log "Starting brAInwav security stack..."
docker-compose -f docker/docker-compose.macos-dev.yml up -d

# Wait for services to be healthy
brainwav_log "Waiting for brAInwav services to start..."
sleep 10

# Check service health
brainwav_log "Checking brAInwav service health..."

# Check egress proxy
if curl -f http://localhost:8889/health > /dev/null 2>&1; then
    brainwav_success "Egress proxy is healthy"
else
    brainwav_warning "Egress proxy health check failed (may still be starting)"
fi

# Check enhanced MCP server
if curl -f http://localhost:3024/health > /dev/null 2>&1; then
    brainwav_success "Enhanced MCP server is healthy"
else
    brainwav_warning "Enhanced MCP server health check failed (may still be starting)"
fi

# Display service information
echo ""
brainwav_log "brAInwav Security Stack Status:"
echo "================================================"
echo "🔒 Egress Proxy:      http://localhost:8888"
echo "📊 Proxy Health:      http://localhost:8889/health"
echo "📊 Proxy Stats:       http://localhost:8889/stats"
echo "🔧 Enhanced MCP:      http://localhost:3024"
echo "📊 Dashboard:         http://localhost:8890 (if enabled)"
echo ""

brainwav_log "Container Status:"
docker-compose -f docker/docker-compose.macos-dev.yml ps

echo ""
brainwav_success "brAInwav security stack is running!"
echo ""
brainwav_log "Next steps:"
echo "1. Configure your applications to use HTTP_PROXY=http://localhost:8888"
echo "2. Monitor security events in logs: docker-compose -f docker/docker-compose.macos-dev.yml logs -f"
echo "3. Check policy violations: curl http://localhost:8889/stats"
echo ""

brainwav_log "To stop the brAInwav security stack:"
echo "docker-compose -f docker/docker-compose.macos-dev.yml down"
echo ""

brainwav_success "brAInwav security integration complete! 🎉"
