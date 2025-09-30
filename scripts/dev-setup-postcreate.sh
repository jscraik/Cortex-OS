#!/bin/bash
# dev-setup-postcreate.sh - Post-create setup for DevContainer

set -euo pipefail

echo "🔧 Running post-create setup..."

cd /opt/cortex-home

# Install additional tooling if needed
npm list -g @biomejs/biome || npm install -g @biomejs/biome

# Set up agent-toolkit tools symlink if it doesn't exist
if [ ! -L "/opt/cortex-home/tools/agent-toolkit" ]; then
    if [ -d "/opt/cortex-home/packages/agent-toolkit/tools" ]; then
        ln -sf /opt/cortex-home/packages/agent-toolkit/tools /opt/cortex-home/tools/agent-toolkit
    fi
fi

# Make scripts executable
chmod +x scripts/*.sh

echo "✅ Post-create setup complete!"