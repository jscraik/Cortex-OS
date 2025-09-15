#!/usr/bin/env bash
#
# USAGE: ./scripts/capture_port3004_attribution.sh
#
# This script attempts to capture definitive forensic evidence of which system
# process is terminating listeners on TCP port 3004.
#
# STRATEGY:
# 1. Starts a background `log stream` process, filtering for daemons strongly
#    suspected of involvement (runningboardd, gamepolicyd, syspolicyd).
# 2. Runs the `port3004_bind_loop.py` diagnostic tool, which will bind to the
#    hostile port and get terminated.
# 3. Once the diagnostic tool exits, the script kills the background log stream.
# 4. It then analyzes the captured log file for keywords around the time of
#    termination to find the causal event.
#

set -euo pipefail

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
REPO_ROOT=$(realpath "$SCRIPT_DIR/..")
LOG_FILE="/tmp/port3004_attribution_capture.log"
DIAG_SCRIPT="$REPO_ROOT/scripts/port3004_bind_loop.py"
PREDICATE='process == "runningboardd" || process == "gamepolicyd" || process == "syspolicyd"'

echo "=== Port 3004 Attribution Capture Utility ==="
echo "This will take ~15 seconds..."
echo ""

if [[ -f "$LOG_FILE" ]]; then
  rm "$LOG_FILE"
fi

# 1. Start background log capture
echo "[1/4] Starting background log stream (capturing to $LOG_FILE)..."
log stream --predicate "$PREDICATE" --style compact --info > "$LOG_FILE" &
LOG_PID=$!
echo "      -> Log process started with PID $LOG_PID"
sleep 2 # Give log stream a moment to stabilize

# 2. Run the diagnostic that will be killed
echo "[2/4] Running diagnostic on port 3004 (expected to be terminated)..."
# Use --verbose to get process ancestry, and ignore 1 SIGTERM to see escalation
python3 "$DIAG_SCRIPT" --port 3004 --verbose --ignore-n-term 1 || true
echo "      -> Diagnostic script finished."
sleep 1

# 3. Stop the background log capture
echo "[3/4] Stopping background log stream..."
kill "$LOG_PID" || true
wait "$LOG_PID" 2>/dev/null || true
echo "      -> Log capture complete."

# 4. Analyze the results
echo "[4/4] Analyzing captured logs for termination event..."
echo "-----------------------------------------------------"

# Find the timestamp of the first SIGTERM event from the diagnostic's output
# The diagnostic script now logs the signal receipt time.
TERM_TIMESTAMP=$(grep "RECEIVED SIGTERM" "$LOG_FILE" 2>/dev/null | head -n 1 | awk -F'[][]' '{print $2}' || true)

if [[ -z "$TERM_TIMESTAMP" ]]; then
    # Fallback to finding the last heartbeat if SIGTERM isn't in the main log
    DIAG_OUTPUT=$(python3 "$DIAG_SCRIPT" --port 3004 --verbose --ignore-n-term 1 2>&1)
    LAST_HEARTBEAT_TS=$(echo "$DIAG_OUTPUT" | grep "HEARTBEAT" | tail -n 1 | awk -F'[][]' '{print $2}' || true)
    
    if [[ -n "$LAST_HEARTBEAT_TS" ]]; then
        echo "NOTE: Could not find SIGTERM event in main log. Using last heartbeat timestamp for analysis."
        TERM_TIMESTAMP=$LAST_HEARTBEAT_TS
    else
        echo "ERROR: Could not determine termination timestamp from any source."
        echo "Please review the full log file: $LOG_FILE"
        exit 1
    fi
fi

echo "Termination event detected around: $TERM_TIMESTAMP"
echo "Searching for related policy/lifecycle events..."
echo ""

# Grep for relevant events within a +/- 2 second window of the termination.
# This is a best-effort heuristic.
TS_SEC=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${TERM_TIMESTAMP:0:19}" "+%s")
START_TS_SEC=$((TS_SEC - 2))
END_TS_SEC=$((TS_SEC + 2))

START_DATE=$(date -r $START_TS_SEC -u +"%Y-%m-%d %H:%M:%S")
END_DATE=$(date -r $END_TS_SEC -u +"%Y-%m-%d %H:%M:%S")

echo "Relevant log entries between $START_DATE and $END_DATE UTC:"
awk -v start="$START_DATE" -v end="$END_DATE" '$0 >= start && $0 <= end' "$LOG_FILE" | grep -i -E 'term|kill|assert|lifecycle|deny|policy|process' | sed 's/^/  | /'

echo "-----------------------------------------------------"
echo "Analysis complete. Review the output above for a 'smoking gun' event."
echo "Full log is available at: $LOG_FILE"
