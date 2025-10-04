#!/usr/bin/env bash
set -euo pipefail
file_list="$1"
files=()

if [[ -f "$file_list" ]]; then
  mapfile -t files < "$file_list"
else
  if [[ "$file_list" == "changed.txt" ]]; then
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      mapfile -t files < <(git diff --name-only --cached)
    fi
    if [[ ${#files[@]} -eq 0 ]]; then
      echo "Error: No staged changes detected for 'changed.txt'; run 'git add' before verification." >&2
      exit 1
    fi
  else
    echo "Error: File list '$file_list' does not exist or is not a regular file." >&2
    exit 1
  fi
fi
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
