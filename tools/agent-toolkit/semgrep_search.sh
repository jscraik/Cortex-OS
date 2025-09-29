#!/usr/bin/env bash
set -euo pipefail
pattern="$1"
path="${2:-.}"

semgrep_output_file=$(mktemp)
semgrep_error_file=$(mktemp)
semgrep --json --quiet --metrics=off -e "$pattern" "$path" >"$semgrep_output_file" 2>"$semgrep_error_file"
semgrep_exit_code=$?
if [ $semgrep_exit_code -ne 0 ]; then
  error_message=$(cat "$semgrep_error_file")
  jq -n --arg pattern "$pattern" --arg path "$path" --arg error "$error_message" '{
    tool:"semgrep",
    op:"search",
    inputs:{pattern:$pattern,path:$path},
    error:$error
  }'
  rm -f "$semgrep_output_file" "$semgrep_error_file"
  exit 0
fi
output=$(cat "$semgrep_output_file")
results=$(echo "$output" | jq '[.results[] | {file:.path,start:.start.line,end:.end.line}]' 2>/dev/null || echo '[]')
rm -f "$semgrep_output_file" "$semgrep_error_file"


jq -n --arg pattern "$pattern" --arg path "$path" --argjson results "$results" '{
  tool:"semgrep",
  op:"search",
  inputs:{pattern:$pattern,path:$path},
  results:$results
}'
