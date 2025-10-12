#!/bin/bash
# filename: scripts/agents/ack.sh
# AGENTS.md acknowledgment script

set -euo pipefail

echo "🤖 brAInwav Agent Acknowledgment Script"
echo "======================================"

# Find nearest AGENTS.md file
AGENTS_FILE=""
CURRENT_DIR=$(pwd)

while [ "$CURRENT_DIR" != "/" ]; do
    if [ -f "$CURRENT_DIR/AGENTS.md" ]; then
        AGENTS_FILE="$CURRENT_DIR/AGENTS.md"
        break
    fi
    CURRENT_DIR=$(dirname "$CURRENT_DIR")
done

if [ -z "$AGENTS_FILE" ]; then
    echo "❌ No AGENTS.md file found in current directory or parents"
    exit 1
fi

echo "📋 Found AGENTS.md: $AGENTS_FILE"

# Compute SHA of the AGENTS.md file
if command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
    # In git repo - use git hash
    GIT_ROOT=$(git rev-parse --show-toplevel)
    if [[ "$AGENTS_FILE" == "$GIT_ROOT"* ]]; then
        REL_PATH="${AGENTS_FILE#$GIT_ROOT/}"
        AGENTS_SHA=$(git rev-parse "HEAD:$REL_PATH" 2>/dev/null || git hash-object "$AGENTS_FILE")
    else
        AGENTS_SHA=$(git hash-object "$AGENTS_FILE")
    fi
else
    # Not in git repo - use file hash
    AGENTS_SHA=$(shasum -a 256 "$AGENTS_FILE" | cut -d' ' -f1)
fi

echo "🔑 AGENTS.md SHA: $AGENTS_SHA"

# Create or update .cortex/run.yaml
mkdir -p .cortex
RUN_FILE=".cortex/run.yaml"

if [ -f "$RUN_FILE" ]; then
    # Update existing file
    if grep -q "^agents_sha:" "$RUN_FILE"; then
        sed -i.bak "s/^agents_sha:.*/agents_sha: $AGENTS_SHA/" "$RUN_FILE" && rm "$RUN_FILE.bak"
    else
        echo "agents_sha: $AGENTS_SHA" >> "$RUN_FILE"
    fi
else
    # Create new file
    cat > "$RUN_FILE" << EOF
phase: R
task_id: task-$(date +%s)
run_id: run-$(date +%s)
started_at: $(date -Iseconds)
agents_sha: $AGENTS_SHA
agents_file: $AGENTS_FILE
EOF
fi

echo "📁 Updated $RUN_FILE with AGENTS.md acknowledgment"

# Emit evidence token
echo "AGENTS_MD_SHA:$AGENTS_SHA file=$AGENTS_FILE timestamp=$(date -Iseconds)" | tee -a .cortex/agents.log

echo "✅ brAInwav Agent acknowledgment complete!"
echo ""
echo "Next steps:"
echo "1. Call vibe_check before file writes/network calls"
echo "2. Follow R→G→F→REVIEW phase progression"
echo "3. Ensure all evidence tokens are emitted"