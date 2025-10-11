#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
PROJECT_ROOT=$(cd "$ROOT_DIR/.." && pwd)
DEFAULT_MANIFEST="$PROJECT_ROOT/config/connectors.manifest.json"
DEFAULT_BUNDLE_DIR="$PROJECT_ROOT/dist/apps/chatgpt-dashboard"
DEFAULT_HYBRID_STRATEGY="$PROJECT_ROOT/config/hybrid-model-strategy.json"

export CONNECTORS_MANIFEST_PATH="${CONNECTORS_MANIFEST_PATH:-$DEFAULT_MANIFEST}"
export APPS_BUNDLE_DIR="${APPS_BUNDLE_DIR:-$DEFAULT_BUNDLE_DIR}"
export HYBRID_MODEL_STRATEGY_PATH="${HYBRID_MODEL_STRATEGY_PATH:-$DEFAULT_HYBRID_STRATEGY}"
export HYBRID_INSTRUCTOR_ENABLED="${HYBRID_INSTRUCTOR_ENABLED:-auto}"

if [[ ! -f "$CONNECTORS_MANIFEST_PATH" ]]; then
	echo "[connectors] manifest not found at $CONNECTORS_MANIFEST_PATH" >&2
	exit 1
fi

if [[ ! -d "$APPS_BUNDLE_DIR" ]]; then
	echo "[connectors] dashboard bundle missing at $APPS_BUNDLE_DIR" >&2
	echo "Run 'pnpm --filter @cortex-os/chatgpt-dashboard build' first." >&2
fi

if [[ ! -f "$HYBRID_MODEL_STRATEGY_PATH" ]]; then
	echo "[connectors] hybrid model strategy not found at $HYBRID_MODEL_STRATEGY_PATH" >&2
	echo "Ensure the MLX hybrid strategy JSON is present or override HYBRID_MODEL_STRATEGY_PATH." >&2
fi

if [[ -z "${CONNECTORS_SIGNATURE_KEY:-}" ]]; then
	echo "[connectors] warning: CONNECTORS_SIGNATURE_KEY is unset" >&2
fi

if [[ -z "${CONNECTORS_API_KEY:-}" && "${NO_AUTH:-false}" != "true" ]]; then
	echo "[connectors] warning: CONNECTORS_API_KEY is unset (set NO_AUTH=true for local dev)" >&2
fi

exec uv run --project "$PROJECT_ROOT/packages/connectors" cortex-connectors-server
