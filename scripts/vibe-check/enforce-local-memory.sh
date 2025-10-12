#!/usr/bin/env bash
# brAInwav Local Memory enforcement script
# Ensures every AGENTS.md contains the mandated Local Memory section
# and records compliance with the vibe_check MCP oversight gate.

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

VIBE_URL="${VIBE_CHECK_HTTP_URL:-http://127.0.0.1:2091}"
VIBE_BASE="${VIBE_URL%/}"
SESSION_ID="${VIBE_CHECK_SESSION_ID:-codex-local-memory}" # allows override per session
GOAL="Ensure Local Memory section is standardized across AGENTS.md"
PLAN="1. Discover AGENTS.md files lacking the Local Memory section. 2. Insert or replace the standardized text. 3. Verify that all files match the canonical block."
MODE="${ENFORCE_AGENTS_LOCAL_MEMORY_MODE:-fix}" # fix|check

build_payload() {
  python3 - <<'PY'
import json, os
print(json.dumps({
    "jsonrpc": "2.0",
    "id": "local-memory-enforcement",
    "method": "tools/call",
    "params": {
        "name": "vibe_check",
        "arguments": {
            "goal": os.environ["GOAL"],
            "plan": os.environ["PLAN"],
            "sessionId": os.environ["SESSION_ID"],
        },
    },
}))
PY
}

call_vibe_check() {
  local payload
  payload="$(build_payload)"
  echo "brAInwav-vibe-check: invoking oversight gate at $VIBE_BASE" >&2
  curl -sS \
    -X POST "$VIBE_BASE/mcp" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    -d "$payload"
}

ensure_vibe_check() {
  if ! curl -sS "$VIBE_BASE/healthz" >/dev/null 2>&1; then
    echo "brAInwav-vibe-check: attempting to start vibe-check server" >&2
    local port="${VIBE_BASE##*:}"
    if command -v vibe-check-mcp >/dev/null 2>&1; then
      vibe-check-mcp start --http --port "$port" >/tmp/vibe-check-start.log 2>&1 &
    else
      npx @pv-bhat/vibe-check-mcp start --http --port "$port" >/tmp/vibe-check-start.log 2>&1 &
    fi
    sleep 5
    if ! curl -sS "$VIBE_BASE/healthz" >/dev/null 2>&1; then
      echo "brAInwav-vibe-check: failed to reach vibe-check server" >&2
      cat /tmp/vibe-check-start.log >&2 || true
      exit 1
    fi
  fi

  if ! call_vibe_check | tee /tmp/vibe-check-response.log; then
    echo "brAInwav-vibe-check: oversight request failed" >&2
    exit 1
  fi
}

canonical_block() {
  cat <<'BLOCK'

## Local Memory

Proactively use local-memory MCP to store, retrieve, update, and analyze memories to maintain context and build expertise over time. Store key insights including lessons learned, architectural decisions, development strategies, and project outcomes. Use semantic search and relationship mapping to find relevant memories across all projects and sessions.
This prompts your AI agents to automatically use Local Memory for persistent context across conversations.
BLOCK
}

rewrite_files() {
  local block
  block="$(canonical_block)"
  python3 - "$block" <<'PY'
import sys
from pathlib import Path
import re

block = sys.argv[1]
root = Path('.')
pattern = re.compile(r"\n## Local Memory\n\n.*?(?=\n## |\Z)", re.DOTALL)

for path in root.rglob('AGENTS.md'):
    text = path.read_text()
    if '## Local Memory' in text:
        new_text, count = pattern.subn(block + '\n', text)
        if count:
            path.write_text(new_text)
    else:
        path.write_text(text.rstrip('\n') + block + '\n')
PY
}

verify() {
  local missing=0
  while IFS= read -r file; do
    if ! grep -q '## Local Memory' "$file"; then
      echo "Missing Local Memory section: $file" >&2
      missing=1
    elif ! grep -q 'This prompts your AI agents to automatically use Local Memory for persistent context across conversations.' "$file"; then
      echo "Mismatched Local Memory text: $file" >&2
      missing=1
    fi
  done < <(rg --files -g 'AGENTS.md')
  return $missing
}

declare -x GOAL PLAN SESSION_ID
GOAL="$GOAL" PLAN="$PLAN" SESSION_ID="$SESSION_ID"

if [[ "$MODE" != "check" ]]; then
  ensure_vibe_check
  rewrite_files
else
  echo "brAInwav-local-memory: running in check mode (no rewrites)" >&2
fi

if ! verify; then
  echo "brAInwav-local-memory: Local Memory section enforcement failed" >&2
  if [[ "$MODE" == "check" ]]; then
    echo "Run 'pnpm enforce:agents:local-memory' locally to apply fixes." >&2
  fi
  exit 1
fi

if [[ "$MODE" == "check" ]]; then
  echo "brAInwav-local-memory: check complete (no changes required)"
else
  echo "brAInwav-local-memory: enforcement complete"
fi
