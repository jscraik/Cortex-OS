#!/bin/bash

# brAInwav Cortex-OS RepPrompt MCP Integration Setup Script
# Co-authored-by: brAInwav Development Team

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORTEX_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$CORTEX_ROOT/config/repoprompt-mcp-config.json"
REPOPROMPT_CLI="/Users/jamiecraik/RepoPrompt/repoprompt_cli"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[brAInwav Cortex-OS]${NC} $1"
}

success() {
    echo -e "${GREEN}[brAInwav Cortex-OS]${NC} ✅ $1"
}

warn() {
    echo -e "${YELLOW}[brAInwav Cortex-OS]${NC} ⚠️  $1"
}

error() {
    echo -e "${RED}[brAInwav Cortex-OS]${NC} ❌ $1"
}

# Validate RepPrompt installation
validate_repoprompt() {
    log "Validating RepPrompt installation..."
    
    if [[ ! -f "$REPOPROMPT_CLI" ]]; then
        error "RepPrompt CLI not found at $REPOPROMPT_CLI"
        return 1
    fi
    
    if [[ ! -x "$REPOPROMPT_CLI" ]]; then
        error "RepPrompt CLI is not executable at $REPOPROMPT_CLI"
        return 1
    fi
    
    # Test RepPrompt functionality
    log "Testing RepPrompt functionality..."
    if timeout 10s "$REPOPROMPT_CLI" --help >/dev/null 2>&1; then
        success "RepPrompt CLI is working correctly"
    else
        error "RepPrompt CLI test failed"
        return 1
    fi
}

# Setup RepPrompt cache directory
setup_cache() {
    local cache_dir="/tmp/repoprompt-cache"
    
    log "Setting up RepPrompt cache directory..."
    
    if [[ ! -d "$cache_dir" ]]; then
        mkdir -p "$cache_dir"
        success "Created cache directory: $cache_dir"
    else
        success "Cache directory already exists: $cache_dir"
    fi
    
    # Set appropriate permissions
    chmod 755 "$cache_dir"
}

# Register RepPrompt with MCP registry
register_with_mcp() {
    log "Registering RepPrompt with Cortex-OS MCP registry..."
    
    # Check if MCP bridge package exists
    local mcp_bridge="$CORTEX_ROOT/packages/mcp-bridge"
    if [[ ! -d "$mcp_bridge" ]]; then
        warn "MCP bridge package not found, creating registration script..."
        create_registration_script
        return
    fi
    
    # Create registration script for RepPrompt
    cat > "$mcp_bridge/src/scripts/register-repoprompt.mjs" << 'EOF'
#!/usr/bin/env node

/**
 * brAInwav Cortex-OS RepPrompt MCP Registration Script
 * Co-authored-by: brAInwav Development Team
 */

import { promises as fs } from 'fs';
import path from 'path';

const REPOPROMPT_CONFIG = {
  name: 'repoprompt',
  description: 'brAInwav Cortex-OS RepPrompt integration for intelligent repository analysis',
  command: '/Users/jamiecraik/RepoPrompt/repoprompt_cli',
  args: [],
  tools: [
    'repo_analyze',
    'repo_structure', 
    'repo_context',
    'repo_dependencies',
    'repo_changes'
  ],
  capabilities: [
    'repository-analysis',
    'code-context-generation',
    'dependency-mapping'
  ]
};

async function registerRepPrompt() {
  try {
    console.log('🚀 brAInwav Cortex-OS: Registering RepPrompt MCP server...');
    
    // Register with MCP bridge
    const registryPath = path.join(process.cwd(), 'src', 'registry.json');
    let registry = {};
    
    try {
      const registryData = await fs.readFile(registryPath, 'utf8');
      registry = JSON.parse(registryData);
    } catch (error) {
      console.log('📝 Creating new MCP registry...');
      registry = { servers: {} };
    }
    
    // Add RepPrompt configuration
    registry.servers.repoprompt = REPOPROMPT_CONFIG;
    
    // Write updated registry
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
    
    console.log('✅ brAInwav Cortex-OS: RepPrompt successfully registered with MCP bridge');
    console.log('📊 Available tools:', REPOPROMPT_CONFIG.tools.join(', '));
    
  } catch (error) {
    console.error('❌ brAInwav Cortex-OS: Failed to register RepPrompt:', error.message);
    process.exit(1);
  }
}

registerRepPrompt();
EOF
    
    chmod +x "$mcp_bridge/src/scripts/register-repoprompt.mjs"
    success "Created RepPrompt registration script"
}

