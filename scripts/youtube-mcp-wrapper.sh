#!/usr/bin/env bash
#
# YouTube MCP Server Wrapper
# Validates environment and launches the YouTube MCP server with proper error handling
#

set -euo pipefail

# Load environment variables from .env.local if it exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_LOCAL_FILE="$REPO_ROOT/.env.local"

if [[ -f "$ENV_LOCAL_FILE" ]]; then
    # Load .env.local, handling comments and empty lines
    set -o allexport
    source "$ENV_LOCAL_FILE"
    set +o allexport
    echo "[INFO] Loaded environment from $ENV_LOCAL_FILE" >&2
fi

# Color output for better visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1" >&2
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Validate environment
if [[ -z "${YOUTUBE_API_KEY:-}" ]]; then
    log_error "YOUTUBE_API_KEY environment variable is required but not set"
    log_error "Please set it using: export YOUTUBE_API_KEY='your_api_key_here'"
    log_error "Or for system-wide access: launchctl setenv YOUTUBE_API_KEY 'your_api_key_here'"
    exit 1
fi

# Basic validation - API keys should be non-empty and reasonable length
if [[ ${#YOUTUBE_API_KEY} -lt 10 ]]; then
    log_error "YOUTUBE_API_KEY appears to be too short (${#YOUTUBE_API_KEY} chars). Expected format: AIza..."
    exit 1
fi

log_info "Environment validation passed (API key length: ${#YOUTUBE_API_KEY} chars)"

# Check if npx is available
if ! command -v npx >/dev/null 2>&1; then
    log_error "npx command not found. Please install Node.js and npm"
    exit 1
fi

# Check Node.js version (require at least 16.x for MCP compatibility)
NODE_VERSION=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [[ ${NODE_VERSION:-0} -lt 16 ]]; then
    log_error "Node.js version ${NODE_VERSION:-unknown} is too old. MCP requires Node 16+"
    exit 1
fi

log_info "Starting YouTube MCP server (Node.js v$(node -v))"

# Launch the server with error handling
exec npx -y @kirbah/mcp-youtube "$@"
