#!/bin/bash
# scripts/emergency-pnpm-kill.sh
# Nuclear option: kill ALL pnpm/node processes except essential VS Code ones
# Use only when system is unresponsive due to runaway pnpm processes

set -euo pipefail

echo "🚨 EMERGENCY: Killing all pnpm/node processes (except VS Code core)"
echo "WARNING: This will terminate all Node.js development processes!"
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# Save essential VS Code processes (main UI, not extensions)
VSCODE_MAIN_PIDS=$(ps aux | grep -E "Visual Studio Code.*\.app/Contents/MacOS/Code" | grep -v "Helper" | awk '{print $2}' | head -5)

echo "Preserving VS Code main processes: $VSCODE_MAIN_PIDS"

# Kill all pnpm processes
echo "Killing pnpm processes..."
pkill -f "pnpm" 2>/dev/null || echo "No pnpm processes found"

# Kill node processes, excluding VS Code main and our current shell
echo "Killing node processes (excluding VS Code main)..."
for pid in $(ps aux | grep -E "node" | grep -v grep | awk '{print $2}'); do
    # Skip if it's VS Code main process
    if echo "$VSCODE_MAIN_PIDS" | grep -q "$pid"; then
        echo "Preserving VS Code main PID: $pid"
        continue
    fi
    
    # Skip if it's our current shell or parent
    if [[ $pid == $$ ]] || [[ $pid == $PPID ]]; then
        continue
    fi
    
    echo "Killing PID: $pid"
    kill -TERM "$pid" 2>/dev/null || true
done

echo "Waiting 3 seconds for graceful termination..."
sleep 3

# Force kill any remaining stubborn processes
echo "Force killing any remaining processes..."
pkill -9 -f "pnpm" 2>/dev/null || true
pkill -9 -f "nx.*build" 2>/dev/null || true

REMAINING=$(ps aux | grep -E "(pnpm|node.*build)" | grep -v grep | wc -l)
echo "✅ Emergency cleanup complete. Remaining processes: $REMAINING"

if [[ $REMAINING -gt 10 ]]; then
    echo "⚠️  Still high process count. Check manually:"
    ps aux | grep -E "(pnpm|node)" | grep -v grep | head -10
fi
