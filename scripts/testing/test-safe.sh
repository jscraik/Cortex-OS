#!/bin/bash
set -euo pipefail

# A safe Vitest runner that caps threads/forks and Node memory to prevent hogging.
# Usage:
#   scripts/test-safe.sh [--watch] [--coverage] [--monitored] [--config <file>] [-- ...extra vitest args]

WATCH_MODE=false
COVERAGE=false
MONITORED=false
CONFIG_FILE=""
SKIP_RUN="${CORTEX_TEST_SAFE_SKIP_RUN:-0}"
SKIP_RUN_LOWER="$(printf '%s' "$SKIP_RUN" | tr '[:upper:]' '[:lower:]')"
GUARD_SLEEP="${CORTEX_TEST_SAFE_GUARD_SLEEP:-1}"

GUARD_CMD=("node" "scripts/memory-guard.mjs" "--pattern" "vitest" "--max" "2048" "--interval" "1000")

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

start_guard() {
	if [[ "$MONITORED" == true ]]; then
		"${GUARD_CMD[@]}" &
		local pid=$!
		echo "[brAInwav] memory guard started (pid ${pid})" >&2
		echo "$pid"
	else
		echo ""
	fi
}

stop_guard() {
	local pid="$1"
	if [[ -n "$pid" ]]; then
		kill "$pid" 2>/dev/null || true
	fi
}

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

should_skip_run=false
case "$SKIP_RUN_LOWER" in
	"1"|"true") should_skip_run=true ;;
esac

if [[ "$should_skip_run" == true ]]; then
	GUARD_PID="$(start_guard)"
	sleep "$GUARD_SLEEP"
	stop_guard "$GUARD_PID"
	exit 0
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

GUARD_PID="$(start_guard)"

echo "Running: ${CMD[*]}"
"${CMD[@]}" "$@"
STATUS=$?

stop_guard "$GUARD_PID"

exit $STATUS
