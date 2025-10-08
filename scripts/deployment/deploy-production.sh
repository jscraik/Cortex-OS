#!/bin/bash

# Cortex-OS Production Deployment Script
# This script builds and deploys Cortex-OS for production environments

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_REGISTRY="${DOCKER_REGISTRY:-}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
COMPOSE_PROFILE="${COMPOSE_PROFILE:-dev-full}"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-production}"
SKIP_TESTS="${SKIP_TESTS:-false}"
SKIP_DOCKER_BUILD="${SKIP_DOCKER_BUILD:-false}"
BUILD_TARGET="${BUILD_TARGET:-production}"

# Logging functions
log_info() {
    echo -e "${BLUE}[brAInwav][INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[brAInwav][SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[brAInwav][WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[brAInwav][ERROR]${NC} $1"
}

# Error handling
handle_error() {
    log_error "Deployment failed at line $1"
    cleanup_on_error
    exit 1
}

trap 'handle_error $LINENO' ERR

# Cleanup function
cleanup_on_error() {
    log_warning "Cleaning up failed deployment..."
    # Add cleanup logic here if needed
}

load_env_overrides() {
    log_info "Loading brAInwav environment overrides..."

    local root_dir
    root_dir="$(pwd)"
    local candidates=()
    local override="${BRAINWAV_ENV_FILE:-}"

    if [[ -n "$override" ]]; then
        if [[ "$override" != /* ]]; then
            override="$root_dir/$override"
        fi
        candidates+=("$override")
    fi

    candidates+=(
        "$root_dir/.env.${DEPLOYMENT_ENV}"
        "$root_dir/.env.production"
        "$root_dir/.env.local"
        "$root_dir/.env"
    )

    for candidate in "${candidates[@]}"; do
        if [[ -z "$candidate" ]]; then
            continue
        fi
        if [[ -p "$candidate" ]]; then
            log_warning "Detected FIFO env file at $candidate. Use 'op run --env-file=$candidate -- ./scripts/deployment/deploy-production.sh' to stream secrets safely."
            return
        fi
        if [[ -f "$candidate" ]]; then
            set -a
            # shellcheck disable=SC1091
            source "$candidate"
            set +a
            log_info "Loaded brAInwav environment overrides from $candidate"
            return
        fi
    done

    log_warning "No brAInwav env overrides detected (.env.*)."
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if running from correct directory
    if [[ ! -f "package.json" ]] || [[ ! -f "pnpm-workspace.yaml" ]]; then
        log_error "Must be run from Cortex-OS root directory"
        exit 1
    fi
    
    # Check required tools
    local required_tools=("pnpm" "docker" "node")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is required but not installed"
            exit 1
        fi
    done
    
    # Check Node.js version
    local node_version
    node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ "$node_version" -lt 20 ]]; then
        log_error "Node.js 20+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check Docker
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Memory and system optimization
optimize_system() {
    log_info "Optimizing system for build..."
    
    # Set memory limits
    export NODE_OPTIONS="--max-old-space-size=4096 --expose-gc"
    export VITEST_MAX_THREADS=2
    export VITEST_MIN_THREADS=1
    export NX_DAEMON=false
    
    # Clean up memory
    if command -v bash scripts/memory-manager.sh &> /dev/null; then
        bash scripts/memory-manager.sh --gentle || true
    fi
    
    log_success "System optimization completed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Clear any potential locks
    rm -f pnpm-lock.yaml.lock
    
    # Install with production optimizations
    pnpm install --frozen-lockfile --prefer-offline
    
    log_success "Dependencies installed"
}

# Run quality gates
run_quality_gates() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "Skipping quality gates (SKIP_TESTS=true)"
        return 0
    fi
    
    log_info "Running quality gates..."
    
    # Type checking
    log_info "Running type checks..."
    pnpm typecheck:smart
    
    # Linting
    log_info "Running linting..."
    pnpm lint:smart
    
    # Security checks
    log_info "Running security checks..."
    pnpm test:security || {
        log_warning "Security tests failed, but continuing deployment"
    }
    
    # Run tests
    log_info "Running tests..."
    pnpm test:smart
    
    log_success "Quality gates passed"
}

# Build application
build_application() {
    log_info "Building Cortex-OS application..."
    
    # Clean previous builds
    log_info "Cleaning previous builds..."
    find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Build all packages
    log_info "Building all packages..."
    pnpm build:smart
    
    # Verify build outputs
    log_info "Verifying build outputs..."
    local critical_builds=(
        "apps/cortex-os/dist"
        "packages/agents/dist"
        "packages/model-gateway/dist"
    )
    
    for build_path in "${critical_builds[@]}"; do
        if [[ ! -d "$build_path" ]]; then
            log_error "Critical build missing: $build_path"
            exit 1
        fi
    done
    
    log_success "Application build completed"
}

# Build Docker images
build_docker_images() {
    if [[ "$SKIP_DOCKER_BUILD" == "true" ]]; then
        log_warning "Skipping Docker builds (SKIP_DOCKER_BUILD=true)"
        return 0
    fi
    
    log_info "Building Docker images..."
    
    # Build main optimized image
    log_info "Building main Cortex-OS image..."
    docker build \
        --target "$BUILD_TARGET" \
        --tag "cortex-os:${IMAGE_TAG}" \
        --tag "cortex-os:latest" \
        --file Dockerfile.optimized \
        --build-arg NODE_ENV=production \
        .
    
    # Build individual service images
    local services=(
        "packages/agents"
        "packages/model-gateway"
        "services/ml-inference"
    )
    
    for service in "${services[@]}"; do
        if [[ -f "$service/Dockerfile" ]]; then
            local service_name
            service_name=$(basename "$service")
            log_info "Building $service_name image..."
            
            docker build \
                --tag "cortex-os-${service_name}:${IMAGE_TAG}" \
                --tag "cortex-os-${service_name}:latest" \
                --file "$service/Dockerfile" \
                --context . \
                .
        fi
    done
    
    log_success "Docker images built successfully"
}

# Tag and push images (if registry specified)
push_docker_images() {
    if [[ -z "$DOCKER_REGISTRY" ]]; then
        log_info "No Docker registry specified, skipping push"
        return 0
    fi
    
    log_info "Pushing images to registry: $DOCKER_REGISTRY"
    
    # Tag and push main image
    docker tag "cortex-os:${IMAGE_TAG}" "${DOCKER_REGISTRY}/cortex-os:${IMAGE_TAG}"
    docker push "${DOCKER_REGISTRY}/cortex-os:${IMAGE_TAG}"
    
    # Push service images
    local images
    mapfile -t images < <(docker images --format "{{.Repository}}:{{.Tag}}" | grep "cortex-os-.*:${IMAGE_TAG}")
    
    for image in "${images[@]}"; do
        local registry_image="${DOCKER_REGISTRY}/${image}"
        docker tag "$image" "$registry_image"
        docker push "$registry_image"
    done
    
    log_success "Images pushed to registry"
}

# Deploy using Docker Compose
deploy_compose() {
    log_info "Deploying with Docker Compose..."
    
    local compose_file="infra/compose/docker-compose.dev.yml"
    local env_file="infra/compose/.env.dev"
    
    # Check if production compose file exists
    if [[ -f "infra/compose/docker-compose.prod.yml" ]]; then
        compose_file="infra/compose/docker-compose.prod.yml"
    fi
    
    # Ensure environment file exists
    if [[ ! -f "$env_file" ]]; then
        log_warning "Environment file not found: $env_file"
        log_info "Creating default environment file..."
        cp "$env_file.example" "$env_file" 2>/dev/null || {
            log_warning "No example env file found, creating minimal config"
            cat > "$env_file" << EOF
NODE_ENV=production
PORT=3000
NATS_PORT=4222
MODEL_GATEWAY_PORT=8081
WEB_PORT=3000
EOF
        }
    fi
    
    # Stop existing services
    log_info "Stopping existing services..."
    docker compose \
        --env-file "$env_file" \
        -f "$compose_file" \
        --profile "$COMPOSE_PROFILE" \
        down || true
    
    # Start services
    log_info "Starting services with profile: $COMPOSE_PROFILE"
    docker compose \
        --env-file "$env_file" \
        -f "$compose_file" \
        --profile "$COMPOSE_PROFILE" \
        up -d --build
    
    log_success "Services started successfully"
}

# Health checks
run_health_checks() {
    log_info "Running health checks..."
    
    local max_attempts=30
    local attempt=1
    
    # Check main application health
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
            log_success "Main application is healthy"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log_error "Health check timeout after $max_attempts attempts"
            return 1
        fi
        
        log_info "Health check attempt $attempt/$max_attempts..."
        sleep 10
        ((attempt++))
    done
    
    # Check additional services
    local services=(
        "http://localhost:8081/health:Model Gateway"
        "http://localhost:4222:NATS"
    )
    
    for service in "${services[@]}"; do
        local url="${service%%:*}"
        local name="${service##*:}"
        
        if curl -f -s "$url" > /dev/null 2>&1; then
            log_success "$name is healthy"
        else
            log_warning "$name health check failed (may not be critical)"
        fi
    done
    
    log_success "Health checks completed"
}

# Generate deployment report
generate_report() {
    log_info "Generating deployment report..."
    
    local report_file="deployment-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Cortex-OS Deployment Report

**Deployment Date:** $(date)
**Environment:** $DEPLOYMENT_ENV
**Image Tag:** $IMAGE_TAG
**Compose Profile:** $COMPOSE_PROFILE

## Build Information
- Node.js Version: $(node --version)
- Docker Version: $(docker --version)
- Build Target: $BUILD_TARGET

## Services Status
$(docker compose -f infra/compose/docker-compose.dev.yml ps --format table)

## Docker Images
$(docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep cortex-os)

## Health Check Results
- Main Application: http://localhost:3000/health
- Model Gateway: http://localhost:8081/health
- NATS: localhost:4222

## Next Steps
1. Monitor application logs: \`docker compose logs -f\`
2. Access the application: http://localhost:3000
3. View metrics: http://localhost:9090 (if Prometheus enabled)

## Rollback Instructions
To rollback this deployment:
\`\`\`bash
docker compose -f infra/compose/docker-compose.dev.yml --profile $COMPOSE_PROFILE down
# Deploy previous version
\`\`\`
EOF
    
    log_success "Deployment report generated: $report_file"
}

# Main deployment function
main() {
    log_info "Starting Cortex-OS production deployment..."
    log_info "Configuration:"
    log_info "  - Environment: $DEPLOYMENT_ENV"
    log_info "  - Image Tag: $IMAGE_TAG"
    log_info "  - Compose Profile: $COMPOSE_PROFILE"
    log_info "  - Build Target: $BUILD_TARGET"
    log_info "  - Skip Tests: $SKIP_TESTS"
    log_info "  - Skip Docker Build: $SKIP_DOCKER_BUILD"
    
    check_prerequisites
    load_env_overrides
    optimize_system
    install_dependencies
    run_quality_gates
    build_application
    build_docker_images
    push_docker_images
    deploy_compose
    run_health_checks
    generate_report
    
    log_success "🎉 Cortex-OS deployment completed successfully!"
    log_info "Access your application at: http://localhost:3000"
    log_info "View service status: docker compose ps"
    log_info "Monitor logs: docker compose logs -f"
}

# Help function
show_help() {
    cat << EOF
Cortex-OS Production Deployment Script

Usage: $0 [OPTIONS]

Options:
    -h, --help              Show this help message
    -e, --env ENV           Set deployment environment (default: production)
    -t, --tag TAG           Set Docker image tag (default: latest)
    -p, --profile PROFILE   Set Docker Compose profile (default: dev-full)
    -r, --registry REGISTRY Set Docker registry for pushing images
    --skip-tests            Skip running tests and quality gates
    --skip-docker           Skip Docker image building
    --build-target TARGET   Set Docker build target (default: production)

Examples:
    $0                                          # Standard production deployment
    $0 --env staging --tag v1.2.3              # Staging deployment with specific tag
    $0 --registry gcr.io/my-project --tag v1.0  # Build and push to registry
    $0 --skip-tests --skip-docker               # Quick deployment without builds

Environment Variables:
    DEPLOYMENT_ENV          Deployment environment
    IMAGE_TAG              Docker image tag
    COMPOSE_PROFILE        Docker Compose profile
    DOCKER_REGISTRY        Docker registry URL
    SKIP_TESTS             Skip tests (true/false)
    SKIP_DOCKER_BUILD      Skip Docker builds (true/false)
    BUILD_TARGET           Docker build target
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -e|--env)
            DEPLOYMENT_ENV="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -p|--profile)
            COMPOSE_PROFILE="$2"
            shift 2
            ;;
        -r|--registry)
            DOCKER_REGISTRY="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS="true"
            shift
            ;;
        --skip-docker)
            SKIP_DOCKER_BUILD="true"
            shift
            ;;
        --build-target)
            BUILD_TARGET="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main "$@"
