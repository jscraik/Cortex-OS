#!/bin/bash
# GitHub Apps Setup and Start Script

echo "🚀 Setting up GitHub Apps..."
echo "=============================="

# Function to check if a port is available
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        echo "❌ Port $port is already in use"
        return 1
    else
        echo "✅ Port $port is available"
        return 0
    fi
}

# Check all required ports
echo "📡 Checking ports..."
check_port 3001 || exit 1
check_port 3002 || exit 1  
check_port 3003 || exit 1

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
echo "Starting cortex-ai-github on port 3001..."
cd /Users/jamiecraik/.Cortex-OS/packages/cortex-ai-github
nohup pnpm dev > logs/app.log 2>&1 &
AI_PID=$!
echo "✅ cortex-ai-github started (PID: $AI_PID)"

# Wait a moment
sleep 2

# Start cortex-semgrep-github  
echo "Starting cortex-semgrep-github on port 3002..."
cd /Users/jamiecraik/.Cortex-OS/packages/cortex-semgrep-github
nohup pnpm dev > logs/app.log 2>&1 &
SEMGREP_PID=$!
echo "✅ cortex-semgrep-github started (PID: $SEMGREP_PID)"

# Wait a moment
sleep 2

# Start cortex-structure-github
echo "Starting cortex-structure-github on port 3003..."  
cd /Users/jamiecraik/.Cortex-OS/packages/cortex-structure-github
nohup pnpm dev > logs/app.log 2>&1 &
STRUCTURE_PID=$!
echo "✅ cortex-structure-github started (PID: $STRUCTURE_PID)"

# Wait for services to start
echo
echo "⏳ Waiting for services to initialize..."
sleep 5

# Check if services are responding
echo
echo "🔍 Checking service status..."
for port in 3001 3002 3003; do
    if lsof -i :$port > /dev/null 2>&1; then
        echo "✅ Port $port: Service running"
    else
        echo "❌ Port $port: Service failed to start"
    fi
done

echo
echo "📋 Process Summary:"
echo "-------------------"
echo "cortex-ai-github (3001): PID $AI_PID"
echo "cortex-semgrep-github (3002): PID $SEMGREP_PID" 
echo "cortex-structure-github (3003): PID $STRUCTURE_PID"

echo
echo "🎯 Next Steps:"
echo "--------------"
echo "1. Check logs: tail -f packages/*/logs/app.log"
echo "2. Test endpoints: curl http://localhost:3001/health"
echo "3. Configure real GitHub tokens in .env files"
echo "4. Register GitHub Apps and configure webhooks"
echo "5. Set webhook URLs to your tunnel/domain endpoints"

echo
echo "🛑 To stop all services:"
echo "kill $AI_PID $SEMGREP_PID $STRUCTURE_PID"
