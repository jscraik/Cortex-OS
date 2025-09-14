#!/bin/bash
set -euo pipefail

# Enhancements: selective service start, --fast (skip builds/install), propagate MLX flags, JSON status, follow logs, restart subset

# Cortex-OS Development Workflow Script
# Orchestrates the hybrid MLX (host-native) + Containers (OrbStack) workflow

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_DIR="$REPO_ROOT/infra/compose"
MLX_SCRIPT="$SCRIPT_DIR/start-mlx-host.sh"

# Defaults (overridable)
FAST_MODE=0
NO_INSTALL=0
SERVICES=() # if empty, start defaults
FOLLOW_LOGS=0
JSON_STATUS=0
MLX_FLAGS=()
WATCH_MODE=0

# Port definitions & tracking (overridable via environment vars)
PORT_API="${CORTEX_API_PORT:-8080}"
PORT_MLX="${CORTEX_MLX_PORT:-8081}"
PORT_WEBUI="${CORTEX_WEBUI_PORT:-3000}"
PORT_WARNED=0

check_port_free() {
    local port="$1" name="$2"
    if lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
        warn "Port $port ($name) already in use on host. Service startup may collide."
        PORT_WARNED=1
    fi
}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[Cortex-Dev]${NC} $1"; }
warn() { echo -e "${YELLOW}[Cortex-Dev WARN]${NC} $1"; }
error() { echo -e "${RED}[Cortex-Dev ERROR]${NC} $1" >&2; }
success() { echo -e "${GREEN}[Cortex-Dev]${NC} $1"; }
info() { echo -e "${CYAN}[Cortex-Dev INFO]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if on macOS
    if [[ "$(uname)" != "Darwin" ]]; then
        error "This development workflow is optimized for macOS with Apple Silicon"
        exit 1
    fi
    
    # Check Docker context
    if ! docker context inspect orbstack >/dev/null 2>&1; then
        warn "OrbStack context not found. Creating it..."
        docker context create orbstack --docker "host=unix:///var/run/docker.sock"
    fi
    
    # Set OrbStack as active context if not already
    local current_context
    current_context=$(docker context show 2>/dev/null || echo "unknown")
    if [[ "$current_context" != "orbstack" ]]; then
        log "Switching to OrbStack context..."
        docker context use orbstack
    fi
    
    # Verify OrbStack is running
    if ! docker info >/dev/null 2>&1; then
        error "Docker/OrbStack is not running. Please start OrbStack first."
        exit 1
    fi
    
    success "Prerequisites check passed ✓"
    # Non-fatal port warnings
    check_port_free "$PORT_MLX" "MLX"
    check_port_free "$PORT_API" "API"
    check_port_free "$PORT_WEBUI" "Web UI"
}

# Start MLX service on host
start_mlx_host() {
    log "Starting MLX embedding service on host..."
    
    if [[ ! -x "$MLX_SCRIPT" ]]; then
        error "MLX startup script not found or not executable: $MLX_SCRIPT"
        exit 1
    fi
    
    # Start MLX server
    "$MLX_SCRIPT" ${MLX_FLAGS[@]:-} start
    
    # Wait for MLX to be ready
    local max_wait=30
    local count=0
    while [[ $count -lt $max_wait ]]; do
        if "$MLX_SCRIPT" health >/dev/null 2>&1; then
            success "MLX service is ready ✓"
            return 0
        fi
        sleep 1
        ((count++))
        if [[ $((count % 5)) -eq 0 ]]; then
            log "Waiting for MLX service... ($count/$max_wait)"
        fi
    done
    
    error "MLX service failed to start within $max_wait seconds"
    "$MLX_SCRIPT" logs
    return 1
}

