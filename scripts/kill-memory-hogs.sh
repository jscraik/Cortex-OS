#!/bin/bash
# Comprehensive script to kill all memory-consuming processes
# Usage: ./kill-memory-hogs.sh [--gentle]

GENTLE_MODE=false
if [ "$1" = "--gentle" ]; then
    GENTLE_MODE=true
    echo "Running in GENTLE mode - preserving VS Code and essential development processes"
else
    echo "Killing memory-hungry processes..."
fi

# Kill all Vitest processes
pkill -f "vitest" && echo "✓ Killed Vitest processes"

# Kill all Python processes (except system ones)
pkill -f "python.*ml.*optimization" && echo "✓ Killed ML optimization Python processes"
pkill -f "faiss" && echo "✓ Killed FAISS processes"
pkill -f "python.*test" && echo "✓ Killed Python test processes"

# Kill semgrep processes (major memory hog)
pkill -f "semgrep-core" && echo "✓ Killed semgrep-core processes"
pkill -f "semgrep" && echo "✓ Killed semgrep processes"

# Kill TypeScript servers (major memory consumers) - SKIP in gentle mode
if [ "$GENTLE_MODE" = "false" ]; then
    pkill -f "tsserver.js" && echo "✓ Killed TypeScript servers"
    pkill -f "typescript.*server" && echo "✓ Killed additional TypeScript processes"
else
    echo "Skipping TypeScript servers to preserve VS Code functionality"
fi

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
    # In gentle mode, be more selective about which Node processes to kill
    if [ "$GENTLE_MODE" = "true" ]; then
        # Only kill test and build-related Node processes, preserve VS Code helpers
        for pid in $(ps aux | awk '$6 > 300000 && /node/ && !/Code Helper/ && !/Visual Studio Code/ {print $2}'); do
            if ps -p $pid -o command= | grep -q -E "(test|vitest|jest|webpack|build)" && ! ps -p $pid -o command= | grep -q -E "(dev|server|watch)"; then
                kill -15 $pid 2>/dev/null && echo "✓ Killed high-memory Node test process $pid"
            fi
        done
    else
        # Original aggressive approach
        for pid in $(ps aux | awk '$6 > 200000 && /node/ {print $2}'); do
            # Don't kill critical system processes
            if ! ps -p $pid -o command= | grep -q "WindowServer\|loginwindow\|Finder"; then
                kill -15 $pid 2>/dev/null && echo "✓ Killed high-memory Node process $pid"
            fi
        done
    fi
fi

# Force kill any remaining test-related processes - be more selective in gentle mode
if [ "$GENTLE_MODE" = "true" ]; then
    # Only kill test processes, not all instances
    pkill -9 -f "vitest.*run|semgrep-core|pytest.*test|jest.*test" 2>/dev/null
else
    pkill -9 -f "vitest|semgrep|pytest|jest|playwright" 2>/dev/null
fi

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
