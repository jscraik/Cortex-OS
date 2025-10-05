#!/bin/bash
set -euo pipefail

# Thin wrapper maintained for backwards compatibility. The canonical implementation
# lives under scripts/testing/test-safe.sh to keep the CLI surface tidy.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/testing/test-safe.sh" "$@"
