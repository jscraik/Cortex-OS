#!/bin/bash
set -euo pipefail

# OrbStack Development Environment Validation Script
# Validates that the OrbStack environment is properly configured and ready for development

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Validation results
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; PASSED_TESTS=$((PASSED_TESTS + 1)); }
log_warning() { echo -e "${YELLOW}[⚠]${NC} $1"; WARNING_TESTS=$((WARNING_TESTS + 1)); }
log_error() { echo -e "${RED}[✗]${NC} $1"; FAILED_TESTS=$((FAILED_TESTS + 1)); }
log_section() { echo -e "\n${CYAN}=== $1 ===${NC}"; }

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate Docker/OrbStack installation
validate_docker_orbstack() {
    log_section "Docker & OrbStack Validation"
    
    # Check if Docker is installed
    if command_exists docker; then
        log_success "Docker is installed"
        
        # Check Docker version
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        log_info "Docker version: $DOCKER_VERSION"
        
        # Check if Docker daemon is running
        if docker info >/dev/null 2>&1; then
            log_success "Docker daemon is running"
            
            # Check if this is OrbStack
            if docker version 2>/dev/null | grep -q "orbstack"; then
                log_success "OrbStack is detected and running"
                
                # Get OrbStack version if possible
                ORBSTACK_VERSION=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
                log_info "OrbStack version: $ORBSTACK_VERSION"
            else
                log_warning "OrbStack not detected - using standard Docker"
                log_warning "Some OrbStack-specific optimizations may not work"
            fi
            
            # Check Docker Buildkit
            if docker buildx version >/dev/null 2>&1; then
                log_success "Docker Buildx is available"
            else
                log_warning "Docker Buildx not available - multi-platform builds may fail"
            fi
        else
            log_error "Docker daemon is not running - please start OrbStack"
        fi
    else
        log_error "Docker is not installed - please install OrbStack"
    fi
}

# Validate required files and directories
validate_project_structure() {
    log_section "Project Structure Validation"
    
    local required_files=(
        "infra/compose/docker-compose.dev.yml"
        "infra/compose/.env.dev"
        "infra/compose/orbstack.yml"
        "scripts/orbstack-dev.sh"
        "docs/orbstack-setup.md"
        ".orbstack/config.yaml"
    )
    
    local required_dirs=(
        "apps/cortex-os"
        "apps/cortex-codex"
        "apps/cortex-py"
        "packages"
        "infra/compose"
        "infra/monitoring"
    )
    
    # Check required files
    for file in "${required_files[@]}"; do
        if [[ -f "$ROOT_DIR/$file" ]]; then
            log_success "Found required file: $file"
        else
            log_error "Missing required file: $file"
        fi
    done
    
    # Check required directories
    for dir in "${required_dirs[@]}"; do
        if [[ -d "$ROOT_DIR/$dir" ]]; then
            log_success "Found required directory: $dir"
        else
            log_error "Missing required directory: $dir"
        fi
    done
    
    # Check if orbstack-dev.sh is executable
    if [[ -x "$ROOT_DIR/scripts/orbstack-dev.sh" ]]; then
        log_success "orbstack-dev.sh is executable"
    else
        log_error "orbstack-dev.sh is not executable - run: chmod +x scripts/orbstack-dev.sh"
    fi
}

# Validate Docker configurations
validate_docker_configs() {
    log_section "Docker Configuration Validation"
    
    local dockerfile_locations=(
        "apps/cortex-os/Dockerfile"
        "apps/cortex-codex/Dockerfile"
        "apps/cortex-py/Dockerfile"
        "packages/model-gateway/Dockerfile"
        "packages/agents/Dockerfile"
        "packages/mcp/Dockerfile"
    )
    
    for dockerfile in "${dockerfile_locations[@]}"; do
        if [[ -f "$ROOT_DIR/$dockerfile" ]]; then
            log_success "Found Dockerfile: $dockerfile"
            
            # Check for OrbStack-specific optimizations
            if grep -q "orbstack.optimize" "$ROOT_DIR/$dockerfile" 2>/dev/null; then
                log_success "  → Contains OrbStack optimizations"
            else
                log_warning "  → Missing OrbStack optimization labels"
            fi
            
            # Check for multi-platform support
            if grep -q "\--platform=\$BUILDPLATFORM" "$ROOT_DIR/$dockerfile" 2>/dev/null; then
                log_success "  → Multi-platform build support enabled"
            else
                log_warning "  → Missing multi-platform build support"
            fi
        else
            log_error "Missing Dockerfile: $dockerfile"
        fi
    done
}

