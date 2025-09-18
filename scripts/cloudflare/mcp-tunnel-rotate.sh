#!/usr/bin/env bash
# Zero-downtime Cloudflare Tunnel rotation for MCP (port 3024)
# Strategy: run new tunnel (green) in parallel, verify health via edge, cut over DNS/hostname if needed, then retire old (blue).

set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: mcp-tunnel-rotate.sh \
  --new-config packages/cortex-mcp/infrastructure/cloudflare/tunnel.rotate.config.yml \
  [--old-name cortex-mcp] \
  [--new-name cortex-mcp-green] \
  [--hostname cortex-mcp.brainwav.io] \
  [--health-path /health] \
  [--grace 15]

Assumptions:
  * Both tunnel configs map hostname -> http://127.0.0.1:3024
  * cloudflared is authenticated (token or cert)
  * New tunnel uses distinct name/UUID

Flow:
  1. Launch new tunnel in background
  2. Poll health through Cloudflare edge
  3. If healthy N times consecutively, retire old tunnel
  4. Optionally leave overlap (--grace) before kill

Environment Overrides:
  ROTATE_MIN_SUCCESSES (default 3)
  ROTATE_POLL_INTERVAL (default 3s)
  ROTATE_MAX_ATTEMPTS (default 20)

Exit codes:
  0 success, 1 usage, 2 health failed, 3 old tunnel stop failed
USAGE
}

NEW_CONFIG=""
OLD_NAME="cortex-mcp"
NEW_NAME="cortex-mcp-green"
HOSTNAME="cortex-mcp.brainwav.io"
HEALTH_PATH="/health"
GRACE=15

while [[ $# -gt 0 ]]; do
  case "$1" in
    --new-config) NEW_CONFIG="$2"; shift 2;;
    --old-name) OLD_NAME="$2"; shift 2;;
    --new-name) NEW_NAME="$2"; shift 2;;
    --hostname) HOSTNAME="$2"; shift 2;;
    --health-path) HEALTH_PATH="$2"; shift 2;;
    --grace) GRACE="$2"; shift 2;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1;;
  esac
done

[[ -n "$NEW_CONFIG" ]] || { echo "--new-config required" >&2; usage; exit 1; }
[[ -f "$NEW_CONFIG" ]] || { echo "Config not found: $NEW_CONFIG" >&2; exit 1; }

ROTATE_MIN_SUCCESSES="${ROTATE_MIN_SUCCESSES:-3}"
ROTATE_POLL_INTERVAL="${ROTATE_POLL_INTERVAL:-3}"
ROTATE_MAX_ATTEMPTS="${ROTATE_MAX_ATTEMPTS:-20}"

echo "[rotate] Launching new tunnel: $NEW_NAME using $NEW_CONFIG"
cloudflared tunnel --config "$NEW_CONFIG" run "$NEW_NAME" > "logs/tunnel-$NEW_NAME.log" 2>&1 &
NEW_PID=$!
echo "[rotate] New tunnel PID: $NEW_PID (logs/tunnel-$NEW_NAME.log)"

successes=0
attempt=0
while (( attempt < ROTATE_MAX_ATTEMPTS )); do
  attempt=$((attempt+1))
  if scripts/cloudflare/mcp-tunnel-health.sh "$HOSTNAME" "$HEALTH_PATH"; then
    successes=$((successes+1))
    echo "[rotate] Success $successes / $ROTATE_MIN_SUCCESSES"
    if (( successes >= ROTATE_MIN_SUCCESSES )); then
      echo "[rotate] New tunnel deemed healthy."; break
    fi
  else
    successes=0
    echo "[rotate] Health reset (attempt $attempt)"
  fi
  sleep "$ROTATE_POLL_INTERVAL"
done

if (( successes < ROTATE_MIN_SUCCESSES )); then
  echo "[rotate] ERROR: New tunnel failed health criteria." >&2
  kill "$NEW_PID" 2>/dev/null || true
  exit 2
fi

echo "[rotate] Grace overlap: ${GRACE}s before retiring old tunnel ($OLD_NAME)"
sleep "$GRACE"

echo "[rotate] Attempting to stop old tunnel: $OLD_NAME"
if pkill -f "cloudflared.*run $OLD_NAME"; then
  echo "[rotate] Old tunnel stopped."
else
  echo "[rotate] WARNING: Could not find old tunnel process; continuing." >&2
fi

echo "[rotate] Rotation complete. Monitor: tail -f logs/tunnel-$NEW_NAME.log"
exit 0
