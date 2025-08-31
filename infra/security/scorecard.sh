#!/usr/bin/env bash
set -euo pipefail

# Simple security scorecard: counts findings from pnpm audit and pip-audit outputs
SCORE=100

if command -v pnpm >/dev/null 2>&1; then
  AUDIT_JSON=$(pnpm audit --json 2>/dev/null || echo '{}')
  AUDIT_COUNT=$(echo "$AUDIT_JSON" | jq '.advisories | length' 2>/dev/null || echo 0)
  if [[ "$AUDIT_COUNT" =~ ^[0-9]+$ ]]; then
    SCORE=$((SCORE - AUDIT_COUNT))
  else
    echo "pnpm audit produced non-numeric count" >&2
  fi
fi

if command -v pip-audit >/dev/null 2>&1; then
  PA_JSON=$(pip-audit --format json 2>/dev/null || echo '[]')
  PA_COUNT=$(echo "$PA_JSON" | jq 'length' 2>/dev/null || echo 0)
  if [[ "$PA_COUNT" =~ ^[0-9]+$ ]]; then
    SCORE=$((SCORE - PA_COUNT))
  else
    echo "pip-audit produced non-numeric count" >&2
  fi
fi

echo "SECURITY_SCORE=$SCORE"

if [ "$SCORE" -lt 70 ]; then
  echo "Score below threshold"
  exit 1
fi
