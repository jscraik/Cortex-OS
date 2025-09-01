#!/usr/bin/env sh
# Ensure pnpm is available when husky runs with a minimal PATH
export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
export PATH="$PNPM_HOME:$PATH"

# Check if pnpm is available
if ! command -v pnpm >/dev/null 2>&1; then
  echo "Warning: pnpm not found in PATH"
  echo "Attempting to use corepack..."

  # Try to use corepack if available
  if command -v corepack >/dev/null 2>&1; then
    corepack enable pnpm
  else
    echo "Warning: corepack not found, trying to install pnpm globally"
    # Try to install pnpm if npm is available
    if command -v npm >/dev/null 2>&1; then
      npm install -g pnpm
    else
      echo "Error: Neither pnpm nor npm found. Please install pnpm."
      exit 1
    fi
  fi
fi

# Ensure we're using the correct Node.js version if nvm or similar is available
if command -v nvm >/dev/null 2>&1; then
  # Check if .nvmrc exists and use it
  if [ -f ".nvmrc" ]; then
    nvm use
  fi
elif command -v fnm >/dev/null 2>&1; then
  # Check if .node-version or .nvmrc exists and use it
  if [ -f ".node-version" ] || [ -f ".nvmrc" ]; then
    fnm use
  fi
fi