# Validate Node.js/pnpm environment
validate_node_environment() {
    log_section "Node.js Environment Validation"
    
    if command_exists node; then
        NODE_VERSION=$(node --version)
        log_success "Node.js is installed: $NODE_VERSION"
        
        # Check Node version is >= 20
        NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1 | cut -d'v' -f2)
        if [[ "$NODE_MAJOR" -ge 20 ]]; then
            log_success "Node.js version is compatible (>= 20)"
        else
            log_error "Node.js version is too old (< 20) - please upgrade"
        fi
    else
        log_warning "Node.js not installed locally - will use containerized version"
    fi
    
    if command_exists pnpm; then
        PNPM_VERSION=$(pnpm --version)
        log_success "pnpm is installed: $PNPM_VERSION"
    else
        log_warning "pnpm not installed locally - will use containerized version"
    fi
    
    # Check package.json
    if [[ -f "$ROOT_DIR/package.json" ]]; then
        log_success "Found package.json"
        
        # Check for OrbStack scripts
        if grep -q "dev:orbstack" "$ROOT_DIR/package.json"; then
            log_success "OrbStack development scripts are configured"
        else
            log_warning "OrbStack development scripts not found in package.json"
        fi
    else
        log_error "Missing package.json"
    fi
}

# Validate Rust environment (for codex)
validate_rust_environment() {
    log_section "Rust Environment Validation"
    
    if command_exists cargo; then
        CARGO_VERSION=$(cargo --version | cut -d' ' -f2)
        log_success "Cargo is installed: $CARGO_VERSION"
        
        # Check if codex project exists
        if [[ -f "$ROOT_DIR/apps/cortex-codex/Cargo.toml" ]]; then
            log_success "Found Cortex Codex Cargo.toml"
            
            # Check workspace configuration
            if grep -q "workspace" "$ROOT_DIR/apps/cortex-codex/Cargo.toml"; then
                log_success "Workspace configuration detected"
            fi
        else
            log_error "Missing Cortex Codex Cargo.toml"
        fi
    else
        log_warning "Cargo not installed locally - will use containerized version"
    fi
}

# Validate Python environment
validate_python_environment() {
    log_section "Python Environment Validation"
    
    if command_exists python3; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        log_success "Python3 is installed: $PYTHON_VERSION"
        
        # Check Python version is >= 3.12
        PYTHON_MAJOR=$(echo "$PYTHON_VERSION" | cut -d'.' -f1)
        PYTHON_MINOR=$(echo "$PYTHON_VERSION" | cut -d'.' -f2)
        if [[ "$PYTHON_MAJOR" -eq 3 && "$PYTHON_MINOR" -ge 12 ]]; then
            log_success "Python version is compatible (>= 3.12)"
        else
            log_warning "Python version may be incompatible (< 3.12)"
        fi
        
        # Check for uv
        if command_exists uv; then
            UV_VERSION=$(uv --version | cut -d' ' -f2)
            log_success "uv is installed: $UV_VERSION"
        else
            log_warning "uv not installed locally - will use containerized version"
        fi
    else
        log_warning "Python3 not installed locally - will use containerized version"
    fi
    
    # Check pyproject.toml files
    if [[ -f "$ROOT_DIR/apps/cortex-py/pyproject.toml" ]]; then
        log_success "Found Cortex Python pyproject.toml"
    else
        log_error "Missing Cortex Python pyproject.toml"
    fi
}

# Test Docker Compose configuration
validate_compose_config() {
    log_section "Docker Compose Configuration Test"
    
    cd "$ROOT_DIR"
    
    # Test compose file syntax
    if docker compose -f infra/compose/docker-compose.dev.yml config >/dev/null 2>&1; then
        log_success "Main compose file syntax is valid"
    else
        log_error "Main compose file has syntax errors"
    fi
    
    if docker compose -f infra/compose/orbstack.yml config >/dev/null 2>&1; then
        log_success "OrbStack compose file syntax is valid"
    else
        log_error "OrbStack compose file has syntax errors"
    fi
    
    # Test combined configuration
    if docker compose \
        --env-file infra/compose/.env.dev \
        -f infra/compose/docker-compose.dev.yml \
        -f infra/compose/orbstack.yml \
        config >/dev/null 2>&1; then
        log_success "Combined compose configuration is valid"
    else
        log_error "Combined compose configuration has errors"
    fi
}

# Test network connectivity and ports
validate_network_ports() {
    log_section "Network and Port Validation"
    
    local required_ports=(3000 8081 8082 4222 8222)
    
    for port in "${required_ports[@]}"; do
        if lsof -i ":$port" >/dev/null 2>&1; then
            log_warning "Port $port is already in use"
        else
            log_success "Port $port is available"
        fi
    done
}

