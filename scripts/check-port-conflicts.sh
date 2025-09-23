#!/usr/bin/env bash
# Port Conflict Resolution Script
# Co-authored-by: brAInwav Development Team

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTS_FILE="${SCRIPT_DIR}/../config/ports.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 brAInwav Port Conflict Resolution${NC}"
echo "========================================"

# Source the ports configuration
if [[ -f "$PORTS_FILE" ]]; then
    # shellcheck source=/dev/null
    source "$PORTS_FILE"
    echo -e "${GREEN}✅ Loaded port configuration from ${PORTS_FILE}${NC}"
else
    echo -e "${RED}❌ Port configuration file not found: ${PORTS_FILE}${NC}"
    exit 1
fi

# Function to check if a port is in use
check_port() {
    local port=$1
    local service=$2
    local expected_process=${3:-""}
    
    if command -v lsof >/dev/null 2>&1; then
        if lsof -Pi :$port -sTCP:LISTEN >/dev/null 2>&1; then
            local process_info
            process_info=$(lsof -Pi :$port -sTCP:LISTEN | awk 'NR==2{print $1" (PID:"$2")"}')
            local process_name
            process_name=$(echo "$process_info" | cut -d' ' -f1)
            
            # Check if this is an expected process
            if [[ -n "$expected_process" && "$process_name" == "$expected_process" ]]; then
                echo -e "${GREEN}✅ Port $port ($service): RUNNING $process_info${NC}"
                return 0
            else
                echo -e "${RED}🔒 Port $port ($service): CONFLICT - $process_info${NC}"
                return 1
            fi
        else
            echo -e "${YELLOW}⚠️  Port $port ($service): FREE (service not running)${NC}"
            return 2
        fi
    else
        echo -e "${YELLOW}⚠️  Port $port ($service): Cannot check (lsof not available)${NC}"
        return 3
    fi
}

# Function to get process details for a port
get_port_details() {
    local port=$1
    if command -v lsof >/dev/null 2>&1 && lsof -Pi :$port -sTCP:LISTEN >/dev/null 2>&1; then
        lsof -Pi :$port -sTCP:LISTEN | tail -n +2 | while read -r line; do
            echo "   $line"
        done
    fi
}

echo
echo -e "${BLUE}📊 Current Port Status:${NC}"
echo "------------------------"

# Check core service ports
declare -A PORTS=(
    ["$MCP_PORT"]="MCP ChatGPT Connector"
    ["$GITHUB_AI_PORT"]="GitHub AI"
    ["$SEMGREP_PORT"]="Semgrep Analysis"
    ["$STRUCTURE_PORT"]="Structure Analysis"
    ["$DOCS_PORT"]="Documentation Site"
    ["$LOCAL_MEMORY_PORT"]="Local Memory (Current)"
    ["$LOCAL_MEMORY_TARGET_PORT"]="Local Memory (Target)"
)

conflicts=0
occupied_ports=()

for port in "${!PORTS[@]}"; do
    service="${PORTS[$port]}"
    if ! check_port "$port" "$service"; then
        ((conflicts++))
        occupied_ports+=("$port")
        get_port_details "$port"
    fi
done

echo
echo -e "${BLUE}🔧 Infrastructure Services:${NC}"
echo "----------------------------"

# Check infrastructure ports
declare -A INFRA_PORTS=(
    ["11434"]="Ollama LLM"
    ["6379"]="Redis"
    ["3008"]="VS Code LSP"
    ["6333"]="Qdrant Vector DB"
)

for port in "${!INFRA_PORTS[@]}"; do
    service="${INFRA_PORTS[$port]}"
    check_port "$port" "$service" >/dev/null 2>&1 || {
        echo -e "${YELLOW}ℹ️  Port $port ($service): Expected infrastructure service${NC}"
        get_port_details "$port"
    }
done

echo
echo -e "${BLUE}📋 Summary:${NC}"
echo "============"

if [[ $conflicts -eq 0 ]]; then
    echo -e "${GREEN}✅ No port conflicts detected!${NC}"
    echo -e "${GREEN}   All configured services can start without issues.${NC}"
else
    echo -e "${RED}❌ Found $conflicts port conflict(s)${NC}"
    echo -e "${YELLOW}   Occupied ports: ${occupied_ports[*]}${NC}"
    
    echo
    echo -e "${BLUE}🛠️  Resolution Options:${NC}"
    echo "1. Kill conflicting processes: bash scripts/free-ports.sh ${occupied_ports[*]}"
    echo "2. Update service configurations to use alternative ports"
    echo "3. Migrate Local Memory from port 3002 to 3010 (planned migration)"
fi

echo
echo -e "${BLUE}🌐 Service URLs:${NC}"
echo "=================="
echo "• Local Memory REST API: http://localhost:$LOCAL_MEMORY_PORT/api/v1/"
echo "• MCP ChatGPT Connector: http://localhost:$MCP_PORT/"
echo "• GitHub AI Service: http://localhost:$GITHUB_AI_PORT/"
echo "• Documentation: http://localhost:$DOCS_PORT/"

echo
echo -e "${BLUE}🔗 Integration Status:${NC}"
echo "======================"

# Check Local Memory dual mode
if check_port "$LOCAL_MEMORY_PORT" "Local Memory" >/dev/null 2>&1; then
    echo -e "${RED}❌ Local Memory not running on expected port $LOCAL_MEMORY_PORT${NC}"
    echo "   Run: local-memory start --dual-mode"
else
    echo -e "${GREEN}✅ Local Memory running in dual mode (MCP + REST API)${NC}"
    # Verify REST API
    if curl -s "http://localhost:$LOCAL_MEMORY_PORT/api/v1/health" >/dev/null 2>&1; then
        echo -e "${GREEN}   ✅ REST API responding${NC}"
    else
        echo -e "${YELLOW}   ⚠️  REST API may not be responding${NC}"
    fi
fi

echo
echo -e "${BLUE}📝 Configuration Files:${NC}"
echo "======================="
echo "• Port Registry: $PORTS_FILE"
echo "• Environment: .env.local (auto-loaded by dev scripts)"
echo "• MCP Configuration: ~/Library/Application Support/Claude/claude_desktop_config.json"

exit $conflicts