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
pnpm lint:quality >/dev/null 2>&1 || true

echo "Validating repository structure..."
pnpm structure:validate >/dev/null 2>&1 || true

echo "Performing workspace cleanup..."
pnpm memory:clean:gentle >/dev/null 2>&1 || true

echo "Development environment setup complete."
