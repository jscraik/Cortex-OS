#!/usr/bin/env bash
# dev-setup.sh - Configure Cortex-OS development environment.
# Usage: ./scripts/dev-setup.sh
#
# Trusts .mise config, installs dependencies, and sets up pre-commit hooks.

set -euo pipefail

echo "Trusting mise configuration..."
mise trust

echo "Installing dependencies via mise..."
mise run bootstrap

echo "Installing pre-commit hooks..."
pre-commit install >/dev/null 2>&1 || true

echo "Running lint checks..."
if [ "${DEV_SETUP_VERBOSE:-}" = "1" ]; then
    pnpm memory:clean:gentle
else
    if ! pnpm memory:clean:gentle >/dev/null 2>&1; then
        echo "Warning: pnpm memory:clean:gentle failed during workspace cleanup. Run with DEV_SETUP_VERBOSE=1 for details." >&2
    fi
fi

echo "Development environment setup complete."
