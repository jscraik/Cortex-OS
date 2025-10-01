#!/bin/bash
set -euo pipefail

# A safe Vitest runner that caps threads/forks and Node memory to prevent hogging.
# Usage:
#   scripts/test-safe.sh [--watch] [--coverage] [--monitored] [--config <file>] [-- ...extra vitest args]

WATCH_MODE=false
COVERAGE=false
MONITORED=false
CONFIG_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --watch)
      WATCH_MODE=true
      shift
      ;;
    --coverage)
      COVERAGE=true
      shift
      ;;
    --monitored)
      MONITORED=true
      shift
      ;;
    --config|-c)
      CONFIG_FILE="$2"
      shift 2
      ;;
    --)
      shift
      break
      ;;
    *)
      break
      ;;
  esac
done

# Hard caps, can be overridden by env if really needed.
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=2048 --expose-gc"
export VITEST_MAX_THREADS=${VITEST_MAX_THREADS:-1}
export VITEST_MIN_THREADS=${VITEST_MIN_THREADS:-1}
export VITEST_MAX_FORKS=${VITEST_MAX_FORKS:-1}
export VITEST_MIN_FORKS=${VITEST_MIN_FORKS:-1}

# Prefer the minimal config unless explicitly overridden
if [[ -z "$CONFIG_FILE" ]]; then
  CONFIG_FILE="vitest.basic.config.ts"
fi

CMD=("vitest")
if [[ "$WATCH_MODE" == true ]]; then
  CMD+=("watch")
else
  CMD+=("run")
fi

CMD+=("-c" "$CONFIG_FILE")

if [[ "$COVERAGE" == true ]]; then
  CMD+=("--coverage" "--coverage.reporter=text-summary" "--coverage.reporter=json-summary")
fi

if [[ "$MONITORED" == true ]]; then
  # Start unified memory guard targeting vitest processes
  node scripts/memory-guard.mjs --pattern vitest --max 2048 --interval 1000 &
  GUARD_PID=$!
fi

echo "Running: ${CMD[*]}"
"${CMD[@]}" "$@"
STATUS=$?

if [[ "$MONITORED" == true ]]; then
  kill $GUARD_PID 2>/dev/null || true
fi

exit $STATUS
