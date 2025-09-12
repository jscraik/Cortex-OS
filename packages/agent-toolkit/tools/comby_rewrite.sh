#!/usr/bin/env bash
set -euo pipefail
find_pattern="$1"
replace_pattern="$2"
path="${3:-.}"
if ! command -v comby >/dev/null 2>&1; then
  jq -n --arg error "comby not installed" '{tool:"comby",op:"rewrite",error:$error}'
  exit 0
fi
diff=$(comby "$find_pattern" "$replace_pattern" "$path" -d || true)
jq -n --arg find "$find_pattern" --arg replace "$replace_pattern" --arg path "$path" --arg diff "$diff" '{
  tool:"comby",
  op:"rewrite",
  inputs:{find:$find,replace:$replace,path:$path},
  diff:$diff
}'