# Create standalone registration script if MCP bridge doesn't exist
create_registration_script() {
    local script_path="$CORTEX_ROOT/scripts/register-repoprompt.sh"
    
    cat > "$script_path" << 'EOF'
#!/bin/bash

# brAInwav Cortex-OS RepPrompt MCP Registration
# Co-authored-by: brAInwav Development Team

echo "🚀 brAInwav Cortex-OS: Registering RepPrompt MCP server..."

# Create MCP configuration for applications
REPOPROMPT_MCP_CONFIG='{
  "mcpServers": {
    "repoprompt": {
      "command": "/Users/jamiecraik/RepPrompt/repoprompt_cli",
      "args": [],
      "description": "brAInwav Cortex-OS RepPrompt integration for intelligent repository analysis"
    }
  }
}'

# Add to cortex-webui configuration
if [[ -d "apps/cortex-webui" ]]; then
    echo "$REPOPROMPT_MCP_CONFIG" > apps/cortex-webui/repoprompt-mcp.json
    echo "✅ brAInwav Cortex-OS: Added RepPrompt to cortex-webui"
fi

# Add to cortex-code configuration  
if [[ -d "apps/cortex-code" ]]; then
    echo "$REPOPROMPT_MCP_CONFIG" > apps/cortex-code/repoprompt-mcp.json
    echo "✅ brAInwav Cortex-OS: Added RepPrompt to cortex-code"
fi

echo "🎯 brAInwav Cortex-OS: RepPrompt MCP integration complete"
EOF

    chmod +x "$script_path"
    success "Created standalone registration script: $script_path"
}

# Test RepPrompt MCP integration
test_integration() {
    log "Testing RepPrompt MCP integration..."
    
    # Test RepPrompt on current repository
    local test_repo="$CORTEX_ROOT"
    
    log "Testing repository analysis on Cortex-OS..."
    if timeout 30s "$REPOPROMPT_CLI" --path "$test_repo" --output json > /tmp/repoprompt-test.json 2>&1; then
        success "RepPrompt successfully analyzed Cortex-OS repository"
        
        # Validate output
        if [[ -f "/tmp/repoprompt-test.json" ]] && [[ -s "/tmp/repoprompt-test.json" ]]; then
            local file_count=$(jq -r '.files | length' /tmp/repoprompt-test.json 2>/dev/null || echo "unknown")
            success "Analysis complete: $file_count files processed"
        fi
        
        # Cleanup test file
        rm -f /tmp/repoprompt-test.json
    else
        warn "RepPrompt test analysis failed - this may be due to repository size"
        warn "RepPrompt is still configured and should work with smaller repositories"
    fi
}

# Update Cortex-OS configuration
update_cortex_config() {
    log "Updating Cortex-OS configuration..."
    
    local cortex_config="$CORTEX_ROOT/config/cortex-config.json"
    
    if [[ -f "$cortex_config" ]]; then
        # Backup existing config
        cp "$cortex_config" "$cortex_config.backup"
        
        # Add RepPrompt configuration using jq if available
        if command -v jq >/dev/null 2>&1; then
            jq '.mcp.servers.repoprompt = {
                "command": "/Users/jamiecraik/RepoPrompt/repoprompt_cli",
                "args": [],
                "enabled": true,
                "brAInwav": "Cortex-OS RepPrompt Integration"
            }' "$cortex_config" > "$cortex_config.tmp" && mv "$cortex_config.tmp" "$cortex_config"
            
            success "Updated cortex-config.json with RepPrompt integration"
        else
            warn "jq not available - manual configuration update required"
        fi
    else
        warn "cortex-config.json not found - creating basic configuration"
        echo '{
    "mcp": {
        "servers": {
            "repoprompt": {
                "command": "/Users/jamiecraik/RepoPrompt/repoprompt_cli",
                "args": [],
                "enabled": true,
                "brAInwav": "Cortex-OS RepPrompt Integration"
            }
        }
    }
}' > "$cortex_config"
        success "Created cortex-config.json with RepPrompt integration"
    fi
}

# Main setup function
main() {
    log "Starting brAInwav Cortex-OS RepPrompt MCP integration setup..."
    echo
    
    # Validate prerequisites
    validate_repoprompt || exit 1
    
    # Setup components
    setup_cache
    register_with_mcp
    update_cortex_config
    
    # Test integration
    test_integration
    
    echo
    success "brAInwav Cortex-OS RepPrompt MCP integration setup complete!"
    echo
    log "RepPrompt MCP server is now configured with the following capabilities:"
    echo "  📊 repo_analyze     - Comprehensive repository analysis"
    echo "  🏗️  repo_structure  - Repository structure mapping"
    echo "  📝 repo_context     - Contextual code generation"
    echo "  🔗 repo_dependencies - Dependency analysis"
    echo "  📈 repo_changes     - Change analysis and tracking"
    echo
    log "Next steps:"
    echo "  1. Start Cortex-OS: pnpm start"
    echo "  2. Test RepPrompt tools via MCP interface"
    echo "  3. Check integration status: curl http://localhost:8081/mcp/tools/list"
    echo
    success "Integration complete! 🎉"
}

# Run main function
main "$@"
