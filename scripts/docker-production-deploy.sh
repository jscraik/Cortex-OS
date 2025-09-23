#!/bin/bash
# Docker Production Deployment Script
# Part of the Cortex-OS Production Orchestration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILES="-f docker/docker-compose.yml -f docker/docker-compose.prod.yml"
TIMEOUT=300  # 5 minutes in seconds
HEALTH_CHECK_INTERVAL=5

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

wait_for_service() {
    local service_name=$1
    local health_url=$2
    local start_time=$(date +%s)

    log_info "Waiting for $service_name to be healthy..."

    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [ $elapsed -gt $TIMEOUT ]; then
            log_error "Timeout waiting for $service_name"
            return 1
        fi

        if curl -f -s "$health_url" > /dev/null 2>&1; then
            log_success "$service_name is healthy after ${elapsed}s"
            return 0
        fi

        sleep $HEALTH_CHECK_INTERVAL
        echo -n "."
    done
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi

    # Check required files
    if [ ! -f "docker/docker-compose.yml" ]; then
        log_error "docker/docker-compose.yml not found"
        exit 1
    fi

    if [ ! -f "docker/docker-compose.prod.yml" ]; then
        log_error "docker/docker-compose.prod.yml not found"
        exit 1
    fi

    # Check Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        exit 1
    fi

    log_success "All prerequisites checked"
}

validate_configuration() {
    log_info "Validating Docker Compose configuration..."

    # Run validation tests
    if [ -x "tests/docker/compose-validation.test.sh" ]; then
        if ! ./tests/docker/compose-validation.test.sh; then
            log_error "Configuration validation failed"
            exit 1
        fi
    fi

    # Validate production configuration
    if ! docker compose $COMPOSE_FILES config --quiet; then
        log_error "Production configuration is invalid"
        exit 1
    fi

    log_success "Configuration is valid"
}

cleanup_old_deployment() {
    log_info "Cleaning up old deployment..."

    # Stop and remove old containers
    docker compose $COMPOSE_FILES down --remove-orphans

    # Clean up unused volumes (optional, uncomment with caution)
    # docker volume prune -f

    log_success "Cleanup completed"
}

deploy_services() {
    log_info "Deploying services..."

    # Pull latest images
    docker compose $COMPOSE_FILES pull --ignore-pull-failures

    # Build images that don't exist
    docker compose $COMPOSE_FILES build --no-cache

    # Start services
    docker compose $COMPOSE_FILES up -d

    log_success "Services deployed"
}

validate_deployment() {
    log_info "Validating deployment..."

    # Wait for core services to be healthy
    wait_for_service "Qdrant" "http://localhost:6333/health"
    wait_for_service "Neo4j" "http://localhost:7474/"
    wait_for_service "Jaeger" "http://localhost:16686/"
    wait_for_service "Prometheus" "http://localhost:9090/-/healthy"
    wait_for_service "Grafana" "http://localhost:3001/api/health"

    # Additional service checks
    log_info "Running additional service checks..."

    # Check Qdrant collections
    if curl -s "http://localhost:6333/collections" | jq -e '.result.collections' > /dev/null; then
        log_success "Qdrant API is responding"
    fi

    # Check Prometheus targets
    if curl -s "http://localhost:9090/api/v1/targets" | jq -e '.data.activeTargets' > /dev/null; then
        log_success "Prometheus is scraping targets"
    fi

    # Check Grafana datasources
    if curl -s "http://localhost:3001/api/health" | jq -e '.database' > /dev/null; then
        log_success "Grafana database is connected"
    fi

    log_success "All services validated"
}

show_access_info() {
    log_info "Service Access Information:"
    echo
    echo -e "${GREEN}=== Observability Stack ===${NC}"
    echo "Grafana:      http://localhost:3001 (admin/admin)"
    echo "Prometheus:   http://localhost:9090"
    echo "Jaeger:       http://localhost:16686"
    echo
    echo -e "${GREEN}=== Data Services ===${NC}"
    echo "Qdrant:       http://localhost:6333"
    echo "Neo4j:        http://localhost:7474 (neo4j/cortexproduction)"
    echo "Neo4j Bolt:   bolt://localhost:7687"
    echo
    echo -e "${GREEN}=== AI Services ===${NC}"
    echo "Ollama:       http://localhost:11434"
    echo
    echo -e "${GREEN}=== Management Commands ===${NC}"
    echo "View logs:    docker compose $COMPOSE_FILES logs -f [service]"
    echo "Stop all:     docker compose $COMPOSE_FILES down"
    echo "Restart:      docker compose $COMPOSE_FILES restart [service]"
    echo
}

main() {
    echo -e "${BLUE}=== Cortex-OS Docker Production Deployment ===${NC}"
    echo

    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            validate_configuration
            cleanup_old_deployment
            deploy_services
            validate_deployment
            show_access_info
            log_success "Deployment completed successfully!"
            ;;
        "validate")
            validate_configuration
            log_success "Configuration is valid"
            ;;
        "cleanup")
            cleanup_old_deployment
            log_success "Cleanup completed"
            ;;
        "logs")
            shift
            docker compose $COMPOSE_FILES logs -f "$@"
            ;;
        "status")
            docker compose $COMPOSE_FILES ps
            ;;
        "stop")
            docker compose $COMPOSE_FILES down
            log_success "Services stopped"
            ;;
        "restart")
            docker compose $COMPOSE_FILES restart "$@"
            log_success "Services restarted"
            ;;
        *)
            echo "Usage: $0 {deploy|validate|cleanup|logs|status|stop|restart}"
            echo
            echo "  deploy   - Full deployment pipeline"
            echo "  validate - Validate configuration only"
            echo "  cleanup  - Remove all containers and volumes"
            echo "  logs     - Show service logs"
            echo "  status   - Show service status"
            echo "  stop     - Stop all services"
            echo "  restart  - Restart services"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"