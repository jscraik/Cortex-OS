#!/bin/bash
# brAInwav Emergency VS Code Restart
# Co-authored-by: brAInwav Development Team <dev@brainwav.dev>

echo "[brAInwav] Emergency restart of VS Code..."

# Kill all VS Code processes
pkill -f "Visual Studio Code" || true
pkill -f "Code Helper" || true

# Wait for processes to terminate
sleep 3

# Clear additional runtime caches
rm -rf ~/Library/Saved\ Application\ State/com.microsoft.VSCode.savedState/ || true

echo "[brAInwav] Restarting VS Code in safe mode..."

# Restart VS Code with extensions disabled temporarily
open -a "Visual Studio Code" --args --disable-extensions

echo "[brAInwav] VS Code restarted in safe mode"
echo "[brAInwav] Re-enable extensions one by one to identify the culprit"
