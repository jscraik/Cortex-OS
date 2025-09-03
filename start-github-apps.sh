#!/bin/bash
# GitHub Apps Setup and Start Script

echo "🚀 Setting up GitHub Apps..."
echo "=============================="

# Load central port registry
PORTS_FILE="/Users/jamiecraik/.Cortex-OS/config/ports.env"
if [ -f "$PORTS_FILE" ]; then
    # shellcheck source=/dev/null
    . "$PORTS_FILE"
else
    echo "⚠️  Port registry not found at $PORTS_FILE. Using defaults (3001,3002,3003)."
    MCP_PORT=${MCP_PORT:-3000}
    GITHUB_AI_PORT=${GITHUB_AI_PORT:-3001}
    SEMGREP_PORT=${SEMGREP_PORT:-3002}
    STRUCTURE_PORT=${STRUCTURE_PORT:-3003}
fi

# Show resolved port mapping
echo
echo "📘 Port registry (Cloudflare tunnel):"
echo "  MCP:           ${MCP_PORT}"
echo "  GitHub AI:     ${GITHUB_AI_PORT}"
echo "  Semgrep:       ${SEMGREP_PORT}"
echo "  Structure:     ${STRUCTURE_PORT}"

# Function to check if a port is available
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
    echo "❌ Port $port is already in use (hint: ./free-ports.sh $port or ./free-ports.sh all)"
        return 1
    else
        echo "✅ Port $port is available"
        return 0
    fi
}

# Check all required ports
echo "📡 Checking ports..."
check_port "$GITHUB_AI_PORT" || exit 1
check_port "$SEMGREP_PORT" || exit 1
check_port "$STRUCTURE_PORT" || exit 1

echo
echo "⚠️  CONFIGURATION REQUIRED:"
echo "1. You need to set up real GitHub tokens in the .env files"
echo "2. You need to create actual GitHub Apps and get webhook secrets"
echo "3. You need to configure webhook URLs"
echo

read -p "Do you want to continue with demo/placeholder setup? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled. Please configure your GitHub tokens first."
    exit 1
fi

echo
echo "🔧 Starting GitHub Apps with placeholder config..."

# Start cortex-ai-github
echo "Starting cortex-ai-github on port $GITHUB_AI_PORT..."
cd /Users/jamiecraik/.Cortex-OS/packages/cortex-ai-github
mkdir -p logs
PORT="$GITHUB_AI_PORT" nohup pnpm dev > logs/app.log 2>&1 &
AI_PID=$!
echo "✅ cortex-ai-github started (PID: $AI_PID)"

# Wait a moment
sleep 2

# Start cortex-semgrep-github
echo "Starting cortex-semgrep-github on port $SEMGREP_PORT..."
cd /Users/jamiecraik/.Cortex-OS/packages/cortex-semgrep-github
mkdir -p logs
PORT="$SEMGREP_PORT" nohup pnpm dev > logs/app.log 2>&1 &
SEMGREP_PID=$!
echo "✅ cortex-semgrep-github started (PID: $SEMGREP_PID)"

# Wait a moment
sleep 2

# Start cortex-structure-github
echo "Starting cortex-structure-github on port $STRUCTURE_PORT..."
cd /Users/jamiecraik/.Cortex-OS/packages/cortex-structure-github
mkdir -p logs
PORT="$STRUCTURE_PORT" nohup pnpm dev > logs/app.log 2>&1 &
STRUCTURE_PID=$!
echo "✅ cortex-structure-github started (PID: $STRUCTURE_PID)"

# Wait for services to start
echo
echo "⏳ Waiting for services to initialize..."
sleep 5

# Check if services are responding
echo
echo "🔍 Checking service status..."
for port in "$GITHUB_AI_PORT" "$SEMGREP_PORT" "$STRUCTURE_PORT"; do
    if lsof -i :$port > /dev/null 2>&1; then
        echo "✅ Port $port: Service running"
    else
        echo "❌ Port $port: Service failed to start"
    fi
done

echo
echo "📋 Process Summary:"
echo "-------------------"
echo "cortex-ai-github ($GITHUB_AI_PORT): PID $AI_PID"
echo "cortex-semgrep-github ($SEMGREP_PORT): PID $SEMGREP_PID"
echo "cortex-structure-github ($STRUCTURE_PORT): PID $STRUCTURE_PID"

echo
echo "🎯 Next Steps:"
echo "--------------"
echo "1. Check logs: tail -f packages/*/logs/app.log"
echo "2. Test endpoints: curl http://localhost:$GITHUB_AI_PORT/health"
echo "3. Configure real GitHub tokens in .env files"
echo "4. Register GitHub Apps and configure webhooks"
echo "5. Set webhook URLs to your tunnel/domain endpoints"

echo
echo "🛑 To stop all services:"
echo "kill $AI_PID $SEMGREP_PID $STRUCTURE_PID"
