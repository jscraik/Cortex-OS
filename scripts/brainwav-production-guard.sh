#!/bin/bash
# brAInwav production guard script
# Scans for placeholder patterns across all components

set -e

FORBIDDEN_PATTERNS=("TODO:" "Mock" "not yet implemented")
ALLOWLIST=("docs/" "README.md")

failures=()

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  while IFS= read -r -d '' file; do
    skip=false
    for allow in "${ALLOWLIST[@]}"; do
      if [[ "$file" == *$allow* ]]; then
        skip=true
        break
      fi
    done
    if [ "$skip" = false ]; then
      if grep -q "$pattern" "$file"; then
        failures+=("$file:$pattern")
      fi
    fi
  done < <(find . -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -print0)
done

if [ ${#failures[@]} -ne 0 ]; then
  echo "brAInwav production guard failed! Forbidden patterns found:"
  for fail in "${failures[@]}"; do
    echo "$fail"
  done
  exit 1
else
  echo "brAInwav production guard passed."
fi
