#!/usr/bin/env bash
set -euo pipefail

# Simple security scorecard: counts findings from pnpm audit and pip-audit outputs
SCORE=100

if command -v pnpm >/dev/null 2>&1; then
  AUDIT_COUNT=$(pnpm audit --json 2>/dev/null | jq '.advisories | length' 2>/dev/null || echo 0)
  SCORE=$((SCORE - AUDIT_COUNT))
fi

if command -v pip-audit >/dev/null 2>&1; then
  PA_COUNT=$(pip-audit --format json 2>/dev/null | jq '. | length' 2>/dev/null || echo 0)
  SCORE=$((SCORE - PA_COUNT))
fi

echo "SECURITY_SCORE=$SCORE"

if [ "$SCORE" -lt 70 ]; then
  echo "Score below threshold"
  exit 1
fi
