#!/usr/bin/env bash
set -euo pipefail

MODE="diff" # diff | full
if [[ "${1:-}" == "--full" ]]; then
  MODE="full"
fi

echo "[secret-scan] mode=$MODE"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "[secret-scan] gitleaks not installed (try: go install github.com/gitleaks/gitleaks/v8@latest)" >&2
fi

# Pattern guard staged scan (fast)
if [[ -f scripts/quality/pattern-guard.sh ]]; then
  echo "[secret-scan] Running pattern guard (staged)"
  bash scripts/quality/pattern-guard.sh --staged || true
fi

TMP_DIR=$(mktemp -d)
REPORT_JSON="$TMP_DIR/gitleaks.json"
REPORT_SARIF="$TMP_DIR/gitleaks.sarif"

if command -v gitleaks >/dev/null 2>&1; then
  if [[ "$MODE" == "diff" ]]; then
    echo "[secret-scan] gitleaks detect (diff)"
    gitleaks detect --redact --report-format json --report-path "$REPORT_JSON" || true
  else
    echo "[secret-scan] gitleaks detect (full)"
    gitleaks detect --redact --no-git --report-format json --report-path "$REPORT_JSON" || true
  fi
fi

if [[ -s "$REPORT_JSON" ]]; then
  count=$(jq '.findings | length' "$REPORT_JSON" 2>/dev/null || echo 0)
  echo "[secret-scan] Findings: $count"
  if [[ $count -gt 0 ]]; then
    jq '.findings[] | {rule:.rule, file:.file, line:.startLine}' "$REPORT_JSON" | head -50
    echo "[secret-scan] WARNING: secrets detected (review above)."
  fi
else
  echo "[secret-scan] No report produced or empty file."
fi

# Optionally produce SARIF if jq + minimal transform desired later
# Placeholder for future expansion

rm -rf "$TMP_DIR"
