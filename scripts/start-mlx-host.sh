#!/bin/bash
set -euo pipefail

# Enhancements: foreground mode, --no-install, configurable venv, improved health wait, JSON status, trap cleanup

# Cortex-OS MLX Host Service Startup Script
# This script starts the MLX embedding service natively on macOS
# so that containerized services can access it via host.docker.internal

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
MLX_SERVER_DIR="$REPO_ROOT/services/py-mlx-server"
LOG_DIR="$REPO_ROOT/logs"
PID_FILE="$LOG_DIR/mlx-server.pid"
LOG_FILE="$LOG_DIR/mlx-server.log"

# Default settings (can be overridden with environment variables or flags)
MLX_HOST="${MLX_HOST:-127.0.0.1}"
MLX_PORT="${MLX_PORT:-8081}"
EMBEDDINGS_MODEL="${EMBEDDINGS_MODEL:-qwen3-embed}"
EMBEDDINGS_DIM="${EMBEDDINGS_DIM:-768}"
VENV_PATH="${MLX_VENV_PATH:-$MLX_SERVER_DIR/.venv}"
SKIP_INSTALL=0
FOREGROUND=0
WAIT_HEALTH=1
WAIT_TIMEOUT="${MLX_WAIT_TIMEOUT:-40}"
JSON_STATUS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[MLX-Host]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[MLX-Host WARN]${NC} $1"
}

error() {
    echo -e "${RED}[MLX-Host ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[MLX-Host]${NC} $1"
}

# Check if running on macOS
check_platform() {
    if [[ "$(uname)" != "Darwin" ]]; then
        error "This script is designed to run on macOS only."
        error "MLX requires Apple Silicon and Metal for optimal performance."
        exit 1
    fi
    
    # Check for Apple Silicon
    if [[ "$(uname -m)" != "arm64" ]]; then
        warn "Not running on Apple Silicon (arm64). MLX performance may be limited."
    fi
}

# Check if MLX server directory exists
check_mlx_server() {
    if [[ ! -d "$MLX_SERVER_DIR" ]]; then
        error "MLX server directory not found: $MLX_SERVER_DIR"
        exit 1
    fi
    
    if [[ ! -f "$MLX_SERVER_DIR/src/py_mlx_server/main.py" ]]; then
        error "MLX server main.py not found in $MLX_SERVER_DIR"
        exit 1
    fi
}

# Create log directory
setup_logging() {
    mkdir -p "$LOG_DIR"
}

# Check if MLX server is already running
check_running() {
    if [[ -f "$PID_FILE" ]]; then
        local pid
        pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            warn "MLX server is already running (PID: $pid)"
            warn "Use '$0 stop' to stop it first, or '$0 restart' to restart"
            return 0
        else
            # PID file exists but process is dead, clean it up
            rm -f "$PID_FILE"
        fi
    fi
    return 1
}

# Install MLX dependencies if needed
install_dependencies() {
    if [[ $SKIP_INSTALL -eq 1 ]]; then
        log "Skipping dependency installation (per flag)"
        return 0
    fi
    log "Ensuring MLX dependencies available (venv: $VENV_PATH) ..."
    cd "$MLX_SERVER_DIR"

    # Prefer uv if present
    if command -v uv >/dev/null 2>&1; then
        log "Using uv for dependency management"
        if [[ ! -d "$VENV_PATH" ]]; then
            log "Creating virtual environment at $VENV_PATH"
            UV_VENV_PATH="$VENV_PATH" uv venv
        fi
        # Sync dependencies from pyproject
        UV_VENV_PATH="$VENV_PATH" uv sync
        if [[ "$(uname -m)" == "arm64" ]]; then
            if ! UV_VENV_PATH="$VENV_PATH" uv pip show mlx >/dev/null 2>&1; then
                log "Adding mlx package (Apple Silicon)"
                UV_VENV_PATH="$VENV_PATH" uv add mlx || warn "MLX install failed – continuing (fallback embedding may apply)"
            fi
        fi
    else
        # Fallback to python -m venv + pip
        if [[ ! -d "$VENV_PATH" ]]; then
            log "Creating venv via python -m venv at $VENV_PATH"
            python3 -m venv "$VENV_PATH"
        fi
        # shellcheck disable=SC1090
        source "$VENV_PATH/bin/activate"
        pip install --upgrade pip >/dev/null 2>&1 || true
        pip install fastapi uvicorn >/dev/null 2>&1
        if [[ "$(uname -m)" == "arm64" ]]; then
            if ! pip show mlx >/dev/null 2>&1; then
                log "Installing mlx (Apple Silicon)"
                pip install mlx || warn "MLX install failed – continuing"
            fi
        fi
    fi
}

