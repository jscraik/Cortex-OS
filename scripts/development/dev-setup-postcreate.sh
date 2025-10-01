#!/bin/bash
# dev-setup-postcreate.sh - Post-create setup for DevContainer

set -euo pipefail

echo "[brAInwav] 🔧 Running post-create setup..."

cd /opt/cortex-home

# Optionally install tooling (opt-in)
if [ "${CORTEX_DEV_FULL:-0}" = "1" ]; then
    npm list -g @biomejs/biome || npm install -g @biomejs/biome || true
else
    echo "[brAInwav] Skipping global tooling installs (set CORTEX_DEV_FULL=1 to enable)"
fi

# Set up agent-toolkit tools symlink if it doesn't exist
if [ ! -L "/opt/cortex-home/tools/agent-toolkit" ]; then
    if [ -d "/opt/cortex-home/packages/agent-toolkit/tools" ]; then
        ln -sf /opt/cortex-home/packages/agent-toolkit/tools /opt/cortex-home/tools/agent-toolkit
    fi
fi

# Make scripts executable
chmod +x scripts/*.sh

echo "[brAInwav] ✅ Post-create setup complete!"