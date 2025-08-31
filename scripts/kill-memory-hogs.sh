#!/bin/bash
# Comprehensive script to kill all memory-consuming processes

echo "Killing memory-hungry processes..."

# Kill all Vitest processes
pkill -f "vitest" && echo "✓ Killed Vitest processes"

# Kill all Python processes (except system ones)
pkill -f "python.*ml.*optimization" && echo "✓ Killed ML optimization Python processes"
pkill -f "faiss" && echo "✓ Killed FAISS processes"
pkill -f "python.*test" && echo "✓ Killed Python test processes"

# Kill semgrep processes (major memory hog)
pkill -f "semgrep-core" && echo "✓ Killed semgrep-core processes"
pkill -f "semgrep" && echo "✓ Killed semgrep processes"

# Kill TypeScript servers (major memory consumers)
pkill -f "tsserver.js" && echo "✓ Killed TypeScript servers"
pkill -f "typescript.*server" && echo "✓ Killed additional TypeScript processes"

# VS Code optimization DISABLED to prevent instability
echo "Skipping VS Code optimization to maintain editor stability"

# Kill any rogue Node.js test processes
pgrep -f "node.*test" | xargs kill -9 2>/dev/null && echo "✓ Killed Node test processes"

# Kill any Jest processes
pkill -f "jest" && echo "✓ Killed Jest processes"

# Kill any Playwright processes
pkill -f "playwright" && echo "✓ Killed Playwright processes"

# Kill excessive Node.js processes (keep essential ones)
node_count=$(pgrep node | wc -l)
if [ "$node_count" -gt 10 ]; then
    echo "Found $node_count Node processes, killing excess..."
    # Kill Node processes using high memory (over 200MB)
    for pid in $(ps aux | awk '$6 > 200000 && /node/ {print $2}'); do
        # Don't kill critical system processes
        if ! ps -p $pid -o command= | grep -q "WindowServer\|loginwindow\|Finder"; then
            kill -15 $pid 2>/dev/null && echo "✓ Killed high-memory Node process $pid"
        fi
    done
fi

# Force kill any remaining test-related processes
pkill -9 -f "vitest|semgrep|pytest|jest|playwright" 2>/dev/null

# Force memory cleanup
if command -v node >/dev/null 2>&1; then
    node -e "if (global.gc) global.gc();" 2>/dev/null || true
fi

echo "Waiting 5 seconds for cleanup..."
sleep 5

# Show remaining process count
echo "Remaining Node processes: $(pgrep node | wc -l)"
echo "Remaining Python processes: $(pgrep python | wc -l)"
echo "Remaining semgrep processes: $(pgrep -f semgrep | wc -l)"

# Show memory usage
echo "Current memory pressure:"
vm_stat | grep "Pages free\|Pages active\|Pages inactive\|Pages wired down"

echo "Memory cleanup complete!"