# Start the MLX server
start_server() {
    # Port conflict check
    if lsof -iTCP:"$MLX_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
        warn "Port $MLX_PORT already in use. Another process may be bound (potential conflict)."
        warn "If this is an old MLX instance, run: $0 stop (or kill the process manually)."
    fi
    log "Starting MLX embedding server..."
    log "Host: $MLX_HOST:$MLX_PORT | Model: $EMBEDDINGS_MODEL | Dim: $EMBEDDINGS_DIM"
    log "Venv: $VENV_PATH | Log: $LOG_FILE"
    cd "$MLX_SERVER_DIR"

    export HOST="$MLX_HOST" PORT="$MLX_PORT" EMBEDDINGS_MODEL="$EMBEDDINGS_MODEL" EMBEDDINGS_DIM="$EMBEDDINGS_DIM"

    local run_cmd
    if command -v uv >/dev/null 2>&1 && [[ -d "$VENV_PATH" ]]; then
        run_cmd=(uv run python -m py_mlx_server.main)
    elif [[ -d "$VENV_PATH" ]]; then
        # shellcheck disable=SC1090
        source "$VENV_PATH/bin/activate"
        run_cmd=(python -m py_mlx_server.main)
    else
        run_cmd=(python src/py_mlx_server/main.py)
    fi

    if [[ $FOREGROUND -eq 1 ]]; then
        log "Running in foreground mode (Ctrl+C to stop)"
        "${run_cmd[@]}"
        return $?
    fi

    nohup "${run_cmd[@]}" > "$LOG_FILE" 2>&1 &
    local pid=$!
    echo "$pid" > "$PID_FILE"

    sleep 2
    if kill -0 "$pid" 2>/dev/null; then
        log "Process started (PID: $pid)."
        if [[ $WAIT_HEALTH -eq 1 ]]; then
            wait_for_health || warn "Health not confirmed within timeout ($WAIT_TIMEOUT s)"
        fi
        success "Server available at http://$MLX_HOST:$MLX_PORT"
        return 0
    else
        error "Process failed to start. See $LOG_FILE"
        rm -f "$PID_FILE"
        return 1
    fi
}

wait_for_health() {
    if ! command -v curl >/dev/null 2>&1; then
        warn "curl missing; skipping health wait"
        return 0
    fi
    log "Waiting for health endpoint (timeout: ${WAIT_TIMEOUT}s) ..."
    local start_ts now elapsed
    start_ts=$(date +%s)
    while true; do
        if curl -s "http://$MLX_HOST:$MLX_PORT/health" | grep -q '"status"'; then
            success "Health endpoint responsive"
            return 0
        fi
        now=$(date +%s)
        elapsed=$(( now - start_ts ))
        if (( elapsed >= WAIT_TIMEOUT )); then
            return 1
        fi
        sleep 1
    done
}

# Stop the MLX server
stop_server() {
    if [[ ! -f "$PID_FILE" ]]; then
        warn "MLX server doesn't appear to be running (no PID file)"
        return 0
    fi
    
    local pid
    pid=$(cat "$PID_FILE")
    
    if kill -0 "$pid" 2>/dev/null; then
        log "Stopping MLX server (PID: $pid)..."
        kill "$pid"
        
        # Wait for graceful shutdown
        local count=0
        while kill -0 "$pid" 2>/dev/null && [[ $count -lt 10 ]]; do
            sleep 1
            ((count++))
        done
        
        if kill -0 "$pid" 2>/dev/null; then
            warn "Graceful shutdown failed, force killing..."
            kill -9 "$pid"
        fi
        
        rm -f "$PID_FILE"
        success "MLX server stopped"
    else
        warn "MLX server process not running, cleaning up PID file"
        rm -f "$PID_FILE"
    fi
}

# Check server status
status_server() {
    if [[ ! -f "$PID_FILE" ]]; then
        echo "MLX server is not running"
        return 1
    fi
    
    local pid
    pid=$(cat "$PID_FILE")
    
    if kill -0 "$pid" 2>/dev/null; then
        local responding="false"
        if command -v curl >/dev/null 2>&1; then
            if curl -s "http://$MLX_HOST:$MLX_PORT/ping" >/dev/null; then
                responding="true"
            fi
        fi
        if [[ $JSON_STATUS -eq 1 ]]; then
            printf '{"running":true,"pid":%s,"url":"http://%s:%s","responding":%s,"log":"%s"}\n' "$pid" "$MLX_HOST" "$MLX_PORT" "$responding" "$LOG_FILE"
        else
            echo "MLX server is running (PID: $pid)"
            echo "Listening on: http://$MLX_HOST:$MLX_PORT"
            echo "Log file: $LOG_FILE"
            if [[ $responding == "true" ]]; then
                echo "Server is responding to requests ✓"
            else
                echo "Server process is running but not responding to HTTP requests"
            fi
        fi
        return 0
    else
        [[ $JSON_STATUS -eq 1 ]] && echo '{"running":false}' || echo "MLX server is not running (stale PID file)"
        rm -f "$PID_FILE"
        return 1
    fi
}

