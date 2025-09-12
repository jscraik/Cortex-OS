#!/usr/bin/env bash
set -euo pipefail

pattern="$1"
path="${2:-.}"

rg_output=""
rg_error=""
if ! rg_output=$(rg --json "$pattern" "$path" 2> >(rg_error=$(cat); typeset -p rg_error 1>&2)); then
  # If rg fails, output error JSON
  jq -n --arg pattern "$pattern" --arg path "$path" --arg error "${rg_error:-"Unknown error"}" '{
    tool:"ripgrep",
    op:"search",
    inputs:{pattern:$pattern,path:$path},
    error:$error
  }'
  exit 0
fi
matches=$(echo "$rg_output" | jq -s '[.[] | select(.type=="match") | {file:.data.path.text, line:.data.line_number, text:.data.lines.text}]')

jq -n --arg pattern "$pattern" --arg path "$path" --argjson results "$matches" '{
  tool:"ripgrep",
  op:"search",
  inputs:{pattern:$pattern,path:$path},
  results:$results
}'
