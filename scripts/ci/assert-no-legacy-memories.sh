#!/usr/bin/env bash

set -euo pipefail

IMPORTS=$(grep -r "packages/memories" packages --include "*.ts" --exclude-dir node_modules)

if [ -n "$IMPORTS" ]; then
  echo "Error: Found imports from legacy packages/memories"
  echo "$IMPORTS"
  exit 1
fi

echo "No imports from legacy packages/memories found."
