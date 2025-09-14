#!/bin/bash
set -euo pipefail

# List OrbStack containers for Cortex-OS with descriptions
# This script shows all defined containers and their purposes

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}Cortex-OS OrbStack Container Registry${NC}"
echo -e "${CYAN}=====================================${NC}\n"

echo -e "${BLUE}🏗️  Core Services (dev-min profile)${NC}"
echo -e "  ${GREEN}cortexos_nats${NC}              - NATS messaging server with JetStream"
echo -e "  ${GREEN}cortexos_model_gateway${NC}     - Model Gateway API for MLX integration"  
echo -e "  ${GREEN}cortexos_cortex_os${NC}         - Main Cortex-OS runtime application"
echo

echo -e "${BLUE}🔧 Extended Services (dev-full profile)${NC}"
echo -e "  ${GREEN}cortexos_mcp_registry${NC}      - Model Context Protocol Registry"
echo -e "  ${GREEN}cortexos_code_cli${NC}          - Cortex Code CLI tool for development"
echo -e "  ${GREEN}cortexos_code_mcp${NC}          - Model Context Protocol server for Cortex Code"
echo -e "  ${GREEN}cortexos_py_ml${NC}             - Python machine learning services and models"
echo

echo -e "${BLUE}🌐 Web Services (web profile)${NC}"
echo -e "  ${GREEN}cortexos_cortex_web${NC}        - Cortex-OS web frontend application"
echo

echo -e "${BLUE}🔌 API Services (api profile)${NC}"
echo -e "  ${GREEN}cortexos_api${NC}               - Cortex-OS Python API backend"
echo

echo -e "${BLUE}⚙️  Worker Services (workers profile)${NC}"
echo -e "  ${GREEN}cortexos_agents_workers${NC}    - Background agents and workers"
echo

echo -e "${BLUE}🔍 Observability Stack (observability profile)${NC}"
echo -e "  ${GREEN}cortexos_otel_collector${NC}    - OpenTelemetry metrics and traces collector"
echo -e "  ${GREEN}cortexos_loki${NC}              - Grafana Loki log aggregation system"
echo -e "  ${GREEN}cortexos_tempo${NC}             - Grafana Tempo distributed tracing backend"
echo -e "  ${GREEN}cortexos_grafana${NC}           - Grafana visualization and monitoring dashboard"
echo

echo -e "${BLUE}🖥️  Interactive Tools (specialized profiles)${NC}"
echo -e "  ${GREEN}cortexos_code_tui${NC}          - Terminal UI for Cortex Code development"
echo

echo -e "${YELLOW}📋 Usage Examples:${NC}"
echo -e "  List running containers:     ${CYAN}docker ps --filter 'name=cortexos_'${NC}"
echo -e "  Check specific container:     ${CYAN}docker logs cortexos_nats${NC}"
echo -e "  Execute in container:         ${CYAN}docker exec -it cortexos_cortex_os /bin/bash${NC}"
echo -e "  Start development stack:      ${CYAN}./scripts/orbstack-dev.sh start dev-min${NC}"
echo -e "  Start full observability:     ${CYAN}./scripts/orbstack-dev.sh start dev-full,observability${NC}"
echo

echo -e "${YELLOW}🏷️  Container Label Filtering:${NC}"
echo -e "  By project:                   ${CYAN}docker ps --filter 'label=orbstack.project=cortex-os'${NC}"
echo -e "  By tier:                      ${CYAN}docker ps --filter 'label=orbstack.tier=api'${NC}"
echo -e "  By language:                  ${CYAN}docker ps --filter 'label=orbstack.language=rust'${NC}"
echo -e "  Node.js services:             ${CYAN}docker ps --filter 'label=orbstack.node=true'${NC}"
echo -e "  Python services:              ${CYAN}docker ps --filter 'label=orbstack.python=true'${NC}"

# Check if any containers are currently running
echo -e "\n${YELLOW}📊 Current Status:${NC}"
RUNNING_COUNT=$(docker ps --filter 'name=cortexos_' --format '{{.Names}}' | wc -l)
if [[ $RUNNING_COUNT -gt 0 ]]; then
    echo -e "${GREEN}$RUNNING_COUNT Cortex-OS containers currently running:${NC}"
    docker ps --filter 'name=cortexos_' --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
else
    echo -e "${YELLOW}No Cortex-OS containers currently running${NC}"
    echo -e "Start the development environment with: ${CYAN}./scripts/orbstack-dev.sh start dev-min${NC}"
fi
