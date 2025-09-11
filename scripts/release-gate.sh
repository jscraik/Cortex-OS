#!/usr/bin/env bash
set -euo pipefail
pnpm lint
pnpm test
node scripts/smoke-healthz.mjs
