#!/usr/bin/env bash
set -euo pipefail

if ! command -v brew >/dev/null; then
  echo "Homebrew is required. Install from https://brew.sh" >&2
  exit 1
fi

brew list alloy >/dev/null 2>&1 || brew install grafana/grafana/alloy

if [[ -z "${GCLOUD_HOSTED_METRICS_URL:-}" || -z "${GCLOUD_HOSTED_METRICS_ID:-}" || -z "${GCLOUD_RW_API_KEY:-}" ]]; then
  echo "Set GCLOUD_HOSTED_METRICS_URL, GCLOUD_HOSTED_METRICS_ID, GCLOUD_RW_API_KEY env vars before running." >&2
  exit 1
fi

node ops/observability/alloy/render-config.mjs

CONFIG_PATH="$(brew --prefix)/etc/alloy/config.alloy"
sudo mkdir -p "$(dirname "$CONFIG_PATH")"
sudo cp ops/observability/alloy/config.alloy "$CONFIG_PATH"

brew services restart alloy
echo "Alloy installed and configured. Verifying service status:"
brew services list | grep alloy || true
