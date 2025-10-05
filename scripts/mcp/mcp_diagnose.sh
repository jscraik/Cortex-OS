#!/usr/bin/env bash
set -euo pipefail

PORT=3024
JSON_OUTPUT=1
FORCE_GUARD=0
TUNNEL=1
HEALTH=1
GUARD=1

usage(){ cat <<EOF
mcp_diagnose.sh [options]
  --no-guard       Skip freeing port 3024
  --no-health      Skip health probe
  --no-tunnel      Skip tunnel validation
  --force-guard    Escalate guard to --force
  --human          Human-readable output instead of JSON summary
  --help           This help
EOF
}

for arg in "$@"; do
  case "$arg" in
    --no-guard) GUARD=0 ;;
    --no-health) HEALTH=0 ;;
    --no-tunnel) TUNNEL=0 ;;
    --force-guard) FORCE_GUARD=1 ;;
    --human) JSON_OUTPUT=0 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage; exit 1 ;;
  esac
done

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_root"

results_guard="skipped"
results_health="skipped"
results_tunnel="skipped"
code_guard=0
code_health=0
code_tunnel=0

if [[ $GUARD -eq 1 ]]; then
  if [[ $JSON_OUTPUT -eq 0 ]]; then echo "[diagnose] Running port guard"; fi
  guard_cmd=("./scripts/mcp/guard_port_3024.sh")
  [[ $FORCE_GUARD -eq 1 ]] && guard_cmd+=(--force)
  if output_guard=$(${guard_cmd[@]} 2>&1); then
    results_guard="ok"
  else
    code_guard=$?
    results_guard="fail"
  fi
fi

if [[ $HEALTH -eq 1 ]]; then
  if [[ $JSON_OUTPUT -eq 0 ]]; then echo "[diagnose] Running health probe"; fi
  if health_json=$(./scripts/mcp/health_probe.sh --json 2>/dev/null); then
    results_health="ok"
  else
    code_health=$?
    results_health="fail"
  fi
fi

if [[ $TUNNEL -eq 1 ]]; then
  if [[ $JSON_OUTPUT -eq 0 ]]; then echo "[diagnose] Validating tunnel"; fi
  if output_tunnel=$(./scripts/mcp/validate_cloudflare_tunnel.sh --json 2>&1); then
    if [[ $output_tunnel == *'"status":"skipped"'* ]]; then
      results_tunnel="skipped"
    else
      results_tunnel="ok"
    fi
  else
    code_tunnel=$?
    results_tunnel="fail"
  fi
fi

overall=0
[[ $code_guard -ne 0 ]] && overall=1
[[ $code_health -ne 0 ]] && overall=1
[[ $code_tunnel -ne 0 ]] && overall=1

if [[ $JSON_OUTPUT -eq 1 ]]; then
  # Compose JSON. Escape health_json quotes.
  health_payload=${health_json:-""}
  tunnel_payload="null"
  if [[ -n ${output_tunnel:-} ]]; then
    tunnel_payload="$output_tunnel"
  fi
  printf '{"guard":{"status":"%s","exitCode":%d},"health":{"status":"%s","exitCode":%d,"payload":%s},"tunnel":{"status":"%s","exitCode":%d,"payload":%s},"overallExitCode":%d}\n' \
    "$results_guard" "$code_guard" "$results_health" "$code_health" "${health_payload:-null}" "$results_tunnel" "$code_tunnel" "$tunnel_payload" "$overall"
else
  echo "Guard:   $results_guard (code=$code_guard)"
  echo "Health:  $results_health (code=$code_health)"
  echo "Tunnel:  $results_tunnel (code=$code_tunnel)"
  if [[ -n ${output_tunnel:-} ]]; then
    echo "Tunnel JSON: $output_tunnel"
  fi
  echo "Overall exit code: $overall"
  [[ -n ${health_json:-} ]] && echo "Health JSON: $health_json"
fi

exit $overall
