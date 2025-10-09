#!/usr/bin/env bash

# Guard to ensure port 3024 is free for the Cortex MCP server.
# Usage: guard_port_3024.sh [--force]
#   --force: attempt to terminate any process currently bound to the port.

set -euo pipefail

PORT=3024
FORCE=0

for arg in "$@"; do
	case "$arg" in
		--force)
			FORCE=1
			;;
		--help|-h)
			cat <<EOF
Usage: $(basename "$0") [--force]
  --force   Attempt to terminate processes using TCP port ${PORT}.
EOF
			exit 0
			;;
		*)
			echo "Unknown option: $arg" >&2
			exit 2
			;;
	esac
done

if ! command -v lsof >/dev/null 2>&1; then
	echo "[guard-port] lsof not available; skipping guard check" >&2
	exit 0
fi

mapfile -t listeners < <(lsof -nP -i TCP:"${PORT}" -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print $2":"$1":"$9}')

if [[ ${#listeners[@]} -eq 0 ]]; then
	echo "[guard-port] Port ${PORT} is free"
	exit 0
fi

if [[ $FORCE -eq 0 ]]; then
	echo "[guard-port] Port ${PORT} is in use:" >&2
	printf '  %s\n' "${listeners[@]}" >&2
	echo "[guard-port] Re-run with --force to terminate the owning processes." >&2
	exit 1
fi

echo "[guard-port] Attempting to free port ${PORT}..."
for entry in "${listeners[@]}"; do
	pid=${entry%%:*}
	if kill "$pid" >/dev/null 2>&1; then
		echo "[guard-port] Terminated PID ${pid}"
	else
		echo "[guard-port] Failed to terminate PID ${pid}" >&2
	fi
done

# Give the OS a brief moment to release the socket
sleep 1

if lsof -nP -i TCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
	echo "[guard-port] Port ${PORT} still in use after forced cleanup" >&2
	exit 1
fi

echo "[guard-port] Port ${PORT} freed"
exit 0
