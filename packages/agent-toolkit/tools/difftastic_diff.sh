#!/usr/bin/env bash
set -euo pipefail
file1="$1"
file2="$2"
if command -v difftastic >/dev/null 2>&1; then
  diff=$(difftastic --color never "$file1" "$file2" || true)
else
  diff=$(diff -u "$file1" "$file2" || true)
fi
jq -n --arg file1 "$file1" --arg file2 "$file2" --arg diff "$diff" '{
  tool:"difftastic",
  op:"diff",
  inputs:{a:$file1,b:$file2},
  diff:$diff
}'
