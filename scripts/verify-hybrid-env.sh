#!/bin/bash
set -euo pipefail

# Cortex-OS Hybrid Environment Verification Script
# Checks: macOS arm64, OrbStack context active, required commands, ports free, basic Python + uv, docker compose accessible.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
EXIT_CODE=0

# Required commands list
REQUIRED_CMDS=(docker lsof curl)
OPTIONAL_CMDS=(pnpm uv python3 jq)

# Default ports (keep in sync with cortex-dev.sh)
PORT_API="8080"
PORT_MLX="8081"
PORT_WEBUI="3000"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ok() { echo -e "${GREEN}[OK]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; EXIT_CODE=1; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

check_platform() {
    info "Checking platform (macOS arm64) ..."
    local os arch
    os=$(uname)
    arch=$(uname -m)
    if [[ "$os" != "Darwin" ]]; then
        fail "Not running on macOS (detected: $os)"
    else
        ok "macOS detected"
    fi
    if [[ "$arch" != "arm64" ]]; then
        warn "Architecture is $arch (arm64 recommended for MLX performance)"
    else
        ok "arm64 architecture"
    fi
}

check_commands() {
    info "Checking required commands ..."
    for cmd in "${REQUIRED_CMDS[@]}"; do
        if command -v "$cmd" >/dev/null 2>&1; then
            ok "$cmd present"
        else
            fail "$cmd missing (required)"
        fi
    done

    info "Checking optional commands ..."
    for cmd in "${OPTIONAL_CMDS[@]}"; do
        if command -v "$cmd" >/dev/null 2>&1; then
            ok "$cmd present"
        else
            warn "$cmd not found (optional)"
        fi
    done
}

check_orbstack_context() {
    info "Checking Docker OrbStack context ..."
    if ! docker context inspect orbstack >/dev/null 2>&1; then
        warn "OrbStack context not found"
        fail "Create OrbStack context: docker context create orbstack"
        return
    fi
    local current
    current=$(docker context show 2>/dev/null || echo "unknown")
    if [[ "$current" != "orbstack" ]]; then
        warn "Active context is $current (expected orbstack)"
    else
        ok "OrbStack context active"
    fi
    if ! docker info >/dev/null 2>&1; then
        fail "Docker/OrbStack daemon not responding"
    else
        ok "Docker daemon reachable"
    fi
}

check_ports() {
    info "Checking host port availability ..."
    local -A ports=( [MLX]="$PORT_MLX" [API]="$PORT_API" [WEBUI]="$PORT_WEBUI" )
    for name in "${!ports[@]}"; do
        local port="${ports[$name]}"
        if lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
            warn "Port $port ($name) already in use"
        else
            ok "Port $port ($name) free"
        fi
    done
}

check_python_mlx() {
    if command -v python3 >/dev/null 2>&1; then
        info "Checking Python version ..."
        local v
        v=$(python3 -c 'import platform; print(platform.python_version())' || echo 'unknown')
        ok "Python available (version $v)"
        if python3 -c 'import mlx' >/dev/null 2>&1; then
            ok "mlx module importable (global)"
        else
            warn "mlx module not importable globally (will rely on venv)"
        fi
    fi
}

summary() {
    echo
    if [[ $EXIT_CODE -eq 0 ]]; then
        echo -e "${GREEN}Environment verification passed ✅${NC}"
    else
        echo -e "${RED}Environment verification encountered issues (code=$EXIT_CODE) ❌${NC}"
    fi
}

json_output=0
if [[ ${1:-} == "--json" ]]; then
    json_output=1
fi

check_platform
check_commands
check_orbstack_context || true
check_ports
check_python_mlx

summary

if [[ $json_output -eq 1 ]]; then
    # Lightweight JSON (no deep inspection to avoid jq dependency if absent)
    echo "{\"exitCode\":$EXIT_CODE,\"arch\":\"$(uname -m)\",\"os\":\"$(uname)\"}"
fi

exit $EXIT_CODE
