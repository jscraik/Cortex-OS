#!/usr/bin/env bash
set -euo pipefail
query="$1"
path="${2:-.}"
if ! command -v tree-sitter >/dev/null 2>&1; then
  jq -n --arg query "$query" --arg path "$path" '{tool:"tree-sitter",op:"query",inputs:{query:$query,path:$path},error:"tree-sitter not installed"}'
  exit 0
fi
if [ -z "${TS_LIB:-}" ] || [ -z "${TS_LANG:-}" ]; then
  jq -n --arg query "$query" --arg path "$path" '{tool:"tree-sitter",op:"query",inputs:{query:$query,path:$path},error:"TS_LIB or TS_LANG not set"}'
  exit 0
fi
output=$(tree-sitter query --lang "$TS_LANG" "$query" -s "$path" 2>/dev/null || true)
# Tree-sitter query output is lines: file\tstart\tend\tmatch
results=$(echo "$output" | awk -F'\t' '{printf("{\\"file\\":\\"%s\\",\\"match\\":\\"%s\\"}\n",$1,$4)}' | jq -s '.')

jq -n --arg query "$query" --arg path "$path" --argjson results "$results" '{tool:"tree-sitter",op:"query",inputs:{query:$query,path:$path},results:$results}'
