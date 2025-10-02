#!/bin/bash
# dev-setup-postcreate.sh - Post-create setup for DevContainer

set -euo pipefail

echo "[brAInwav] 🔧 Running post-create setup..."

cd /opt/cortex-home

LOCAL_MEMORY_CLI_VERSION="${LOCAL_MEMORY_CLI_VERSION:-latest}"
LOCAL_MEMORY_BIN="${LOCAL_MEMORY_BIN:-$(command -v local-memory || true)}"
LOCAL_MEMORY_SECRETS_DIR="/opt/brAInwav-secrets/local-memory"

sync_local_memory_secrets() {
    if [ ! -d "$LOCAL_MEMORY_SECRETS_DIR" ]; then
        return
    fi

    mkdir -p "$HOME/.local-memory"
    shopt -s nullglob dotglob
    local copied=0
    for item in "$LOCAL_MEMORY_SECRETS_DIR"/*; do
        base_name="$(basename "$item")"
        cp -R "$item" "$HOME/.local-memory/$base_name"
        copied=1
    done
    shopt -u nullglob dotglob

    if compgen -G "$HOME/.local-memory"/*.json > /dev/null; then
        chmod 600 "$HOME/.local-memory"/*.json || true
    fi

    if [ "$copied" -eq 1 ]; then
        echo "[brAInwav] ✅ Synchronized Local Memory secrets"
    else
        echo "[brAInwav] ℹ️ No Local Memory secrets found to sync"
    fi
}

# Optionally install tooling (opt-in)
if [ "${CORTEX_DEV_FULL:-0}" = "1" ]; then
    npm list -g @biomejs/biome || npm install -g @biomejs/biome || true
else
    echo "[brAInwav] Skipping global tooling installs (set CORTEX_DEV_FULL=1 to enable)"
fi

if ! command -v local-memory >/dev/null 2>&1; then
    echo "[brAInwav] Installing Local Memory CLI (${LOCAL_MEMORY_CLI_VERSION})..."
    if ! sudo npm install -g "local-memory-mcp@${LOCAL_MEMORY_CLI_VERSION}"; then
        echo "[brAInwav] ⚠️ Failed to install Local Memory CLI"
    else
        LOCAL_MEMORY_BIN="$(command -v local-memory || true)"
        echo "[brAInwav] ✅ Local Memory CLI installed at ${LOCAL_MEMORY_BIN}"
    fi
else
    echo "[brAInwav] ✅ Local Memory CLI already installed"
fi

# Set up agent-toolkit tools symlink if it doesn't exist
if [ ! -L "/opt/cortex-home/tools/agent-toolkit" ]; then
    if [ -d "/opt/cortex-home/packages/agent-toolkit/tools" ]; then
        ln -sf /opt/cortex-home/packages/agent-toolkit/tools /opt/cortex-home/tools/agent-toolkit
    fi
fi

# Make scripts executable
chmod +x scripts/*.sh

sync_local_memory_secrets

echo "[brAInwav] ✅ Post-create setup complete!"
