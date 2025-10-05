#!/usr/bin/env bash
set -euo pipefail

BRAND="brAInwav"
JSON_OUTPUT=0
REPORTER="${MCP_TEST_REPORTER:-dot}"
FORWARDED_ARGS=()

usage() {
	cat <<'EOF'
[brAInwav] MCP Test Harness
Usage: packages/mcp/scripts/test-mcp.sh [options] [-- <vitest args>]
  --json              Emit JSON summary instead of human-readable output
	--reporter <name>   Vitest reporter (defaults to env MCP_TEST_REPORTER or "dot")
  --help              Show this message

Additional arguments after -- are forwarded to vitest.
EOF
}

while (($# > 0)); do
	case "$1" in
		--json)
			JSON_OUTPUT=1
			shift
			;;
		--reporter=*)
			REPORTER="${1#*=}"
			shift
			;;
		--reporter)
			if [[ $# -lt 2 ]]; then
				echo "[${BRAND}][mcp:test] ERROR: --reporter requires a value" >&2
				exit 2
			fi
			REPORTER="$2"
			shift 2
			;;
		--help|-h)
			usage
			exit 0
			;;
		--)
			shift
			if (($# > 0)); then
				FORWARDED_ARGS+=("$@")
			fi
			break
			;;
		*)
			FORWARDED_ARGS+=("$1")
			shift
			;;
	esac
	shift || true
done

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
cd "$repo_root"

log_file="$repo_root/logs/mcp-test.log"
mkdir -p "$(dirname "$log_file")"

timestamp() {
	date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log() {
	local message="$1"
	local iso
	iso=$(timestamp)
	echo "[${BRAND}][mcp:test] $message"
	echo "${iso} $message" >>"$log_file"
}

log_error() {
	local message="$1"
	local iso
	iso=$(timestamp)
	echo "[${BRAND}][mcp:test] ERROR: $message" >&2
	echo "${iso} ERROR: $message" >>"$log_file"
}

log "Starting MCP test harness (reporter=${REPORTER})"

cmd=(pnpm exec vitest run -c packages/mcp/vitest.config.ts --passWithNoTests --no-color --reporter "$REPORTER")
if ((${#FORWARDED_ARGS[@]} > 0)); then
	cmd+=("${FORWARDED_ARGS[@]}")
fi

log "Running: ${cmd[*]}"

set +e
output="$("${cmd[@]}" 2>&1)"
cmd_exit=$?
set -e

if [[ $JSON_OUTPUT -eq 0 ]]; then
	echo "$output"
fi

echo "$output" >>"$log_file"

status="ok"
if [[ $cmd_exit -ne 0 ]]; then
	status="fail"
	log_error "Vitest exited with code $cmd_exit"
else
	log "Vitest completed successfully"
fi

iso_now=$(timestamp)

command_json=$(python3 -c 'import json, sys; print(json.dumps(sys.argv[1:]))' "${cmd[@]}")

if [[ $JSON_OUTPUT -eq 1 ]]; then
	MCP_TEST_STATUS="$status" \
	MCP_TEST_EXIT_CODE="$cmd_exit" \
	MCP_TEST_REPORTER="$REPORTER" \
	MCP_TEST_LOG_FILE="$log_file" \
	MCP_TEST_TIMESTAMP="$iso_now" \
	MCP_TEST_BRAND="$BRAND" \
	MCP_TEST_RAW_OUTPUT="$output" \
	MCP_TEST_COMMAND_JSON="$command_json" \
	node - <<'NODE'
const summary = {
	brand: process.env.MCP_TEST_BRAND ?? 'brAInwav',
	status: process.env.MCP_TEST_STATUS ?? 'unknown',
	exitCode: Number(process.env.MCP_TEST_EXIT_CODE ?? '1'),
	reporter: process.env.MCP_TEST_REPORTER ?? 'dot',
	command: JSON.parse(process.env.MCP_TEST_COMMAND_JSON || '[]'),
	logFile: process.env.MCP_TEST_LOG_FILE ?? '',
	timestamp: process.env.MCP_TEST_TIMESTAMP ?? new Date().toISOString(),
	rawOutput: process.env.MCP_TEST_RAW_OUTPUT ?? ''
};
process.stdout.write(JSON.stringify(summary));
NODE
else
	log "Status: ${status} (exitCode=${cmd_exit})"
fi

exit $cmd_exit
