#!/bin/bash

echo "🚨 Emergency Memory Cleanup for Cortex-OS"

# Check if we should preserve VS Code processes
PRESERVE_VSCODE="${PRESERVE_VSCODE:-true}"

# Stop development processes (but preserve VS Code unless forced)
echo "Stopping development processes..."
if [[ "$PRESERVE_VSCODE" == "false" ]]; then
    echo "⚠️  Killing TypeScript servers (may disrupt VS Code)"
    pkill -f "tsserver" 2>/dev/null
else
    echo "🛡️  Preserving TypeScript servers for VS Code"
fi

pkill -f "nx.js" 2>/dev/null
# Only kill vitest processes, not those started by VS Code
pgrep -f "vitest.*run" | while read pid; do
    if ! ps -o command= -p "$pid" | grep -q "Code Helper"; then
        kill "$pid" 2>/dev/null
    fi
done

# Stop PM2 processes
if command -v pm2 &> /dev/null; then
    echo "Stopping PM2 processes..."
    pm2 stop all 2>/dev/null
fi

# Clean caches
echo "Cleaning caches..."
pnpm store prune 2>/dev/null || npm cache clean --force 2>/dev/null
rm -rf .nx/cache 2>/dev/null
rm -rf node_modules/.cache 2>/dev/null
rm -rf logs/* 2>/dev/null
rm -rf tmp/* 2>/dev/null
rm -rf coverage/* 2>/dev/null

# Clean TypeScript cache
echo "Cleaning TypeScript cache..."
rm -rf node_modules/.cache/tsbuildinfo 2>/dev/null
rm -rf tsconfig.tsbuildinfo 2>/dev/null

# Restart essential services only
if command -v pm2 &> /dev/null && [ -f ecosystem.config.js ]; then
    echo "Restarting essential services..."
    pm2 start ecosystem.config.js --only cortex-orchestrator 2>/dev/null
fi

# Show memory status
echo ""
echo "📊 Current Memory Usage:"
if command -v free &> /dev/null; then
    free -h
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS memory info
    vm_stat | head -5
    echo ""
    echo "Top memory consumers:"
    ps aux | sort -k6 -nr | head -5 | awk '{printf "%-8s %-20s %s\n", $6/1024"MB", $11, $12}'
fi

echo ""
echo "✅ Emergency memory cleanup complete"
echo "💡 Consider using 'cp .vscode/settings.memory-optimized.json .vscode/settings.json' for reduced memory usage"
