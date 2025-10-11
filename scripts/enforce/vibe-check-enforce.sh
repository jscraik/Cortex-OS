#!/usr/bin/env bash
set -euo pipefail

# brAInwav Vibe Check enforcement — verifies oversight logs are present
# Usage: scripts/enforce/vibe-check-enforce.sh <logfile>

LOGFILE=${1:-}
if [[ -z "$LOGFILE" || ! -f "$LOGFILE" ]]; then
  echo "brAInwav: vibe-check enforce — missing or invalid log file" >&2
  echo "usage: $0 <logfile>" >&2
  exit 2
fi

if ! grep -q "brAInwav-vibe-check" "$LOGFILE"; then
  echo "brAInwav: vibe-check enforce — oversight evidence missing in $LOGFILE" >&2
  exit 1
fi

echo "brAInwav: vibe-check enforce — evidence found"
