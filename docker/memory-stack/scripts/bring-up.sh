#!/bin/bash

# Cortex-OS Memory Stack Bring-up Script
# This script starts the stack and verifies all services are healthy

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.new.yml"
PROJECT_NAME="cortex-memory"

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    log_info "Docker is running ✓"
}

# Check if agent-toolkit tools exist in expected location
check_agent_toolkit() {
    local tools_dir="/Users/jamiecraik/.Cortex-OS/tools/agent-toolkit"

    if [[ ! -d "$tools_dir" ]]; then
        log_warn "Agent-toolkit directory not found at $tools_dir"
        log_warn "Creating symlink from repo fallback..."

        # Create parent directories
        mkdir -p "$(dirname "$tools_dir")"

        # Check if repo tools exist
        local repo_tools="../../../packages/agent-toolkit/tools"
        if [[ -d "$repo_tools" ]]; then
            # Create temporary symlink for demo
            ln -sf "$(realpath "$repo_tools")" "$tools_dir"
            log_info "Created symlink from repo tools ✓"
        else
            log_warn "No agent-toolkit tools found. Some MCP tools may not be available."
        fi
    else
        log_info "Agent-toolkit directory found at $tools_dir ✓"
    fi
}

# Bring up the stack
bring_up_stack() {
    log_info "Starting Cortex-OS Memory Stack..."

    # Use the new compose file
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d --build

    log_info "Stack started. Waiting for services to be healthy..."

    # Wait for services to be healthy
    local max_wait=120
    local wait_time=0

    while [[ $wait_time -lt $max_wait ]]; do
        local healthy=$(docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps --filter "status=healthy" --services | wc -l)
        local total=$(docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps --services | wc -l)

        if [[ $healthy -eq $total ]]; then
            log_info "All services are healthy! ✓"
            break
        fi

        log_info "Waiting for services... ($healthy/$total healthy)"
        sleep 5
        wait_time=$((wait_time + 5))
    done

    if [[ $wait_time -ge $max_wait ]]; then
        log_error "Timeout waiting for services to become healthy"
        docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps
        exit 1
    fi
}

# Verify service health
verify_health() {
    log_info "Verifying service health endpoints..."

    # Check Qdrant
    if curl -fsS http://localhost:6333/collections > /dev/null 2>&1; then
        log_info "✓ Qdrant is responding (http://localhost:6333)"
    else
        log_error "✗ Qdrant is not responding"
        return 1
    fi

    # Check Local Memory
    if curl -fsS http://localhost:3028/healthz > /dev/null 2>&1; then
        log_info "✓ Local Memory is responding (http://localhost:3028)"
    else
        log_error "✗ Local Memory is not responding"
        return 1
    fi

    # Check MCP Hub
    if curl -fsS http://localhost:9600/healthz > /dev/null 2>&1; then
        log_info "✓ MCP Hub is responding (http://localhost:9600)"
    else
        log_error "✗ MCP Hub is not responding"
        return 1
    fi

    # Check REST API (if enabled)
    if curl -fsS http://localhost:9700/healthz > /dev/null 2>&1; then
        log_info "✓ REST API is responding (http://localhost:9700)"
    else
        log_warn "⚠ REST API is not responding (may be disabled)"
    fi
}

# Verify MCP tools
verify_mcp_tools() {
    log_info "Verifying MCP tools are available..."

    # Check if MCP hub responds to tools/list
    local tools_response=$(curl -s -X POST http://localhost:9600/mcp \
        -H "Content-Type: application/json" \
        -d '{
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/list"
        }' 2>/dev/null || echo "")

    if [[ -n "$tools_response" ]]; then
        # Extract tool names
        local memory_tools=$(echo "$tools_response" | jq -r '.result.tools[].name' 2>/dev/null | grep '^memory\.' || echo "")
        local agent_tools=$(echo "$tools_response" | jq -r '.result.tools[].name' 2>/dev/null | grep '^agent_toolkit_' || echo "")

        if [[ -n "$memory_tools" ]]; then
            log_info "✓ Memory tools available:"
            echo "$memory_tools" | sed 's/^/  - /'
        else
            log_warn "⚠ No memory tools found"
        fi

        if [[ -n "$agent_tools" ]]; then
            log_info "✓ Agent-toolkit tools available:"
            echo "$agent_tools" | sed 's/^/  - /'
        else
            log_warn "⚠ No agent-toolkit tools found (check mount)"
        fi
    else
        log_error "✗ Could not retrieve MCP tools list"
    fi
}

# Test memory operations
test_memory_operations() {
    log_info "Testing basic memory operations..."

    # Test storing a memory
    local store_response=$(curl -s -X POST http://localhost:3028/api/v1/memory/store \
        -H "Content-Type: application/json" \
        -d '{
            "content": "Test memory from bring-up script",
            "importance": 5,
            "tags": ["test", "setup"],
            "domain": "system"
        }' 2>/dev/null || echo "")

    if [[ -n "$store_response" ]]; then
        local memory_id=$(echo "$store_response" | jq -r '.id' 2>/dev/null || echo "")
        if [[ -n "$memory_id" && "$memory_id" != "null" ]]; then
            log_info "✓ Memory stored successfully (ID: $memory_id)"

            # Test searching
            local search_response=$(curl -s -X POST http://localhost:3028/api/v1/memory/search \
                -H "Content-Type: application/json" \
                -d '{
                    "query": "test memory",
                    "limit": 5
                }' 2>/dev/null || echo "")

            if [[ -n "$search_response" ]]; then
                local results=$(echo "$search_response" | jq '. | length' 2>/dev/null || echo "0")
                if [[ "$results" -gt 0 ]]; then
                    log_info "✓ Memory search working (found $results results)"
                else
                    log_warn "⚠ Memory search returned no results"
                fi
            else
                log_error "✗ Memory search failed"
            fi
        else
            log_error "✗ Failed to store memory"
        fi
    else
        log_error "✗ Memory store request failed"
    fi
}

# Show service status
show_status() {
    log_info "Service Status:"
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps

    echo ""
    log_info "Service URLs:"
    echo "  - Qdrant Dashboard: http://localhost:6333/dashboard"
    echo "  - Local Memory API: http://localhost:3028"
    echo "  - MCP Hub (HTTP): http://localhost:9600"
    echo "  - REST API: http://localhost:9700"

    echo ""
    log_info "Useful Commands:"
    echo "  - View logs: docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f [service]"
    echo "  - Stop stack: docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME down"
    echo "  - Restart: docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME restart [service]"
}

# Main execution
main() {
    log_info "=== Cortex-OS Memory Stack Bring-up ==="

    check_docker
    check_agent_toolkit
    bring_up_stack

    echo ""
    log_info "=== Verifying Services ==="
    verify_health

    echo ""
    log_info "=== Verifying MCP Tools ==="
    verify_mcp_tools

    echo ""
    log_info "=== Testing Memory Operations ==="
    test_memory_operations

    echo ""
    show_status

    echo ""
    log_info "✓ Bring-up complete! The stack is ready to use."
}

# Run main function
main "$@"