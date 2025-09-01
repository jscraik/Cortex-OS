#!/bin/bash
# Git post-receive hook to auto-deploy cortex-ai-github

echo "🚀 Deploying cortex-ai-github app..."

# Navigate to the app directory
cd /Users/jamiecraik/.Cortex-OS/packages/cortex-ai-github

# Pull latest changes
git pull origin main

# Install dependencies if package.json changed
if git diff --name-only HEAD~1 HEAD | grep -q "package.json"; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Stop existing server
echo "🛑 Stopping existing server..."
pkill -f "tsx src/server/start.ts" || true

# Wait a moment for cleanup
sleep 2

# Start the server
echo "▶️ Starting cortex-ai-github server..."
nohup npx tsx src/server/start.ts > logs/app.log 2>&1 &

echo "✅ Deployment complete! Server is running on port 3001"

# Optional: Send notification
curl -X POST "https://cortex-github.brainwav.io/health" || echo "Health check failed"
