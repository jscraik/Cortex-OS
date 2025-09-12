#!/usr/bin/env bash
set -euo pipefail
usage() {
  echo "Usage: $0 --diff <file> | --stdin" >&2
  exit 1
}
input=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --diff) shift; input=$(cat "$1"); shift;;
    --stdin) input=$(cat); shift;;
    *) usage;;
  esac
done
[ -z "$input" ] && usage

tmpdir=$(mktemp -d)
diff_file="$tmpdir/patch.diff"
echo "$input" > "$diff_file"
if ! git apply --check "$diff_file" 2>/dev/null; then
  jq -n '{tool:"patch",op:"apply",status:"fail",reason:"dry-run failed"}'
  rm -rf "$tmpdir"
  exit 1
fi
ts=$(date +%s)
backup_dir=".patch-backups/$ts"
mkdir -p "$backup_dir"

if [ $? -ne 0 ]; then
  jq -n --arg reason "failed to create backup directory" '{tool:"patch",op:"apply",status:"fail",reason:$reason}'
  rm -rf "$tmpdir"
  exit 1
fi
cp "$diff_file" "$backup_dir/patch.diff"
if [ $? -ne 0 ]; then
  jq -n --arg reason "failed to copy patch diff to backup directory" '{tool:"patch",op:"apply",status:"fail",reason:$reason}'
  rm -rf "$tmpdir"
  exit 1
fi


git apply "$diff_file"

jq -n --arg backup "$backup_dir" '{tool:"patch",op:"apply",status:"applied",backup:$backup}'
