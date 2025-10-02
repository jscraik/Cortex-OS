#!/usr/bin/env bash
set -euo pipefail
pattern="$1"
path="${2:-.}"
if ! command -v ast-grep >/dev/null 2>&1; then
  jq -n --arg pattern "$pattern" --arg path "$path" '{tool:"ast-grep",op:"search",inputs:{pattern:$pattern,path:$path},error:"ast-grep not installed"}'
  exit 0
fi
error_file=$(mktemp)
if ! raw_output=$(ast-grep run --pattern "$pattern" "$path" --json=compact 2>"$error_file"); then
  error_message=$(cat "$error_file")
  jq -n --arg pattern "$pattern" --arg path "$path" --arg error "$error_message" '{tool:"ast-grep",op:"search",inputs:{pattern:$pattern,path:$path},error:$error}'
  rm -f "$error_file"
  exit 0
fi
rm -f "$error_file"
parsed=$(echo "$raw_output" | jq '(.matches // []) | [ .[] | {file:.path, start:.range.start.line, end:.range.end.line} ]' 2>/dev/null || echo '[]')

jq -n --arg pattern "$pattern" --arg path "$path" --argjson results "$parsed" '{
  tool:"ast-grep",
  op:"search",
  inputs:{pattern:$pattern,path:$path},
  results:$results
}'
