#!/bin/bash

# A2A Protocol Server - OrbStack Image Build Script
# Builds and deploys the A2A container image

set -euo pipefail

# Configuration
IMAGE_NAME="cortex-os/a2a-protocol"
VERSION="${VERSION:-1.0.0}"
PLATFORM="${PLATFORM:-linux/arm64,linux/amd64}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check dependencies
check_dependencies() {
    echo_info "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        echo_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v pnpm &> /dev/null; then
        echo_warn "pnpm is not installed, using npm instead"
    fi
    
    echo_info "Dependencies check passed"
}

# Run tests before building
run_tests() {
    echo_info "Running tests..."
    
    if command -v pnpm &> /dev/null; then
        pnpm test
    else
        npm test
    fi
    
    echo_info "Tests passed"
}

# Build the image
build_image() {
    echo_info "Building Docker image: ${IMAGE_NAME}:${VERSION}"
    
    # Build multi-platform image
    docker buildx build \
        --platform "${PLATFORM}" \
        --tag "${IMAGE_NAME}:${VERSION}" \
        --tag "${IMAGE_NAME}:latest" \
        --load \
        .
    
    echo_info "Image built successfully"
}

# Test the built image
test_image() {
    echo_info "Testing the built image..."
    
    # Start container in background
    docker run -d \
        --name a2a-test \
        --publish 3000:3000 \
        "${IMAGE_NAME}:${VERSION}"
    
    # Wait for container to start
    sleep 5
    
    # Test health endpoint
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo_info "Health check passed"
    else
        echo_error "Health check failed"
        docker logs a2a-test
        docker stop a2a-test && docker rm a2a-test
        exit 1
    fi
    
    # Test A2A protocol endpoint
    if curl -X POST \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","id":"1","method":"tasks/send","params":{"message":{"role":"user","parts":[{"text":"test"}]}}}' \
        http://localhost:3000/ > /dev/null 2>&1; then
        echo_info "A2A protocol test passed"
    else
        echo_error "A2A protocol test failed"
        docker logs a2a-test
        docker stop a2a-test && docker rm a2a-test
        exit 1
    fi
    
    # Cleanup test container
    docker stop a2a-test && docker rm a2a-test
    
    echo_info "Image testing completed successfully"
}

# Save image for OrbStack
save_image() {
    echo_info "Saving image for OrbStack..."
    
    docker save "${IMAGE_NAME}:${VERSION}" > "a2a-protocol-${VERSION}.tar"
    
    echo_info "Image saved as a2a-protocol-${VERSION}.tar"
    echo_info "Load in OrbStack with: docker load < a2a-protocol-${VERSION}.tar"
}

# Main execution
main() {
    echo_info "Starting A2A Protocol Server image build process..."
    
    check_dependencies
    run_tests
    build_image
    test_image
    save_image
    
    echo_info "Build process completed successfully!"
    echo_info "Image: ${IMAGE_NAME}:${VERSION}"
    echo_info ""
    echo_info "To run the image:"
    echo_info "  docker run -p 3000:3000 ${IMAGE_NAME}:${VERSION}"
    echo_info ""
    echo_info "Or use docker-compose:"
    echo_info "  docker-compose up"
    echo_info ""
    echo_info "Or use OrbStack:"
    echo_info "  docker-compose -f orbstack.yml up"
}

# Handle script arguments
case "${1:-build}" in
    "build")
        main
        ;;
    "test-only")
        check_dependencies
        run_tests
        ;;
    "build-only")
        check_dependencies
        build_image
        ;;
    "help")
        echo "Usage: $0 [build|test-only|build-only|help]"
        echo "  build      - Full build and test process (default)"
        echo "  test-only  - Run tests only"
        echo "  build-only - Build image only (no tests)"
        echo "  help       - Show this help message"
        ;;
    *)
        echo_error "Unknown command: $1"
        echo "Use '$0 help' for available commands"
        exit 1
        ;;
esac