# Start containers
start_containers() {
    log "Starting containerized services..."
    cd "$COMPOSE_DIR"

    # Load environment
    if [[ -f ".env.dev" ]]; then
        log "Loading development environment from .env.dev"
        set -a; source .env.dev; set +a
    fi

    local default_core=(nats grafana loki tempo)
    local default_app=(model-gateway mcp-registry cortex-webui api)
    local targets=()
    if [[ ${#SERVICES[@]} -eq 0 ]]; then
        targets=("${default_core[@]}" "${default_app[@]}")
    else
        targets=("${SERVICES[@]}")
    fi

    log "Bringing up services: ${targets[*]}"
    docker compose -f docker-compose.dev.yml up -d "${targets[@]}"

    # Simple readiness helpers
    wait_service_http() {
        local name="$1" url="$2" timeout="${3:-40}" count=0
        log "Waiting for $name readiness ($url)..."
        while [[ $count -lt $timeout ]]; do
            if curl -fsS "$url" >/dev/null 2>&1; then
                success "$name ready ✓"
                return 0
            fi
            sleep 1; ((count++))
        done
        warn "$name readiness timeout after ${timeout}s"
        return 1
    }

    if printf '%s\n' "${targets[@]}" | grep -q '^nats$'; then
        log "Waiting for NATS to be ready..."
        local count=0
        while [[ $count -lt 20 ]]; do
            if docker compose -f docker-compose.dev.yml exec -T nats nats server check >/dev/null 2>&1; then
                success "NATS is ready ✓"
                break
            fi
            sleep 1; ((count++))
        done
    fi

    if printf '%s\n' "${targets[@]}" | grep -q '^api$'; then
        wait_service_http "API" "http://localhost:$PORT_API/health" 50 || true
    fi
    if printf '%s\n' "${targets[@]}" | grep -q '^model-gateway$'; then
        wait_service_http "Model Gateway" "http://localhost:$PORT_MLX/health" 50 || true
    fi

    success "Requested containers started ✓"
}

# Stop all services
stop_all() {
    log "Stopping all services..."
    
    # Stop containers
    cd "$COMPOSE_DIR"
    docker compose -f docker-compose.dev.yml down
    
    # Stop MLX host service
    "$MLX_SCRIPT" stop
    
    success "All services stopped ✓"
}

clean_all() {
    log "Cleaning all services, volumes, networks..."
    cd "$COMPOSE_DIR"
    docker compose -f docker-compose.dev.yml down -v || true
    "$MLX_SCRIPT" stop || true
    success "Clean completed"
}

# Show status of all services
show_status() {
    info "=== Cortex-OS Development Stack Status ==="
    echo
    
    # MLX Host Service
    info "MLX Host Service:"
    if [[ $JSON_STATUS -eq 1 ]]; then
        "$MLX_SCRIPT" --json status || true
    else
        "$MLX_SCRIPT" status || true
        echo
    fi
    
    # Container Services
    info "Container Services:"
    cd "$COMPOSE_DIR"
    if [[ $JSON_STATUS -eq 1 ]]; then
        # Gather MLX status JSON
        local mlx_json
        mlx_json=$("$MLX_SCRIPT" --json status 2>/dev/null || echo '{"running":false}')
        # Gather containers JSON (docker compose outputs an array already)
        local containers_json
        containers_json=$(docker compose -f docker-compose.dev.yml ps --format json 2>/dev/null || echo '[]')
        # Basic connectivity probes
        local connectivity='{}'
        if command -v curl >/dev/null 2>&1; then
            local mlx_ok=false api_ok=false gateway_ok=false web_ok=false
            curl -fsS "http://127.0.0.1:$PORT_MLX/health" >/dev/null 2>&1 && mlx_ok=true
            curl -fsS "http://localhost:$PORT_API/health" >/dev/null 2>&1 && api_ok=true
            curl -fsS "http://localhost:$PORT_MLX/health" >/dev/null 2>&1 && gateway_ok=true
            curl -fsS "http://localhost:$PORT_WEBUI" >/dev/null 2>&1 && web_ok=true
            connectivity=$(printf '{"mlx":%s,"api":%s,"modelGateway":%s,"webui":%s}' "$mlx_ok" "$api_ok" "$gateway_ok" "$web_ok")
        fi
        printf '{"ports":{"api":%s,"mlx":%s,"webui":%s},"mlx":%s,"containers":%s,"connectivity":%s}\n' \
            "$PORT_API" "$PORT_MLX" "$PORT_WEBUI" \
            "$mlx_json" "$containers_json" "$connectivity"
    else
        docker compose -f docker-compose.dev.yml ps --format table || warn "Could not get container status"
        echo
    fi
    
    # Quick connectivity test
    info "Connectivity Test:"
    
    # Test MLX service
    if command -v curl >/dev/null 2>&1; then
        if curl -s http://127.0.0.1:8081/health >/dev/null 2>&1; then
            success "✓ MLX service responding"
        else
            warn "✗ MLX service not responding"
        fi
        
        # Test model gateway (should be able to reach MLX via host.docker.internal)
        if curl -s http://localhost:8081/health >/dev/null 2>&1; then
            success "✓ Model Gateway responding"
        else
            warn "✗ Model Gateway not responding"
        fi
        
        # Test web UI
        if curl -s http://localhost:3000 >/dev/null 2>&1; then
            success "✓ Web UI responding"
        else
            warn "✗ Web UI not responding"
        fi
    fi
}

# Show logs for all services
show_logs() {
    local service="${1:-}"
    
    if [[ -n "$service" ]]; then
        case "$service" in
            mlx)
                "$MLX_SCRIPT" logs -f
                ;;
            *)
                cd "$COMPOSE_DIR"
                docker compose -f docker-compose.dev.yml logs -f "$service"
                ;;
        esac
    else
        info "Available log targets:"
        echo "  mlx              - MLX host service logs"
        echo "  nats             - NATS message broker"
        echo "  model-gateway    - Model gateway service"
        echo "  mcp-registry     - MCP registry service"
        echo "  cortex-webui     - Web UI"
        echo "  api              - API service"
        echo "  grafana          - Grafana monitoring"
        echo "  loki             - Loki log aggregation"
        echo "  tempo            - Tempo tracing"
        echo
        echo "Usage: $0 logs <service>"
        echo "   or: $0 logs          # Show all container logs"
        
        if [[ "${2:-}" != "--help" ]]; then
            echo
            log "Showing recent logs from all containers..."
            cd "$COMPOSE_DIR"
            docker compose -f docker-compose.dev.yml logs --tail=20
        fi
    fi
}

# Development setup
setup_dev() {
    log "Setting up development environment..."
    
    check_prerequisites
    
    # Install MLX dependencies
    log "Installing MLX dependencies..."
    "$MLX_SCRIPT" install
    
    # Build containers
    log "Building containers..."
    cd "$COMPOSE_DIR"
    docker compose -f docker-compose.dev.yml build
    
    success "Development environment setup complete ✓"
    info "You can now run: $0 start"
}

# Health check for entire stack
health_check() {
    log "Performing comprehensive health check..."
    
    local errors=0
    
    # Check MLX
    if "$MLX_SCRIPT" health >/dev/null 2>&1; then
        success "✓ MLX service healthy"
    else
        error "✗ MLX service unhealthy"
        ((errors++))
    fi
    
    # Check containers
    cd "$COMPOSE_DIR"
    local services=("nats" "model-gateway" "mcp-registry" "cortex-webui" "api")
    
    for service in "${services[@]}"; do
        if docker compose -f docker-compose.dev.yml ps "$service" --format json 2>/dev/null | jq -r '.[0].State' 2>/dev/null | grep -q "running"; then
            success "✓ $service running"
        else
            error "✗ $service not running"
            ((errors++))
        fi
    done
    
    # Test inter-service communication
    if command -v curl >/dev/null 2>&1; then
        # Test that containers can reach MLX via host.docker.internal
        log "Testing container -> MLX communication..."
        if docker compose -f docker-compose.dev.yml exec -T model-gateway curl -s http://host.docker.internal:8081/health >/dev/null 2>&1; then
            success "✓ Container -> MLX communication working"
        else
            error "✗ Container -> MLX communication failed"
            ((errors++))
        fi
    fi
    
    if [[ $errors -eq 0 ]]; then
        success "All health checks passed ✓"
        return 0
    else
        error "$errors health checks failed"
        return 1
    fi
}

# Parse flags (before command)
ARGS=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        --fast) FAST_MODE=1; shift ;;
        --no-install) NO_INSTALL=1; MLX_FLAGS+=(--no-install); shift ;;
        --services) shift; IFS=',' read -r -a SERVICES <<<"$1"; shift ;;
        --follow) FOLLOW_LOGS=1; shift ;;
        --json) JSON_STATUS=1; shift ;;
        --mlx-flag) shift; MLX_FLAGS+=("$1"); shift ;;
        --mlx-venv) shift; MLX_FLAGS+=(--venv "$1"); shift ;;
        --mlx-timeout) shift; MLX_FLAGS+=(--timeout "$1"); shift ;;
    --watch) WATCH_MODE=1; shift ;;
    start|stop|restart|status|logs|setup|health|mlx|clean|help|--help|-h) ARGS+=("$1"); shift ;;
        *) ARGS+=("$1"); shift ;;
    esac