# Test OrbStack-specific features
validate_orbstack_features() {
    log_section "OrbStack Feature Validation"
    
    # Test multi-platform build capability
    if docker buildx ls | grep -q "linux/arm64.*linux/amd64" 2>/dev/null; then
        log_success "Multi-platform build support is available"
    else
        log_warning "Multi-platform build support may be limited"
    fi
    
    # Test BuildKit
    if docker info | grep -q "BuildKit" 2>/dev/null; then
        log_success "BuildKit is enabled"
    else
        log_warning "BuildKit is not enabled - set DOCKER_BUILDKIT=1"
    fi
    
    # Check for OrbStack config file
    if [[ -f "$ROOT_DIR/.orbstack/config.yaml" ]]; then
        log_success "OrbStack configuration file exists"
    else
        log_warning "OrbStack configuration file missing"
    fi
    
    # Test volume mount performance
    log_info "Testing volume mount performance..."
    if docker run --rm -v "$ROOT_DIR:/test:ro" alpine:latest test -r "/test/package.json" 2>/dev/null; then
        log_success "Volume mounts are working correctly"
    else
        log_error "Volume mounts are not working"
    fi
}

# Run a quick integration test
run_integration_test() {
    log_section "Integration Test"
    
    log_info "Running quick integration test..."
    
    # Try to build a simple test image
    cat > /tmp/test-dockerfile << 'EOF'
FROM alpine:latest
RUN echo "OrbStack test successful"
CMD ["echo", "Hello from OrbStack!"]
EOF
    
    if docker build -t orbstack-test -f /tmp/test-dockerfile /tmp >/dev/null 2>&1; then
        log_success "Test image build successful"
        
        # Try to run the test container
        if docker run --rm orbstack-test 2>/dev/null | grep -q "Hello from OrbStack"; then
            log_success "Test container execution successful"
        else
            log_error "Test container execution failed"
        fi
        
        # Clean up test image
        docker rmi orbstack-test >/dev/null 2>&1 || true
    else
        log_error "Test image build failed"
    fi
    
    # Clean up test dockerfile
    rm -f /tmp/test-dockerfile
}

# Print validation summary
print_summary() {
    log_section "Validation Summary"
    
    local total_tests=$((PASSED_TESTS + FAILED_TESTS + WARNING_TESTS))
    
    echo -e "Total tests run: $total_tests"
    echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
    echo -e "${YELLOW}Warnings: $WARNING_TESTS${NC}"
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
    
    echo
    if [[ $FAILED_TESTS -eq 0 ]]; then
        if [[ $WARNING_TESTS -eq 0 ]]; then
            log_success "🎉 All validations passed! Your OrbStack environment is ready."
            echo -e "\nYou can now start development with:"
            echo -e "  ${CYAN}./scripts/orbstack-dev.sh start dev-min${NC}"
        else
            log_warning "⚠️  Environment is mostly ready with some warnings."
            echo -e "\nYou can start development, but consider addressing the warnings above."
            echo -e "  ${CYAN}./scripts/orbstack-dev.sh start dev-min${NC}"
        fi
    else
        log_error "❌ Environment validation failed."
        echo -e "\nPlease fix the errors above before starting development."
        echo -e "See ${CYAN}docs/orbstack-setup.md${NC} for detailed setup instructions."
    fi
    
    # Exit with appropriate code
    if [[ $FAILED_TESTS -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

# Main execution
main() {
    echo -e "${CYAN}"
    cat << 'EOF'
  ____       _     ____  _             _    
 / __ \     | |   / ___|| |_ __ _  ___| | __
| |  | |_ __| |__ \___ \| __/ _` |/ __| |/ /
| |__| | '__|  _ \ ___) | || (_| | (__|   < 
 \____/|_|  |_.__/____/ \__\__,_|\___|_|\_\
                                           
Environment Validation Tool
EOF
    echo -e "${NC}"
    
    validate_docker_orbstack
    validate_project_structure
    validate_docker_configs
    validate_node_environment
    validate_rust_environment
    validate_python_environment
    validate_compose_config
    validate_network_ports
    validate_orbstack_features
    run_integration_test
    print_summary
}

# Parse command line arguments
case "${1:-validate}" in
    "validate"|"")
        main
        ;;
    "quick")
        validate_docker_orbstack
        validate_compose_config
        run_integration_test
        print_summary
        ;;
    "help")
        cat << EOF
OrbStack Environment Validation Script

Usage: $0 [command]

Commands:
  validate    Run full environment validation (default)
  quick       Run quick validation (Docker + Compose + Integration test)
  help        Show this help message

Examples:
  $0              # Run full validation
  $0 quick        # Run quick validation
  $0 validate     # Run full validation explicitly
EOF
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac