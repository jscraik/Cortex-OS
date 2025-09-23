#!/bin/bash
# Docker Compose Configuration Validation Tests
# Part of the Cortex-OS TDD Pipeline

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
total_tests=0
passed_tests=0

# Helper functions
assert_success() {
    total_tests=$((total_tests + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        passed_tests=$((passed_tests + 1))
    else
        echo -e "${RED}✗${NC} $2"
        return 1
    fi
}

assert_contains() {
    total_tests=$((total_tests + 1))
    if echo "$1" | grep -q "$2"; then
        echo -e "${GREEN}✓${NC} $3"
        passed_tests=$((passed_tests + 1))
    else
        echo -e "${RED}✗${NC} $3"
        return 1
    fi
}

echo -e "${YELLOW}=== Docker Compose Configuration Validation Tests ===${NC}"
echo

# Test 1: Compose file syntax validation
echo "1. Testing Docker Compose syntax..."
docker compose -f docker/docker-compose.yml config --quiet 2>/dev/null
assert_success $? "Base compose file should be valid"
echo

# Test 2: Required services are defined
echo "2. Testing required services..."
services=$(docker compose -f docker/docker-compose.yml config --services)
required_services=("jaeger" "qdrant" "neo4j" "prometheus" "grafana" "ollama" "scaphandre-bridge" "gpl-tools")

for service in "${required_services[@]}"; do
    assert_contains "$services" "^$service$" "Service $service should be defined"
done
echo

# Test 3: Network configuration
echo "3. Testing network configuration..."
networks=$(docker compose -f docker/docker-compose.yml config --networks)
assert_contains "$networks" "cortex-network" "cortex-network should be defined"
echo

# Test 4: Volume definitions
echo "4. Testing volume definitions..."
volumes=$(docker compose -f docker/docker-compose.yml config --volumes)
required_volumes=("qdrant_data" "neo4j_data" "prometheus_data" "grafana_data")

for volume in "${required_volumes[@]}"; do
    assert_contains "$volumes" "^$volume$" "Volume $volume should be defined"
done
echo

# Test 5: Port conflicts
echo "5. Testing for port conflicts..."
# Extract ports using grep and awk instead of jq
ports=$(docker compose -f docker/docker-compose.yml config | grep -E "^\s+- '" | sed 's/.*: //; s/-//' | sort -n)
duplicate_ports=$(echo "$ports" | uniq -d)
if [ -z "$duplicate_ports" ]; then
    assert_success 0 "No port conflicts found"
else
    echo -e "${RED}✗${NC} Port conflicts found: $duplicate_ports"
    return 1
fi
echo

# Test 6: Health checks
echo "6. Testing health check configurations..."
health_check_services=("jaeger" "qdrant" "neo4j" "prometheus" "grafana" "scaphandre-bridge" "gpl-tools")

for service in "${health_check_services[@]}"; do
    # Extract healthcheck section directly from compose file
    if docker compose -f docker/docker-compose.yml config | grep -A 20 "$service:" | grep -q "healthcheck:"; then
        assert_success 0 "Service $service has health check configured"
    else
        echo -e "${RED}✗${NC} Service $service missing health check"
    fi
done
echo

# Test 7: Production overlay validation
echo "7. Testing production overlay..."
if [ -f "docker/docker-compose.prod.yml" ]; then
    docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml config --quiet 2>/dev/null
    assert_success $? "Production overlay should be valid"
else
    echo -e "${YELLOW}⚠${NC} Production overlay not found, skipping test"
fi
echo

# Test results summary
echo -e "${YELLOW}=== Test Results ===${NC}"
echo "Total tests: $total_tests"
echo "Passed: $passed_tests"
echo "Failed: $((total_tests - passed_tests))"

if [ $passed_tests -eq $total_tests ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi