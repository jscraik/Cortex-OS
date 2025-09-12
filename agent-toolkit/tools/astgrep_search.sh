#!/usr/bin/env bash
set -euo pipefail
pattern="$1"
path="${2:-.}"
if ! command -v ast-grep >/dev/null 2>&1; then
  jq -n --arg pattern "$pattern" --arg path "$path" '{tool:"ast-grep",op:"search",inputs:{pattern:$pattern,path:$path},error:"ast-grep not installed"}'
  exit 0
fi
if ! output=$(ast-grep "$pattern" "$path" -j | jq '[.matches[] | {file:.file, start:.range.start.line, end:.range.end.line}]' 2>&1); then
  jq -n --arg pattern "$pattern" --arg path "$path" --arg error "$output" '{tool:"ast-grep",op:"search",inputs:{pattern:$pattern,path:$path},error:$error}'
  exit 0
fi

jq -n --arg pattern "$pattern" --arg path "$path" --argjson results "$output" '{
  tool:"ast-grep",
  op:"search",
  inputs:{pattern:$pattern,path:$path},
  results:$results
}'
