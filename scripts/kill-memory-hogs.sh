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

# Kill any rogue Node.js test processes
pgrep -f "node.*test" | xargs kill -9 2>/dev/null && echo "✓ Killed Node test processes"

# Kill any Jest processes
pkill -f "jest" && echo "✓ Killed Jest processes"

# Kill any Playwright processes
pkill -f "playwright" && echo "✓ Killed Playwright processes"

# Force kill any remaining test-related processes
pkill -9 -f "vitest|semgrep|pytest|jest|playwright" 2>/dev/null

echo "Waiting 3 seconds for cleanup..."
sleep 3

# Show remaining process count
echo "Remaining Node processes: $(pgrep node | wc -l)"
echo "Remaining Python processes: $(pgrep python | wc -l)"
echo "Remaining semgrep processes: $(pgrep -f semgrep | wc -l)"

echo "Memory cleanup complete!"