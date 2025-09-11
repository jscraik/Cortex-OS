#!/usr/bin/env bash
set -euo pipefail

pattern="$1"
path="${2:-.}"

rg_output=$(rg --json "$pattern" "$path" || true)
matches=$(echo "$rg_output" | jq -s '[.[] | select(.type=="match") | {file:.data.path.text, line:.data.line_number, text:.data.lines.text}]')

jq -n --arg pattern "$pattern" --arg path "$path" --argjson results "$matches" '{
  tool:"ripgrep",
  op:"search",
  inputs:{pattern:$pattern,path:$path},
  results:$results
}'
