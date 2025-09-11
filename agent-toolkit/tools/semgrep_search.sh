#!/usr/bin/env bash
set -euo pipefail
pattern="$1"
path="${2:-.}"
output=$(semgrep --json --quiet --metrics=off -e "$pattern" "$path" || true)
results=$(echo "$output" | jq '[.results[] | {file:.path,start:.start.line,end:.end.line}]' 2>/dev/null || echo '[]')

jq -n --arg pattern "$pattern" --arg path "$path" --argjson results "$results" '{
  tool:"semgrep",
  op:"search",
  inputs:{pattern:$pattern,path:$path},
  results:$results
}'
