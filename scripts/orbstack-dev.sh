#!/bin/bash
set -euo pipefail

# OrbStack Development Environment Manager for Cortex-OS
# Manages containerized development workflow with optimized configurations

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_DIR="$ROOT_DIR/infra/compose"
ENV_FILE="$COMPOSE_DIR/.env.dev"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if OrbStack is running
check_orbstack() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not available. Please ensure OrbStack is installed and running."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start OrbStack."
        exit 1
    fi

    # Check if this is OrbStack
    if docker version 2>/dev/null | grep -q "orbstack"; then
        log_success "OrbStack detected and running"
    else
        log_warning "OrbStack not detected. Some optimizations may not work."
    fi
}

# Validate environment
validate_environment() {
    local required_files=(
        "$COMPOSE_DIR/docker-compose.dev.yml"
        "$ENV_FILE"
    )

    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required file not found: $file"
            exit 1
        fi
    done

    log_success "Environment validation passed"
}

# Show available profiles
show_profiles() {
    cat << EOF
Available development profiles:

📦 Core Profiles:
  dev-min         - Minimal services (NATS, Model Gateway, Cortex-OS)
  dev-full        - Full development stack (all services)

🎯 Specialized Profiles:
  web             - Web frontend services
  api             - API and backend services
  workers         - Background workers and agents
  observability   - Monitoring stack (Grafana, Loki, Tempo)
  tools           - Development tools (Codex CLI, TUI)
  ml              - Machine learning services
  mcp             - Model Context Protocol services

🚀 Combined Profiles:
  demo            - Full demo environment (dev-full + web + observability)

Usage examples:
  $0 start dev-min                    # Start minimal development environment
  $0 start dev-full,observability     # Start full dev + monitoring
  $0 start web,api                    # Start web and API services only
EOF
}

# Start services with specified profiles
start_services() {
    local profiles="${1:-dev-min}"

    log_info "Starting OrbStack development environment..."
    log_info "Profiles: $profiles"

    # Convert comma-separated profiles to --profile flags
    local profile_flags=""
    IFS=',' read -ra PROFILE_ARRAY <<< "$profiles"
    for profile in "${PROFILE_ARRAY[@]}"; do
        profile_flags+="--profile $profile "
    done

    # Start services
    cd "$ROOT_DIR"
    docker compose \
        --env-file "$ENV_FILE" \
        -f "$COMPOSE_DIR/docker-compose.dev.yml" \
        -f "$COMPOSE_DIR/orbstack.yml" \
        $profile_flags \
        up --build -d

    log_success "Services started successfully!"

    # Show service status
    show_status
}

# Stop services
stop_services() {
    log_info "Stopping OrbStack development environment..."

    cd "$ROOT_DIR"
    docker compose \
        --env-file "$ENV_FILE" \
        -f "$COMPOSE_DIR/docker-compose.dev.yml" \
        -f "$COMPOSE_DIR/orbstack.yml" \
        down

    log_success "Services stopped successfully!"
}

# Show service status
show_status() {
    log_info "Service Status:"

    cd "$ROOT_DIR"
    docker compose \
        --env-file "$ENV_FILE" \
        -f "$COMPOSE_DIR/docker-compose.dev.yml" \
        -f "$COMPOSE_DIR/orbstack.yml" \
        ps

    echo
    log_info "Available endpoints:"
    cat << EOF
🌐 Web Services:
  Cortex-OS Runtime:    http://localhost:3000
  Web UI:               http://localhost:3001
  Grafana:              http://localhost:3001 (admin/admin)

🔧 API Services:
  Model Gateway:        http://localhost:8081
  MCP Registry:         http://localhost:8082
  Python ML:            http://localhost:8005
  Cortex Code MCP:      http://localhost:8004

📊 Observability:
  NATS Management:      http://localhost:8222
  Loki:                 http://localhost:3100
  Tempo:                http://localhost:3200
  OpenTelemetry:        http://localhost:4318
EOF
}

# Show logs for specified services
show_logs() {
    local service="${1:-}"

    cd "$ROOT_DIR"

    if [[ -z "$service" ]]; then
        docker compose \
            --env-file "$ENV_FILE" \
            -f "$COMPOSE_DIR/docker-compose.dev.yml" \
            -f "$COMPOSE_DIR/orbstack.yml" \
            logs -f
    else
        docker compose \
            --env-file "$ENV_FILE" \
            -f "$COMPOSE_DIR/docker-compose.dev.yml" \
            -f "$COMPOSE_DIR/orbstack.yml" \
            logs -f "$service"
    fi
}

# Clean up volumes and images
cleanup() {
    local deep="${1:-false}"

    log_info "Cleaning up OrbStack environment..."

    # Stop services first
    stop_services

    # Remove volumes
    if [[ "$deep" == "true" ]]; then
        log_warning "Performing deep cleanup (this will remove all data)..."
        docker volume prune -f
        docker image prune -a -f
        log_success "Deep cleanup completed"
    else
        log_info "Removing unused volumes..."
        docker volume prune -f
        log_success "Basic cleanup completed"
    fi
}

# Execute command in service container
exec_service() {
    local service="$1"
    shift
    local cmd=("$@")

    if [[ ${#cmd[@]} -eq 0 ]]; then
        cmd=("/bin/sh")
    fi

    log_info "Executing command in $service: ${cmd[*]}"

    cd "$ROOT_DIR"
    docker compose \
        --env-file "$ENV_FILE" \
        -f "$COMPOSE_DIR/docker-compose.dev.yml" \
        -f "$COMPOSE_DIR/orbstack.yml" \
        exec "$service" "${cmd[@]}"
}

# Main command handler
main() {
    case "${1:-help}" in
        "start")
            check_orbstack
            validate_environment
            start_services "${2:-dev-min}"
            ;;
        "stop")
            check_orbstack
            stop_services
            ;;
        "restart")
            check_orbstack
            validate_environment
            stop_services
            start_services "${2:-dev-min}"
            ;;
        "status"|"ps")
            check_orbstack
            show_status
            ;;
        "logs")
            check_orbstack
            show_logs "${2:-}"
            ;;
        "exec")
            check_orbstack
            if [[ -z "${2:-}" ]]; then
                log_error "Please specify a service name"
                exit 1
            fi
            exec_service "${2}" "${@:3}"
            ;;
        "cleanup")
            check_orbstack
            cleanup "${2:-false}"
            ;;
        "profiles")
            show_profiles
            ;;
        "help"|*)
            cat << EOF
OrbStack Development Environment Manager for Cortex-OS

Usage: $0 <command> [options]

Commands:
  start [profile]     Start development environment with specified profile(s)
  stop                Stop all services
  restart [profile]   Restart with specified profile(s)
  status              Show service status and endpoints
  logs [service]      Show logs (all services or specific service)
  exec <service> [cmd] Execute command in service container
  cleanup [deep]      Clean up volumes and images (deep=true for full cleanup)
  profiles            Show available profiles
  help                Show this help message

Examples:
  $0 start dev-min                    # Start minimal development environment
  $0 start dev-full,observability     # Start full dev + monitoring
  $0 logs cortex-os                   # Show logs for cortex-os service
  $0 exec cortex-code-cli codex --version  # Run codex command
  $0 cleanup deep                     # Deep cleanup of all data

For more information, see docs/orbstack-setup.md
EOF
            ;;
    esac
}

# Run main function with all arguments
main "$@"
