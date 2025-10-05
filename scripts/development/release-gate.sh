#!/usr/bin/env bash
set -euo pipefail
pnpm lint
pnpm test
node scripts/smoke-healthz.mjs
pnpm cbom:record
pnpm cbom:attest
pnpm cbom:verify
pnpm cbom:export
