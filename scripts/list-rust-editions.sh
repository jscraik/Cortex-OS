#!/usr/bin/env bash
set -euo pipefail
# list-rust-editions.sh
# Enumerate all Cargo.toml files and print: <edition> <package-name> <path>
# Optional filters:
#   -e <edition> : only show given edition (e.g. 2024)
#   -q           : quiet (suppress header)
#   -c           : count only
# Example:
#   scripts/list-rust-editions.sh -e 2024
#   scripts/list-rust-editions.sh -c

FILTER_EDITION=""
QUIET=0
COUNT_ONLY=0
while getopts ":e:qc" opt; do
  case "$opt" in
    e) FILTER_EDITION="$OPTARG" ;;
    q) QUIET=1 ;;
    c) COUNT_ONLY=1 ;;
    *) echo "Usage: $0 [-e edition] [-q] [-c]" >&2; exit 1 ;;
  esac
done
shift $((OPTIND-1))

# Use git to find Cargo.toml for speed; fallback to find.
if git rev-parse --show-toplevel >/dev/null 2>&1; then
  MAPFILE=($(git ls-files "**/Cargo.toml" "Cargo.toml" 2>/dev/null || true))
else
  # shellcheck disable=SC2044
  for f in $(find . -name Cargo.toml); do
    MAPFILE+=("$f")
  done
fi

count=0
[[ $QUIET -eq 1 || $COUNT_ONLY -eq 1 ]] || echo "edition package path"
for file in "${MAPFILE[@]}"; do
  pkg=$(grep -E "^name\s*=\s*" "$file" | head -n1 | sed -E 's/name\s*=\s*"([^"]+)".*/\1/' || true)
  edition=$(grep -E "^edition\s*=\s*" "$file" | head -n1 | sed -E 's/edition\s*=\s*"([0-9]+)".*/\1/' || true)
  [[ -z $edition ]] && continue
  if [[ -n $FILTER_EDITION && $edition != $FILTER_EDITION ]]; then
    continue
  fi
  if [[ $COUNT_ONLY -eq 1 ]]; then
    ((count++))
    continue
  fi
  printf "%s %s %s\n" "$edition" "$pkg" "$file"
  ((count++))
done

if [[ $COUNT_ONLY -eq 1 ]]; then
  echo "$count"
fi
