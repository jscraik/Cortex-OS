#!/bin/bash

# A2A Protocol Server - OrbStack Deployment Script
# Deploys the A2A container to OrbStack with monitoring and health checks

set -euo pipefail

# Configuration
COMPOSE_FILE="orbstack.yml"
SERVICE_NAME="a2a"
HEALTH_CHECK_URL="http://localhost:3000/health"
MAX_WAIT_TIME=60

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Check if OrbStack is running
check_orbstack() {
    echo_info "Checking OrbStack status..."

    if ! docker info > /dev/null 2>&1; then
        echo_error "Docker/OrbStack is not running or accessible"
        echo_info "Please start OrbStack and try again"
        exit 1
    fi

    echo_info "OrbStack is running"
}

# Deploy the service
deploy_service() {
    echo_info "Deploying A2A Protocol Server to OrbStack..."

    # Stop existing services
    docker-compose -f "${COMPOSE_FILE}" down --remove-orphans 2>/dev/null || true

    # Build and start services
    docker-compose -f "${COMPOSE_FILE}" up -d --build

    echo_info "Service deployment initiated"
}

# Wait for service to be healthy
wait_for_health() {
    echo_info "Waiting for service to become healthy..."

    local wait_time=0
    while [ $wait_time -lt $MAX_WAIT_TIME ]; do
        if curl -f "${HEALTH_CHECK_URL}" > /dev/null 2>&1; then
            echo_info "Service is healthy!"
            return 0
        fi

        echo_debug "Waiting... (${wait_time}s/${MAX_WAIT_TIME}s)"
        sleep 5
        wait_time=$((wait_time + 5))
    done

    echo_error "Service health check timeout"
    return 1
}

# Test the deployed service
test_service() {
    echo_info "Testing deployed A2A Protocol Server..."

    # Test health endpoint
    echo_debug "Testing health endpoint..."
    health_response=$(curl -s "${HEALTH_CHECK_URL}")
    if echo "$health_response" | grep -q '"status":"healthy"'; then
        echo_info "✅ Health endpoint working"
    else
        echo_error "❌ Health endpoint failed"
        return 1
    fi

    # Test A2A protocol endpoint
    echo_debug "Testing A2A protocol endpoint..."
    a2a_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","id":"test-1","method":"tasks/send","params":{"message":{"role":"user","parts":[{"text":"Hello from OrbStack!"}]}}}' \
        http://localhost:3000/)

    if echo "$a2a_response" | grep -q '"jsonrpc":"2.0"'; then
        echo_info "✅ A2A protocol endpoint working"
    else
        echo_error "❌ A2A protocol endpoint failed"
        echo_debug "Response: $a2a_response"
        return 1
    fi

    echo_info "All tests passed!"
}

# Show service status and information
show_status() {
    echo_info "Service Status:"
    docker-compose -f "${COMPOSE_FILE}" ps

    echo ""
    echo_info "Service Information:"
    echo "🌐 Health Check: ${HEALTH_CHECK_URL}"
    echo "🤖 A2A Endpoint: http://localhost:3000/"
    echo "📊 OrbStack Dashboard: orbstack://containers"
    echo "🐳 Docker Logs: docker-compose -f ${COMPOSE_FILE} logs -f"

    echo ""
    echo_info "Quick Test Commands:"
    echo "  Health: curl ${HEALTH_CHECK_URL}"
    echo '  A2A Test: curl -X POST -H "Content-Type: application/json" \'
    echo '    -d '\''{"jsonrpc":"2.0","id":"1","method":"tasks/send","params":{"message":{"role":"user","parts":[{"text":"test"}]}}}'\'' \'
    echo '    http://localhost:3000/'
}

# Show logs
show_logs() {
    echo_info "Showing service logs (press Ctrl+C to exit)..."
    docker-compose -f "${COMPOSE_FILE}" logs -f
}

# Stop services
stop_service() {
    echo_info "Stopping A2A Protocol Server..."
    docker-compose -f "${COMPOSE_FILE}" down
    echo_info "Service stopped"
}

# Cleanup everything
cleanup() {
    echo_info "Cleaning up A2A Protocol Server deployment..."
    docker-compose -f "${COMPOSE_FILE}" down --volumes --remove-orphans
    docker system prune -f
    echo_info "Cleanup completed"
}

# Update service
update_service() {
    echo_info "Updating A2A Protocol Server..."
    docker-compose -f "${COMPOSE_FILE}" pull
    docker-compose -f "${COMPOSE_FILE}" up -d --force-recreate
    wait_for_health
    test_service
    echo_info "Service updated successfully"
}

# Main deployment process
deploy() {
    check_orbstack
    deploy_service

    if wait_for_health; then
        test_service
        show_status
        echo_info "🎉 A2A Protocol Server deployed successfully to OrbStack!"
    else
        echo_error "Deployment failed - service is not healthy"
        echo_info "Showing logs for debugging:"
        docker-compose -f "${COMPOSE_FILE}" logs --tail=50
        exit 1
    fi
}

# Handle script commands
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "test")
        test_service
        ;;
    "stop")
        stop_service
        ;;
    "cleanup")
        cleanup
        ;;
    "update")
        update_service
        ;;
    "restart")
        stop_service
        deploy
        ;;
    "help")
        echo "A2A Protocol Server - OrbStack Deployment Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy the service (default)"
        echo "  status   - Show service status and information"
        echo "  logs     - Show service logs (follow mode)"
        echo "  test     - Test the deployed service"
        echo "  stop     - Stop the service"
        echo "  restart  - Restart the service"
        echo "  update   - Update and restart the service"
        echo "  cleanup  - Stop and remove all containers and volumes"
        echo "  help     - Show this help message"
        ;;
    *)
        echo_error "Unknown command: $1"
        echo "Use '$0 help' for available commands"
        exit 1
        ;;
esac
