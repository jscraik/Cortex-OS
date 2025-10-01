#!/usr/bin/env bash
# scripts/enforce-node-version.sh
# Ensures local Node matches workspace enforced version (from pnpm-workspace.yaml useNodeVersion or .nvmrc).
set -euo pipefail
REQ="$(grep -E '^useNodeVersion:' pnpm-workspace.yaml 2>/dev/null | awk '{print $2}')"
if [ -z "$REQ" ] && [ -f .nvmrc ]; then REQ=$(cat .nvmrc | tr -d '\r'); fi
if [ -z "$REQ" ]; then echo "No enforced Node version found."; exit 0; fi
CUR=$(node -v | sed 's/^v//')
if [[ "$CUR" != "$REQ"* ]]; then
  echo "Mismatch: required $REQ but running $CUR" >&2
  echo "Hint: nvm install $REQ && nvm use $REQ" >&2
  exit 2
fi
echo "Node version OK ($CUR matches $REQ)" >&2
