#!/usr/bin/env bash
# dev-setup.sh - Configure Cortex-OS development environment.
# Usage: ./scripts/dev-setup.sh [--minimal]
#
# Trusts .mise config, installs dependencies, and sets up pre-commit hooks.
# The --minimal flag installs dependencies without git hooks or extra tooling.

set -euo pipefail

MINIMAL=0
for arg in "$@"; do
    case "$arg" in
        --minimal) MINIMAL=1 ;;
    esac
done

echo "Trusting mise configuration..."
mise trust

if [ "$MINIMAL" -eq 1 ]; then
    echo "Running minimal dependency install..."
    pnpm install
else
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
fi

echo "Development environment setup complete."
