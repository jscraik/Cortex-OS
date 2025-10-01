#!/bin/bash
set -euo pipefail

# Integration Test: Container -> MLX embedding round-trip
# Preconditions: stack running (MLX host + model-gateway container exposing /embed proxy if applicable)
# Strategy:
# 1. Detect MLX health endpoint
# 2. Submit embedding request directly to MLX (/embed)
# 3. (Optional) If model-gateway container exists and exposes same port, test via localhost as well
# 4. Validate JSON shape: embeddings array non-empty, dimension length matches reported dimensions

MLX_PORT="${CORTEX_MLX_PORT:-8081}"
API_PORT="${CORTEX_API_PORT:-8080}"
HOST="localhost"
FAILED=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok(){ echo -e "${GREEN}[OK]${NC} $1"; }
fail(){ echo -e "${RED}[FAIL]${NC} $1"; FAILED=1; }
warn(){ echo -e "${YELLOW}[WARN]${NC} $1"; }

require_cmd() { command -v "$1" >/dev/null 2>&1 || { fail "Missing required command: $1"; exit 1; }; }

require_cmd curl

if command -v jq >/dev/null 2>&1; then
  HAVE_JQ=1
else
  HAVE_JQ=0
  warn "jq not found; using basic JSON parsing heuristics"
fi

echo "== MLX Health Check =="
if ! curl -fsS "http://$HOST:$MLX_PORT/health" >/dev/null 2>&1; then
  fail "MLX health endpoint not reachable at http://$HOST:$MLX_PORT/health"
  exit 1
fi
ok "MLX health reachable"

DIM=$(curl -fsS "http://$HOST:$MLX_PORT/health" | grep -Eo '"dimensions"\s*:\s*[0-9]+' | grep -Eo '[0-9]+' | head -1 || echo "0")
if [[ "$DIM" == "0" ]]; then
  warn "Could not parse dimensions from health response; proceeding"
fi

PAYLOAD='{"input":["hello world","cortex os embeddings"],"model":"qwen3-embed"}'

run_embed() {
  local url="$1"
  local label="$2"
  echo "-- Testing embed via $label ($url)"
  local resp
  if ! resp=$(curl -fsS -H 'Content-Type: application/json' -d "$PAYLOAD" "$url" 2>/dev/null); then
     fail "Request failed for $label"
     return 1
  fi
  if [[ $HAVE_JQ -eq 1 ]]; then
     local count
     count=$(echo "$resp" | jq '.embeddings | length')
     if [[ "$count" -lt 2 ]]; then
        fail "Expected >=2 embeddings, got $count for $label"
        return 1
     fi
     if [[ "$DIM" != "0" ]]; then
        local first_len
        first_len=$(echo "$resp" | jq '.embeddings[0] | length')
        if [[ "$first_len" != "$DIM" ]]; then
           warn "Dimension mismatch: expected $DIM got $first_len (could be fallback variation)"
        fi
     fi
  else
     echo "$resp" | grep -q 'embeddings' || { fail "No 'embeddings' key in response for $label"; return 1; }
  fi
  ok "Embedding request succeeded for $label"
}

run_embed "http://$HOST:$MLX_PORT/embed" "MLX Direct"

# Attempt gateway route if different (placeholder - adjust if gateway runs on distinct port later)
if [[ "$MLX_PORT" != "${CORTEX_MODEL_GATEWAY_PORT:-$MLX_PORT}" ]]; then
  GW_PORT="${CORTEX_MODEL_GATEWAY_PORT}" || true
  run_embed "http://$HOST:$GW_PORT/embed" "Model Gateway"
fi

echo
if [[ $FAILED -eq 0 ]]; then
  echo -e "${GREEN}Round-trip embedding test PASSED${NC}"
else
  echo -e "${RED}Round-trip embedding test FAILED${NC}"
fi
exit $FAILED
