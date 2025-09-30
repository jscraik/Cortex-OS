#!/bin/bash
set -euo pipefail

# brAInwav Docker Development Environment Manager for Cortex-OS
# Provides Docker CLI helpers for starting, stopping, and inspecting the dev stack

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_DIR="$ROOT_DIR/infra/compose"
ENV_FILE="$COMPOSE_DIR/.env.dev"

# ANSI colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[brAInwav][INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[brAInwav][SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[brAInwav][WARN]${NC} $1"; }
log_error() { echo -e "${RED}[brAInwav][ERROR]${NC} $1"; }

check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker CLI not detected. Install Docker Desktop or Docker Engine before continuing."
        exit 1
    fi

    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is unavailable. Start Docker Desktop or ensure the Docker service is running."
        exit 1
    fi

    if ! docker compose version >/dev/null 2>&1; then
        log_error "Docker Compose v2 is required (docker compose). Please upgrade Docker to a supported version."
        exit 1
    fi

    log_success "Docker environment detected and ready for brAInwav Cortex-OS."
}

load_local_env() {
    if [[ -f "$ROOT_DIR/.env.local" ]]; then
        set -a
        # shellcheck disable=SC1091
        source "$ROOT_DIR/.env.local"
        set +a
        log_info "Loaded overrides from .env.local for brAInwav Docker workflow"
    fi
}

validate_environment() {
    local required_files=(
        "$COMPOSE_DIR/docker-compose.dev.yml"
        "$ENV_FILE"
    )

    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required file missing: $file"
            exit 1
        fi
    done

    log_success "Compose assets validated for brAInwav development workflows."
}

show_profiles() {
    cat <<'EOF'
Available brAInwav development profiles:

📦 Core Profiles:
  dev-min         - Minimal services (NATS, Model Gateway, Cortex-OS)
  dev-full        - Full development stack (adds MCP Registry and supporting services)

🎯 Specialized Profiles:
  web             - Web frontend
  api             - Python API backend
  workers         - Agent and background workers
  observability   - Monitoring stack (Grafana, Loki, Tempo, OTEL)

🚀 Combined Profiles:
  demo            - dev-full + web + observability

Examples:
  ./scripts/docker-dev.sh start dev-min
  ./scripts/docker-dev.sh start dev-full,observability
  ./scripts/docker-dev.sh start web,api
EOF
}

build_profile_args() {
    local raw_profiles="$1"
    local -n _result_ref="$2"
    _result_ref=()

    IFS=',' read -ra profile_array <<< "$raw_profiles"
    for profile in "${profile_array[@]}"; do
        if [[ -n "$profile" ]]; then
            _result_ref+=("--profile" "$profile")
        fi
    done
}

start_services() {
    local profiles="${1:-dev-min}"
    local profile_args=()

    log_info "Starting brAInwav Cortex-OS development stack"
    log_info "Profiles: $profiles"

    build_profile_args "$profiles" profile_args

    pushd "$ROOT_DIR" >/dev/null
    load_local_env
    docker compose \
        --env-file "$ENV_FILE" \
        -f "$COMPOSE_DIR/docker-compose.dev.yml" \
        "${profile_args[@]}" \
        up --build -d
    popd >/dev/null

    log_success "Services started. Use profiles command to review available targets."
    show_status
}

stop_services() {
    log_info "Stopping brAInwav Cortex-OS development stack"

    pushd "$ROOT_DIR" >/dev/null
    load_local_env
    docker compose \
        --env-file "$ENV_FILE" \
        -f "$COMPOSE_DIR/docker-compose.dev.yml" \
        down
    popd >/dev/null

    log_success "Services stopped successfully."
}

show_status() {
    log_info "Current Docker Compose status"

    pushd "$ROOT_DIR" >/dev/null
    load_local_env
    docker compose \
        --env-file "$ENV_FILE" \
        -f "$COMPOSE_DIR/docker-compose.dev.yml" \
        ps
    popd >/dev/null

    cat <<'EOF'

brAInwav service endpoints:
  Cortex-OS Runtime:     http://localhost:3000
  Web UI (Grafana):      http://localhost:3001
  Model Gateway API:     http://localhost:8081
  MCP Registry API:      http://localhost:8082
  Python API Backend:    http://localhost:8080
  NATS Dashboard:        http://localhost:8222
  Loki Logs:             http://localhost:3100
  Tempo Traces:          http://localhost:3200
  OpenTelemetry OTLP:    http://localhost:4318
EOF
}

show_logs() {
    local service="${1:-}"

    pushd "$ROOT_DIR" >/dev/null
    load_local_env
    if [[ -z "$service" ]]; then
        docker compose \
            --env-file "$ENV_FILE" \
            -f "$COMPOSE_DIR/docker-compose.dev.yml" \
            logs -f
    else
        docker compose \
            --env-file "$ENV_FILE" \
            -f "$COMPOSE_DIR/docker-compose.dev.yml" \
            logs -f "$service"
    fi
    popd >/dev/null
}

cleanup() {
    local deep="${1:-false}"

    log_info "Cleaning up Docker resources for brAInwav Cortex-OS"
    stop_services || true

    if [[ "$deep" == "true" ]]; then
        log_warning "Performing deep cleanup (removes all images and volumes)."
        docker system prune -a -f
        log_success "Deep cleanup completed."
    else
        docker volume prune -f
        log_success "Volume cleanup completed."
    fi
}

exec_service() {
    local service="$1"
    shift
    local cmd=("$@")

    if [[ "${#cmd[@]}" -eq 0 ]]; then
        cmd=("/bin/sh")
    fi

    log_info "Executing in $service: ${cmd[*]}"

    pushd "$ROOT_DIR" >/dev/null
    load_local_env
    docker compose \
        --env-file "$ENV_FILE" \
        -f "$COMPOSE_DIR/docker-compose.dev.yml" \
        exec "$service" "${cmd[@]}"
    popd >/dev/null
}

show_help() {
    cat <<'EOF'
brAInwav Docker Development Environment Manager

Usage: ./scripts/docker-dev.sh <command> [options]

Commands:
  start [profiles]    Start services with comma-separated profiles (default: dev-min)
  stop                Stop all services
  restart [profiles]  Restart using provided profiles
  status|ps           Show compose status and endpoints
  logs [service]      Tail logs for all services or a specific service
  exec <service> [cmd] Execute a command within a service container
  cleanup [deep]      Stop services and prune volumes (deep=true prunes images)
  profiles            Display available profiles
  help                Display this message

Examples:
  ./scripts/docker-dev.sh start dev-full,observability
  ./scripts/docker-dev.sh logs cortex-os
  ./scripts/docker-dev.sh exec model-gateway pnpm test

All output is brAInwav-branded for observability alignment.
EOF
}

main() {
    local command="${1:-help}"
    case "$command" in
        start)
            check_docker
            validate_environment
            start_services "${2:-dev-min}"
            ;;
        stop)
            check_docker
            stop_services
            ;;
        restart)
            check_docker
            validate_environment
            stop_services
            start_services "${2:-dev-min}"
            ;;
        status|ps)
            check_docker
            show_status
            ;;
        logs)
            check_docker
            show_logs "${2:-}"
            ;;
        exec)
            check_docker
            if [[ -z "${2:-}" ]]; then
                log_error "Specify a service name to exec into."
                exit 1
            fi
            local service="$2"
            shift 2
            exec_service "$service" "$@"
            ;;
        cleanup)
            check_docker
            cleanup "${2:-false}"
            ;;
        profiles)
            show_profiles
            ;;
        help|*)
            show_help
            ;;
    esac
}

main "$@"
