#!/usr/bin/env bash
# scripts/process-snapshot.sh
# Capture a focused snapshot of Node & pnpm related processes with RSS + command lines.
# Usage: scripts/process-snapshot.sh > .memory/process-snapshot-$(date +%s).txt
set -euo pipefail

printf "# Process Snapshot (Node / pnpm / tsserver) $(date -Iseconds)\n" >&2
# ps columns: pid,rss (KB),pcpu,etime,command
ps -Ao pid,rss,pcpu,etime,command | grep -E 'node|pnpm|tsserver' | grep -v 'grep -E' | awk '{
  rss_mb=$2/1024; pcpu=$3; pid=$1; et=$4; $1=""; $2=""; $3=""; $4=""; sub(/^ +/,"");
  printf("PID=%s RSS=%.1fMB CPU=%s ET=%s CMD=%s\n", pid, rss_mb, pcpu, et, $0);
}' | sort -k2 -nr | head -60

# Provide aggregate totals
TOTAL=$(ps -Ao rss,command | grep -E 'node|pnpm|tsserver' | grep -v 'grep -E' | awk '{sum+=$1} END {print sum/1024}')
printf "TOTAL_RSS_NODE_STACK_MB=%.1f\n" "$TOTAL"
