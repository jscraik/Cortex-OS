#!/usr/bin/env bash
# scripts/kill-orphan-pnpm.sh
# Kills pnpm / node worker processes when no controlling parent shell or known task runner is present.
# Dry run by default; use --force to actually kill.
set -euo pipefail
FORCE=false
if [ "${1:-}" = "--force" ]; then FORCE=true; fi

# List candidate pnpm processes
mapfile -t LINES < <(ps -Ao pid,ppid,command | grep -E 'pnpm|node' | grep -v grep)

KILL_LIST=()
for line in "${LINES[@]}"; do
  pid=$(awk '{print $1}' <<<"$line")
  ppid=$(awk '{print $2}' <<<"$line")
  cmd=$(cut -d' ' -f3- <<<"$line")
  # Heuristic: parent PID 1 (launchd) or command contains 'pnpm run' residue without active tty
  if [ "$ppid" -eq 1 ]; then
    KILL_LIST+=("$pid:$cmd")
  fi
  # Add additional heuristics if needed
done

if [ ${#KILL_LIST[@]} -eq 0 ]; then
  echo "No orphan pnpm/node processes matched."; exit 0; fi

echo "Orphan candidates:" >&2
printf '%s\n' "${KILL_LIST[@]}" >&2

if $FORCE; then
  for entry in "${KILL_LIST[@]}"; do
    pid=${entry%%:*}
    echo "Killing $pid" >&2
    kill -9 "$pid" 2>/dev/null || true
  done
  echo "Completed forced termination." >&2
else
  echo "Dry run (no processes killed). Re-run with --force to terminate." >&2
fi
