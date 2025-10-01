#!/bin/bash
# dev-setup-poststart.sh - Post-start setup for DevContainer

set -euo pipefail

echo "🚀 Running post-start setup..."

cd /opt/cortex-home

# Start background services if needed
if command -v docker-compose &> /dev/null; then
    # Start Qdrant if not running
    if ! docker ps | grep -q qdrant; then
        echo "Starting Qdrant..."
        docker-compose -f docker/memory-stack/docker-compose.new.yml up -d qdrant
    fi
fi

# Show welcome message
if [ -f .devcontainer-welcome.txt ]; then
    cat .devcontainer-welcome.txt
fi

# Check if services are ready
echo ""
echo "Checking service status..."
sleep 2

# Check Qdrant
if curl -fsS http://localhost:6333/collections &> /dev/null; then
    echo "✅ Qdrant is running"
else
    echo "⚠️ Qdrant not available"
fi

# Check Local Memory
if curl -fsS http://localhost:3028/healthz &> /dev/null; then
    echo "✅ Local Memory is running"
else
    echo "⚠️ Local Memory not available"
fi

echo ""
echo "To start development:"
echo "  pnpm dev        # Start all services"
echo "  pnpm test       # Run tests"
echo "  pnpm lint       # Lint code"