#!/usr/bin/env sh
# Ensure pnpm is available when husky runs with a minimal PATH
export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
export PATH="$PNPM_HOME:$PATH"
