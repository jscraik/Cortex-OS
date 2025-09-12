#!/usr/bin/env bash
set -euo pipefail
file_list="$1"
if [[ ! -f "$file_list" ]]; then
  echo "Error: File list '$file_list' does not exist or is not a regular file." >&2
  exit 1
fi
mapfile -t files < "$file_list"
js=()
py=()
rs=()
for f in "${files[@]}"; do
  case "$f" in
    *.ts|*.tsx|*.js) js+=("$f") ;;
    *.py) py+=("$f") ;;
    *.rs) rs+=("$f") ;;
  esac
done
results=()
if [ ${#js[@]} -gt 0 ]; then
  results+=("$("$(dirname "$0")/eslint_verify.sh" "${js[@]}")")
fi
if [ ${#py[@]} -gt 0 ]; then
  results+=("$("$(dirname "$0")/ruff_verify.sh" "${py[@]}")")
  results+=("$("$(dirname "$0")/pytest_verify.sh")")
fi
if [ ${#rs[@]} -gt 0 ]; then
  results+=("$("$(dirname "$0")/cargo_verify.sh")")
fi
printf '%s\n' "${results[@]}" | jq -s '{tool:"validator",op:"run",results:.}'
