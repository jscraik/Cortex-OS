#!/usr/bin/env bash
set -euo pipefail
# Side-by-side, line-by-line directory comparison with summary.
# Usage: scripts/dir_diff_side_by_side.sh <dirA> <dirB> <outDir>
if [ "${1:-}" = "" ] || [ "${2:-}" = "" ]; then
  echo "Usage: $0 <dirA> <dirB> [outDir]" >&2
  exit 2
fi
DIR_A=$(cd "$1" 2>/dev/null && pwd || true)
DIR_B=$(cd "$2" 2>/dev/null && pwd || true)
if [ -z "$DIR_A" ] || [ ! -d "$DIR_A" ]; then
  echo "Error: dirA not found: $1" >&2
  exit 1
fi
if [ -z "$DIR_B" ] || [ ! -d "$DIR_B" ]; then
  echo "Error: dirB not found: $2" >&2
  exit 1
fi
OUT_RAW=${3:-"comparisons/$(basename "$DIR_A")_vs_$(basename "$DIR_B")_$(date +%Y%m%dT%H%M%S)"}
# Normalize OUT to absolute path and create base dir
mkdir -p "$OUT_RAW"
OUT=$(cd "$OUT_RAW" && pwd)
mkdir -p "$OUT/diffs" "$OUT/tmp"
WIDTH=${DIFF_WIDTH:-180}
summary="$OUT/summary.txt"
only_a="$OUT/tmp/only_in_A.txt"
only_b="$OUT/tmp/only_in_B.txt"
diff_list="$OUT/tmp/differing.txt"
ident_list="$OUT/tmp/identical.txt"
binary_list="$OUT/tmp/binary_differing.txt"
rm -f "$only_a" "$only_b" "$diff_list" "$ident_list" "$binary_list"
# Build normalized file lists (relative paths)
pushd "$DIR_A" >/dev/null
find . -type f -print0 | LC_ALL=C sort -z > "$OUT/tmp/A_files.lst"
popd >/dev/null
pushd "$DIR_B" >/dev/null
find . -type f -print0 | LC_ALL=C sort -z > "$OUT/tmp/B_files.lst"
popd >/dev/null
# Index B files for quick existence checks
awk -v RS='\0' '{gsub(/^\.\//, ""); print}' "$OUT/tmp/B_files.lst" | sort -u > "$OUT/tmp/B_index.txt"
# Track counts
count_only_a=0
count_only_b=0
count_ident=0
count_diff=0
count_binary=0
count_total=0
# Helper: ensure directory exists for a path inside $OUT/diffs
mkoutdir() {
  local rel="$1"; local d
  d=$(dirname "$OUT/diffs/$rel.diff.txt")
  mkdir -p "$d"
}
# Iterate A files
while IFS= read -r -d '' pathA; do
  rel=${pathA#./}
  count_total=$((count_total+1))
  if ! grep -Fxq "$rel" "$OUT/tmp/B_index.txt"; then
    echo "$rel" >> "$only_a"
    count_only_a=$((count_only_a+1))
    continue
  fi
  # Exists in both: compare
  fileA="$DIR_A/$rel"
  fileB="$DIR_B/$rel"
  if cmp -s "$fileA" "$fileB"; then
    echo "$rel" >> "$ident_list"
    count_ident=$((count_ident+1))
  else
    # Check if likely binary
    mimeA=$(file -b --mime-type "$fileA" || echo unknown)
    mimeB=$(file -b --mime-type "$fileB" || echo unknown)
    if [[ "$mimeA" != text/* || "$mimeB" != text/* ]]; then
      echo "$rel" >> "$binary_list"
      count_binary=$((count_binary+1))
    else
      mkoutdir "$rel"
      # Generate side-by-side diff
      # Avoid failing the script if diff returns non-zero for differences
      if ! diff -y -W "$WIDTH" --tabsize=4 "$fileA" "$fileB" > "$OUT/diffs/$rel.diff.txt" 2>"$OUT/diffs/$rel.diff.err"; then
        :
      fi
      echo "$rel" >> "$diff_list"
      count_diff=$((count_diff+1))
    fi
  fi
done < "$OUT/tmp/A_files.lst"
# Files only in B
awk -v RS='\0' '{gsub(/^\.\//, ""); print}' "$OUT/tmp/B_files.lst" | while IFS= read -r rel; do
  if [ ! -f "$DIR_A/$rel" ]; then
    echo "$rel" >> "$only_b"
    count_only_b=$((count_only_b+1))
  fi
done
# Write summary
{
  echo "Directory Side-by-Side Comparison"
  echo "Generated: $(date -Iseconds)"
  echo "Dir A: $DIR_A"
  echo "Dir B: $DIR_B"
  echo "Output: $OUT"
  echo
  echo "DIFF WIDTH: $WIDTH"
  echo
  echo "Stats:"
  echo "  Total A files: $count_total"
  echo "  Identical: $count_ident"
  echo "  Differing (text): $count_diff"
  echo "  Differing (binary): $count_binary"
  echo "  Only in A: $count_only_a"
  echo "  Only in B: $count_only_b"
  echo
  echo "Notes:"
  echo "  - Per-file side-by-side diffs are under: $OUT/diffs"
  echo "  - For binary files, no side-by-side is produced; see list below."
  echo
  echo "Lists:"
  echo "-- Only in A --"
  if [ -f "$only_a" ]; then sort "$only_a"; fi
  echo
  echo "-- Only in B --"
  if [ -f "$only_b" ]; then sort "$only_b"; fi
  echo
  echo "-- Differing (text) --"
  if [ -f "$diff_list" ]; then sort "$diff_list"; fi
  echo
  echo "-- Differing (binary) --"
  if [ -f "$binary_list" ]; then sort "$binary_list"; fi
} > "$summary"
echo "Done. Summary: $summary"
#!/usr/bin/env bash
set -euo pipefail

# Side-by-side, line-by-line directory comparison with summary.
# Usage: scripts/dir_diff_side_by_side.sh <dirA> <dirB> <outDir>

if [ "${1:-}" = "" ] || [ "${2:-}" = "" ]; then
  echo "Usage: $0 <dirA> <dirB> [outDir]" >&2
  exit 2
fi

DIR_A=$(cd "$1" 2>/dev/null && pwd || true)
DIR_B=$(cd "$2" 2>/dev/null && pwd || true)

if [ -z "$DIR_A" ] || [ ! -d "$DIR_A" ]; then
  echo "Error: dirA not found: $1" >&2
  exit 1
fi
if [ -z "$DIR_B" ] || [ ! -d "$DIR_B" ]; then
  echo "Error: dirB not found: $2" >&2
  exit 1
fi

OUT_RAW=${3:-"comparisons/$(basename "$DIR_A")_vs_$(basename "$DIR_B")_$(date +%Y%m%dT%H%M%S)"}
# Normalize OUT to absolute path and create base dir
mkdir -p "$OUT_RAW"
OUT=$(cd "$OUT_RAW" && pwd)
mkdir -p "$OUT/diffs" "$OUT/tmp"

WIDTH=${DIFF_WIDTH:-180}

summary="$OUT/summary.txt"
only_a="$OUT/tmp/only_in_A.txt"
only_b="$OUT/tmp/only_in_B.txt"
diff_list="$OUT/tmp/differing.txt"
ident_list="$OUT/tmp/identical.txt"
binary_list="$OUT/tmp/binary_differing.txt"

rm -f "$only_a" "$only_b" "$diff_list" "$ident_list" "$binary_list"

# Build normalized file lists (relative paths)
pushd "$DIR_A" >/dev/null
find . -type f -print0 | LC_ALL=C sort -z > "$OUT/tmp/A_files.lst"
popd >/dev/null
pushd "$DIR_B" >/dev/null
find . -type f -print0 | LC_ALL=C sort -z > "$OUT/tmp/B_files.lst"
popd >/dev/null

# Index B files for quick existence checks
awk -v RS='\0' '{gsub(/^\.\//, ""); print}' "$OUT/tmp/B_files.lst" | sort -u > "$OUT/tmp/B_index.txt"

# Track counts
count_only_a=0
count_only_b=0
count_ident=0
count_diff=0
count_binary=0
count_total=0

# Helper: ensure directory exists for a path inside $OUT/diffs
mkoutdir() {
  local rel="$1"; local d
  d=$(dirname "$OUT/diffs/$rel.diff.txt")
  mkdir -p "$d"
}

# Iterate A files
while IFS= read -r -d '' pathA; do
  rel=${pathA#./}
  count_total=$((count_total+1))
  if ! grep -Fxq "$rel" "$OUT/tmp/B_index.txt"; then
    echo "$rel" >> "$only_a"
    count_only_a=$((count_only_a+1))
    continue
  fi
  # Exists in both: compare
  fileA="$DIR_A/$rel"
  fileB="$DIR_B/$rel"
  if cmp -s "$fileA" "$fileB"; then
    echo "$rel" >> "$ident_list"
    count_ident=$((count_ident+1))
  else
    # Check if likely binary
    mimeA=$(file -b --mime-type "$fileA" || echo unknown)
    mimeB=$(file -b --mime-type "$fileB" || echo unknown)
    if [[ "$mimeA" != text/* || "$mimeB" != text/* ]]; then
      echo "$rel" >> "$binary_list"
      count_binary=$((count_binary+1))
    else
      mkoutdir "$rel"
      # Generate side-by-side diff
      # Avoid failing the script if diff returns non-zero for differences
      if ! diff -y -W "$WIDTH" --tabsize=4 "$fileA" "$fileB" > "$OUT/diffs/$rel.diff.txt" 2>"$OUT/diffs/$rel.diff.err"; then
        :
      fi
      echo "$rel" >> "$diff_list"
      count_diff=$((count_diff+1))
    fi
  fi
done < "$OUT/tmp/A_files.lst"

# Files only in B
awk -v RS='\0' '{gsub(/^\.\//, ""); print}' "$OUT/tmp/B_files.lst" | while IFS= read -r rel; do
  if [ ! -f "$DIR_A/$rel" ]; then
    echo "$rel" >> "$only_b"
    count_only_b=$((count_only_b+1))
  fi
done

# Write summary
{
  echo "Directory Side-by-Side Comparison"
  echo "Generated: $(date -Iseconds)"
  echo "Dir A: $DIR_A"
  echo "Dir B: $DIR_B"
  echo "Output: $OUT"
  echo
  echo "DIFF WIDTH: $WIDTH"
  echo
  echo "Stats:"
  echo "  Total A files: $count_total"
  echo "  Identical: $count_ident"
  echo "  Differing (text): $count_diff"
  echo "  Differing (binary): $count_binary"
  echo "  Only in A: $count_only_a"
  echo "  Only in B: $count_only_b"
  echo
  echo "Notes:"
  echo "  - Per-file side-by-side diffs are under: $OUT/diffs"
  echo "  - For binary files, no side-by-side is produced; see list below."
  echo
  echo "Lists:"
  echo "-- Only in A --"
  if [ -f "$only_a" ]; then sort "$only_a"; fi
  echo
  echo "-- Only in B --"
  if [ -f "$only_b" ]; then sort "$only_b"; fi
  echo
  echo "-- Differing (text) --"
  if [ -f "$diff_list" ]; then sort "$diff_list"; fi
  echo
  echo "-- Differing (binary) --"
  if [ -f "$binary_list" ]; then sort "$binary_list"; fi
} > "$summary"

echo "Done. Summary: $summary"