done
set -- "${ARGS[@]:-help}"

command="${1:-help}"

case "$command" in
    start)
        check_prerequisites
        if [[ $FAST_MODE -eq 0 ]]; then
            start_mlx_host
        else
            log "FAST mode: assuming MLX already running or will be started externally"
            "$MLX_SCRIPT" status || start_mlx_host
        fi
        start_containers
        echo
        success "🚀 Cortex-OS development stack is running!"
        info "Access points:"
        info "  • Web UI:        http://localhost:3000"
        info "  • API:           http://localhost:8080"
        info "  • MLX Service:   http://localhost:8081"
        info "  • Model Gateway: http://localhost:8081"
        info "  • MCP Registry:  http://localhost:8082"
        info "  • Grafana:       http://localhost:3001"
        echo
        info "Use '$0 status' to check service health"
        info "Use '$0 logs <service>' to view logs"
    [[ $FOLLOW_LOGS -eq 1 ]] && { log "Attaching to logs (--follow)"; cd "$COMPOSE_DIR"; docker compose -f docker-compose.dev.yml logs -f; }
        if [[ $WATCH_MODE -eq 1 ]]; then
            if command -v fswatch >/dev/null 2>&1; then
                log "Starting watch mode (MLX server auto-restart on change)..."
                ( fswatch -o "$REPO_ROOT/services/py-mlx-server/src" 2>/dev/null | while read -r _; do
                    log "Change detected in MLX server sources; restarting MLX..."
                    "$MLX_SCRIPT" restart --no-install || warn "MLX restart failed"
                done ) &
                echo $! > "$REPO_ROOT/logs/cortex-dev-watch.pid"
            else
                warn "fswatch not found; watch mode disabled. Install via 'brew install fswatch'"
            fi
        fi
        ;;
    
    stop)
        stop_all
        ;;
    clean)
        clean_all
        ;;
    
    restart)
        stop_all
        sleep 2
        check_prerequisites
        start_mlx_host
        start_containers
        success "🔄 Cortex-OS development stack restarted!"
    [[ $FOLLOW_LOGS -eq 1 ]] && { log "Attaching to logs (--follow)"; cd "$COMPOSE_DIR"; docker compose -f docker-compose.dev.yml logs -f; }
        if [[ $WATCH_MODE -eq 1 ]]; then
            log "(Re)starting watch mode after restart..."
            if command -v fswatch >/dev/null 2>&1; then
                ( fswatch -o "$REPO_ROOT/services/py-mlx-server/src" 2>/dev/null | while read -r _; do
                    log "Change detected in MLX server sources; restarting MLX..."
                    "$MLX_SCRIPT" restart --no-install || warn "MLX restart failed"
                done ) &
                echo $! > "$REPO_ROOT/logs/cortex-dev-watch.pid"
            else
                warn "fswatch not found; watch mode disabled. Install via 'brew install fswatch'"
            fi
        fi
        ;;
    
    status)
        show_status
        ;;
    
    logs)
        show_logs "${2:-}" "${3:-}"
        ;;
    
    setup)
        setup_dev
        ;;
    
    health)
        health_check
        ;;
    
    mlx)
        # Pass through MLX commands
        shift
        "$MLX_SCRIPT" "$@"
        ;;
    
        help|--help|-h)
                cat <<EOF
Cortex-OS Development Workflow
==============================

Hybrid MLX (host-native) + Containers (OrbStack) orchestrator.

Commands:
    start        Start MLX (unless --fast) + selected containers
    stop         Stop all containers + MLX
    restart      Full restart
    status       Show status (add --json for machine output)
    logs [svc]   Show logs (default recent all; specify service to follow)
    setup        Initial dev setup (deps + build)
    health       Comprehensive health check
    mlx ...      Pass-through to MLX script

Flags (global):
    --fast             Skip MLX reinstall/build steps (assume ready)
    --no-install       Skip MLX dependency install (passes to MLX script)
    --services a,b,c    Only start listed services (comma-separated)
    --follow           After start, attach to logs (containers)
    --json             JSON status output (status command)
    --mlx-venv <path>  Custom MLX venv path
    --mlx-timeout <s>  MLX health timeout override
    --mlx-flag <flag>  Pass raw flag to MLX script (repeatable)

Examples:
    $0 setup
    $0 start --fast --services nats,model-gateway
    $0 logs model-gateway
    $0 status --json
    $0 mlx restart --no-install
EOF
        ;;
    
    *)
        error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
