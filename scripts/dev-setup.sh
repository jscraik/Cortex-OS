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
if pre-commit install; then
    echo "pre-commit hooks installed successfully."
else
    echo "Warning: Failed to install pre-commit hooks. Please ensure pre-commit is installed and try again." >&2
fi

echo "Development environment setup complete."
