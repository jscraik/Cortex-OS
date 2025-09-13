#!/usr/bin/env bash
# scripts/check-memory-budget.sh
# Enforce a soft memory budget using sampler JSONL outputs.
# Usage: MEMORY_BUDGET_MB=1500 scripts/check-memory-budget.sh .memory/install-*.jsonl
set -euo pipefail
if [ "$#" -lt 1 ]; then
  echo "Usage: MEMORY_BUDGET_MB=<mb> $0 <jsonl-files>" >&2; exit 1; fi
BUDGET=${MEMORY_BUDGET_MB:-0}
if [ "$BUDGET" -le 0 ]; then echo "Set MEMORY_BUDGET_MB env" >&2; exit 1; fi
TMP=$(mktemp)
node scripts/aggregate-memory-peaks.mjs "$@" > "$TMP"
CAT_TOTAL=$(grep TOTAL_MAX_RSS_MB "$TMP" | cut -d= -f2 | tr -d '\r')
PEAK=$(printf '%.0f' "$CAT_TOTAL")
if [ "$PEAK" -gt "$BUDGET" ]; then
  echo "FAIL: Peak RSS ${PEAK}MB > budget ${BUDGET}MB" >&2
  cat "$TMP"
  exit 2
else
  echo "OK: Peak RSS ${PEAK}MB <= budget ${BUDGET}MB" >&2
fi
cat "$TMP"
