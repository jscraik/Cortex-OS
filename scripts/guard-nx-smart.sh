#!/usr/bin/env bash
# scripts/guard-nx-smart.sh
# brAInwav: Enforce Smart Nx wrapper usage over raw nx run-many
set -euo pipefail

NX_BASE="${NX_BASE:-origin/main}"
NX_HEAD="${NX_HEAD:-HEAD}"

echo "[brAInwav] Checking for forbidden 'nx run-many' usage in changed files..."

if git diff --name-only "$NX_BASE" "$NX_HEAD" | grep -E 'package\.json|scripts/|.github/workflows/'; then
  if git diff "$NX_BASE" "$NX_HEAD" | grep -E 'nx run-many'; then
    echo "[brAInwav] ERROR: Found 'nx run-many'. Use 'pnpm *:smart' wrappers instead." >&2
    echo "" >&2
    echo "Prefer:" >&2
    echo "  - pnpm build:smart" >&2
    echo "  - pnpm test:smart" >&2
    echo "  - pnpm lint:smart" >&2
    echo "  - pnpm typecheck:smart" >&2
    echo "" >&2
    echo "Instead of:" >&2
    echo "  - nx run-many --target=build" >&2
    exit 1
  fi
fi

echo "[brAInwav] ✅ No forbidden 'nx run-many' usage detected"
