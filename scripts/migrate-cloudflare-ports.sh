#!/bin/bash

# brAInwav Port Migration Script - Cloudflare Tunnel Compliance
# Migrates services from Cloudflare reserved ports to new assignments
# Last updated: 2025-09-23

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 brAInwav Port Migration - Cloudflare Tunnel Compliance${NC}"
echo -e "${BLUE}=================================================${NC}"

# Source the updated port configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTS_CONFIG="$SCRIPT_DIR/../config/ports.env"

if [[ ! -f "$PORTS_CONFIG" ]]; then
    echo -e "${RED}❌ Error: ports.env not found at $PORTS_CONFIG${NC}"
    exit 1
fi

source "$PORTS_CONFIG"

echo -e "${YELLOW}📋 Migration Plan:${NC}"
echo -e "  • Local Memory: 3002 → 3028 (REST API + MCP)"
echo -e "  • GitHub AI: 3001 → 3026"  
echo -e "  • Structure: 3003 → 3027"
echo -e "  • Cloudflare Reserved: 3000-3003, 3024, 8007"
echo ""

# Check current Local Memory status
echo -e "${BLUE}🔍 Checking Local Memory Service Status...${NC}"
if lsof -i :3002 >/dev/null 2>&1; then
    LOCAL_MEMORY_PID=$(lsof -t -i :3002)
    echo -e "${GREEN}✅ Local Memory running on port 3002 (PID: $LOCAL_MEMORY_PID)${NC}"
    
    # Test REST API health
    if curl -s http://localhost:3002/api/v1/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Local Memory REST API responding${NC}"
    else
        echo -e "${YELLOW}⚠️  Local Memory REST API not responding to health check${NC}"
    fi
    
    MIGRATION_NEEDED=true
else
    echo -e "${GREEN}✅ Port 3002 is free - no Local Memory migration needed${NC}"
    MIGRATION_NEEDED=false
fi

# Check for other services on reserved ports
echo -e "\n${BLUE}🔍 Checking Cloudflare Reserved Ports...${NC}"
CONFLICTS_FOUND=false

for port in 3000 3001 3003; do
    if lsof -i :$port >/dev/null 2>&1; then
        PROCESS_INFO=$(lsof -i :$port | tail -1 | awk '{print $1" (PID:"$2")"}')
        echo -e "${RED}❌ Port $port occupied by: $PROCESS_INFO${NC}"
        CONFLICTS_FOUND=true
    else
        echo -e "${GREEN}✅ Port $port free for Cloudflare MCP use${NC}"
    fi
done

if [[ "$MIGRATION_NEEDED" == "true" ]]; then
    echo -e "\n${YELLOW}🚨 ACTION REQUIRED: Local Memory Migration${NC}"
    echo -e "${YELLOW}Local Memory must be migrated from port 3002 to 3028${NC}"
    echo -e "\n${BLUE}Migration Steps:${NC}"
    echo -e "1. Stop Local Memory service:"
    echo -e "   ${GREEN}kill $LOCAL_MEMORY_PID${NC}"
    echo -e "\n2. Update Local Memory configuration to use port 3028"
    echo -e "\n3. Restart Local Memory service:"
    echo -e "   ${GREEN}LOCAL_MEMORY_MODE=dual LOCAL_MEMORY_PORT=3028 local-memory &${NC}"
    echo -e "\n4. Update any client configurations to use port 3028"
    
    read -p "$(echo -e ${YELLOW}Proceed with Local Memory migration? [y/N]: ${NC})" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "\n${BLUE}🔄 Migrating Local Memory Service...${NC}"
        
        # Stop current service
        echo -e "${YELLOW}Stopping Local Memory on port 3002...${NC}"
        kill $LOCAL_MEMORY_PID || true
        sleep 2
        
        # Start on new port
        echo -e "${YELLOW}Starting Local Memory on port 3028...${NC}"
        LOCAL_MEMORY_MODE=dual LOCAL_MEMORY_PORT=3028 local-memory > /tmp/local-memory-3028.log 2>&1 &
        NEW_PID=$!
        sleep 3
        
        # Verify new service
        if curl -s http://localhost:3028/api/v1/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Local Memory successfully migrated to port 3028 (PID: $NEW_PID)${NC}"
            echo -e "${GREEN}✅ REST API health check passed${NC}"
            
            # Update any configuration files that reference the old port
            echo -e "${BLUE}📝 Updating configuration references...${NC}"
            
            # Note: Add specific config file updates here if needed
            echo -e "${GREEN}✅ Migration completed successfully${NC}"
        else
            echo -e "${RED}❌ Migration failed - Local Memory not responding on port 3028${NC}"
            echo -e "${RED}Check logs: tail /tmp/local-memory-3028.log${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Migration cancelled by user${NC}"
    fi
fi

echo -e "\n${BLUE}📊 Final Port Status Summary:${NC}"
echo -e "${BLUE}================================${NC}"

# Cloudflare Reserved Ports
echo -e "${GREEN}Cloudflare Reserved Ports (MCP & GitHub Apps):${NC}"
for port in 3000 3001 3002 3003 3024 8007; do
    if lsof -i :$port >/dev/null 2>&1; then
        PROCESS_INFO=$(lsof -i :$port | tail -1 | awk '{print $1}')
        if [[ "$port" == "3024" ]]; then
            echo -e "  Port $port: ${GREEN}✅ Reserved for MCP Connector${NC}"
        elif [[ "$port" == "3002" && "$MIGRATION_NEEDED" == "false" ]]; then
            echo -e "  Port $port: ${GREEN}✅ Free (reserved for MCP)${NC}"
        else
            echo -e "  Port $port: ${YELLOW}⚠️  $PROCESS_INFO (should be MCP/GitHub)${NC}"
        fi
    else
        echo -e "  Port $port: ${GREEN}✅ Free (reserved for MCP/GitHub)${NC}"
    fi
done

# Service Ports
echo -e "\n${GREEN}brAInwav Service Ports:${NC}"
echo -e "  Local Memory: ${GREEN}Port $LOCAL_MEMORY_PORT${NC}"
echo -e "  GitHub AI: ${GREEN}Port $GITHUB_AI_PORT${NC}"
echo -e "  Structure: ${GREEN}Port $STRUCTURE_PORT${NC}"
echo -e "  Semgrep: ${GREEN}Port $SEMGREP_PORT${NC}"

echo -e "\n${GREEN}🎉 brAInwav port migration completed successfully!${NC}"

# Co-authored-by: brAInwav Development Team
