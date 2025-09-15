#!/usr/bin/env bash
set -euo pipefail

TUNNEL_CONFIG="config/cloudflared/mcp-tunnel.yml"
EXPECTED_SERVICE="http://localhost:3024"
LABEL="cloudflared-mcp"

log(){ echo "[tunnel-validate] $*"; }
err(){ echo "[tunnel-validate] ERROR: $*" >&2; }

if [[ ! -f "$TUNNEL_CONFIG" ]]; then
  err "Tunnel config not found: $TUNNEL_CONFIG"; exit 2
fi

if ! grep -q "${EXPECTED_SERVICE}" "$TUNNEL_CONFIG"; then
  err "Expected service mapping to ${EXPECTED_SERVICE} not found in ${TUNNEL_CONFIG}"; exit 3
fi
log "Config service mapping OK -> ${EXPECTED_SERVICE}"

# Check cloudflared process
if pgrep -f "cloudflared.*${TUNNEL_CONFIG}" >/dev/null 2>&1; then
  log "cloudflared process detected"
else
  err "No running cloudflared process referencing ${TUNNEL_CONFIG}"; exit 4
fi

# Optional: query tunnel metrics (if metrics server enabled)
METRICS_URL="http://127.0.0.1:46889/metrics"
if curl -fsS --max-time 2 "$METRICS_URL" >/dev/null 2>&1; then
  active=$(curl -fsS "$METRICS_URL" | grep -E 'cloudflared_tunnel_connections_active' | awk '{print $2}' | head -n1 || echo "?")
  log "Active tunnel connections: $active"
else
  log "Metrics endpoint not reachable (skip)"
fi

# Validate origin health
if curl -fsS --max-time 4 http://127.0.0.1:3024/mcp >/dev/null 2>&1; then
  log "Origin MCP endpoint reachable"
else
  err "Origin MCP endpoint not reachable on 3024"
  exit 5
fi

log "Tunnel validation passed"