# Show server logs
show_logs() {
    if [[ -f "$LOG_FILE" ]]; then
        if [[ "${1:-}" == "-f" ]]; then
            tail -f "$LOG_FILE"
        else
            tail -20 "$LOG_FILE"
        fi
    else
        warn "No log file found at $LOG_FILE"
    fi
}

# Health check
health_check() {
    if ! status_server >/dev/null 2>&1; then
        error "MLX server is not running"
        return 1
    fi
    
    if command -v curl >/dev/null 2>&1; then
        log "Performing health check..."
        if curl -s "http://$MLX_HOST:$MLX_PORT/health" | grep -q '"status":"ok"'; then
            success "Health check passed ✓"
            curl -s "http://$MLX_HOST:$MLX_PORT/health" | jq . 2>/dev/null || curl -s "http://$MLX_HOST:$MLX_PORT/health"
        else
            error "Health check failed"
            return 1
        fi
    else
        warn "curl not available, cannot perform HTTP health check"
    fi
}

# Parse flags before command (supports: --foreground, --no-install, --no-wait, --timeout, --json)
ARGS=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        --foreground|-f) FOREGROUND=1; shift ;;
        --no-install) SKIP_INSTALL=1; shift ;;
        --no-wait) WAIT_HEALTH=0; shift ;;
        --timeout) WAIT_TIMEOUT="$2"; shift 2 ;;
        --json) JSON_STATUS=1; shift ;;
        --venv) VENV_PATH="$2"; shift 2 ;;
        --help|-h) ARGS+=(help); shift ;;
        start|stop|restart|status|logs|health|install) ARGS+=("$1"); shift ;;
        *) ARGS+=("$1"); shift ;;
    esac
done

set -- "${ARGS[@]:-start}"

# Trap cleanup for foreground mode
cleanup() {
    if [[ $FOREGROUND -eq 1 ]]; then
        log "Shutdown requested (signal)."
    fi
}
trap cleanup INT TERM

case "${1:-start}" in
    start)
        check_platform
        check_mlx_server
        setup_logging
        
        if check_running; then
            exit 0
        fi
        
        install_dependencies
        start_server
        ;;
    
    stop)
        stop_server
        ;;
    
    restart)
        stop_server
        sleep 1
        check_platform
        check_mlx_server
        setup_logging
        install_dependencies
        start_server
        ;;
    
    status)
        status_server
        ;;
    
    logs)
        show_logs "${2:-}"
        ;;
    
    health)
        health_check
        ;;
    
    install)
        check_platform
        check_mlx_server
        install_dependencies
        success "Dependencies installed"
        ;;
    
        *)
                cat <<EOF
Usage: $0 [flags] {start|stop|restart|status|logs|health|install}

Commands:
    start       Start the MLX server (default)
    stop        Stop the MLX server
    restart     Restart the MLX server
    status      Show server status (add --json for machine readable)
    logs        Show recent logs (use 'logs -f' to follow)
    health      Perform health check
    install     Install dependencies only

Flags:
    --foreground, -f   Run in foreground (no daemon, logs to stdout)
    --no-install       Skip dependency installation
    --no-wait          Do not wait for health on start
    --timeout <sec>    Override health wait timeout (default: $WAIT_TIMEOUT)
    --venv <path>      Custom virtual environment path
    --json             JSON output for status

Environment variables:
    MLX_HOST=$MLX_HOST
    MLX_PORT=$MLX_PORT
    EMBEDDINGS_MODEL=$EMBEDDINGS_MODEL
    EMBEDDINGS_DIM=$EMBEDDINGS_DIM
    MLX_VENV_PATH=$VENV_PATH
    MLX_WAIT_TIMEOUT=$WAIT_TIMEOUT

Examples:
    $0 start --no-wait
    $0 --foreground start
    $0 --venv ~/.cache/venvs/mlx-server restart
    $0 --json status
EOF
                exit 1
                ;;
esac
