#!/bin/bash

# brAInwav Cortex MCP Deployment Automation Script
# Automates the complete MCP deployment process including build, transfer, and service management

set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly MCP_PACKAGE_DIR="${PROJECT_ROOT}/packages/cortex-mcp"
readonly LOG_FILE="${PROJECT_ROOT}/logs/mcp-deployment-$(date +%Y%m%d-%H%M%S).log"

# Default configuration - can be overridden by environment variables
readonly DEFAULT_HOST="brainwav-mcp"
readonly DEFAULT_SERVICE_NAME="cortex-fastmcp.service"
readonly DEFAULT_TRANSPORT="streamable-http"
readonly DEFAULT_MANIFEST_URL="https://cortex-mcp.brainwav.io/.well-known/mcp.json"
readonly DEFAULT_CLOUDFLARE_ZONE_FILE="${MCP_PACKAGE_DIR}/infrastructure/cloudflare/.env"

# Environment variables
MCP_HOST="${MCP_HOST:-$DEFAULT_HOST}"
SERVICE_NAME="${SERVICE_NAME:-$DEFAULT_SERVICE_NAME}"
TRANSPORT="${TRANSPORT:-$DEFAULT_TRANSPORT}"
MANIFEST_URL="${MANIFEST_URL:-$DEFAULT_MANIFEST_URL}"
DRY_RUN="${DRY_RUN:-false}"
SKIP_BUILD="${SKIP_BUILD:-false}"
SKIP_TRANSFER="${SKIP_TRANSFER:-false}"
SKIP_SERVICE="${SKIP_SERVICE:-false}"
SKIP_CLOUDFLARE="${SKIP_CLOUDFLARE:-false}"
FORCE_REBUILD="${FORCE_REBUILD:-false}"

# Logging functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} $message" | tee -a "$LOG_FILE"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $message" | tee -a "$LOG_FILE"
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING]${NC} $message" | tee -a "$LOG_FILE"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message" | tee -a "$LOG_FILE"
            ;;
    esac
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]] || [[ ! -d "$MCP_PACKAGE_DIR" ]]; then
        error_exit "Must be run from Cortex-OS project root. Current: $PROJECT_ROOT"
    fi
    
    # Check required tools
    local tools=("uv" "ssh" "scp" "curl" "jq")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error_exit "$tool is required but not installed"
        fi
    done
    
    # Check SSH connectivity to host
    if [[ "$SKIP_TRANSFER" != "true" ]] && [[ "$DRY_RUN" != "true" ]]; then
        log "INFO" "Testing SSH connectivity to $MCP_HOST..."
        if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$MCP_HOST" 'echo "SSH connection successful"' &> /dev/null; then
            error_exit "Cannot connect to $MCP_HOST via SSH. Check your SSH configuration."
        fi
        log "SUCCESS" "SSH connectivity to $MCP_HOST verified"
    fi
    
    log "SUCCESS" "All prerequisites satisfied"
}

# Build the MCP package
build_package() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        log "INFO" "Skipping build step (SKIP_BUILD=true)"
        return
    fi
    
    log "INFO" "Building MCP package..."
    
    cd "$MCP_PACKAGE_DIR"
    
    # Check if we need to rebuild
    local dist_file
    dist_file=$(find dist -name "cortex_mcp-*.whl" 2>/dev/null | head -1 || echo "")
    
    if [[ -n "$dist_file" ]] && [[ "$FORCE_REBUILD" != "true" ]]; then
        log "INFO" "Found existing wheel: $dist_file"
        read -p "Use existing wheel? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            FORCE_REBUILD="true"
        fi
    fi
    
    if [[ -z "$dist_file" ]] || [[ "$FORCE_REBUILD" == "true" ]]; then
        log "INFO" "Building fresh package..."
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log "INFO" "[DRY RUN] Would run: uv build"
        else
            # Clean previous builds
            rm -rf dist build
            
            # Install dependencies and build
            uv sync
            uv build
            
            # Verify build output
            dist_file=$(find dist -name "cortex_mcp-*.whl" | head -1)
            if [[ -z "$dist_file" ]]; then
                error_exit "Build failed - no wheel file found in dist/"
            fi
            
            log "SUCCESS" "Package built successfully: $dist_file"
        fi
    fi
    
    cd "$PROJECT_ROOT"
}

# Transfer package to remote host
transfer_package() {
    if [[ "$SKIP_TRANSFER" == "true" ]]; then
        log "INFO" "Skipping transfer step (SKIP_TRANSFER=true)"
        return
    fi
    
    log "INFO" "Transferring package to $MCP_HOST..."
    
    local dist_file
    dist_file=$(find "$MCP_PACKAGE_DIR/dist" -name "cortex_mcp-*.whl" | head -1)
    
    if [[ -z "$dist_file" ]]; then
        error_exit "No wheel file found to transfer. Run build first."
    fi
    
    local remote_path="/tmp/$(basename "$dist_file")"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY RUN] Would transfer: $dist_file -> $MCP_HOST:$remote_path"
    else
        scp "$dist_file" "$MCP_HOST:$remote_path"
        log "SUCCESS" "Package transferred to $MCP_HOST:$remote_path"
    fi
    
    # Also transfer any sdist if available
    local sdist_file
    sdist_file=$(find "$MCP_PACKAGE_DIR/dist" -name "cortex_mcp-*.tar.gz" | head -1)
    if [[ -n "$sdist_file" ]]; then
        local remote_sdist_path="/tmp/$(basename "$sdist_file")"
        if [[ "$DRY_RUN" == "true" ]]; then
            log "INFO" "[DRY RUN] Would transfer: $sdist_file -> $MCP_HOST:$remote_sdist_path"
        else
            scp "$sdist_file" "$MCP_HOST:$remote_sdist_path"
            log "SUCCESS" "Source distribution transferred to $MCP_HOST:$remote_sdist_path"
        fi
    fi
}

# Manage remote service
manage_service() {
    if [[ "$SKIP_SERVICE" == "true" ]]; then
        log "INFO" "Skipping service management (SKIP_SERVICE=true)"
        return
    fi
    
    log "INFO" "Managing service on $MCP_HOST..."
    
    local dist_file
    dist_file=$(find "$MCP_PACKAGE_DIR/dist" -name "cortex_mcp-*.whl" | head -1)
    local remote_path="/tmp/$(basename "$dist_file")"
    
    local commands=(
        "echo 'Stopping service...'"
        "sudo systemctl stop $SERVICE_NAME || echo 'Service was not running'"
        "echo 'Installing/upgrading package...'"
        "pip install --upgrade '$remote_path'"
        "echo 'Setting transport override...'"
        "export CORTEX_MCP_TRANSPORT='$TRANSPORT'"
        "echo 'Starting service...'"
        "sudo systemctl start $SERVICE_NAME"
        "echo 'Checking service status...'"
        "sudo systemctl status $SERVICE_NAME --no-pager"
        "echo 'Cleaning up temporary files...'"
        "rm -f '$remote_path' /tmp/cortex_mcp-*.tar.gz"
    )
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY RUN] Would execute on $MCP_HOST:"
        for cmd in "${commands[@]}"; do
            echo "  $cmd"
        done
    else
        # Execute commands remotely
        local full_command
        full_command=$(printf '%s; ' "${commands[@]}")
        
        log "INFO" "Executing deployment commands on $MCP_HOST..."
        if ssh "$MCP_HOST" "$full_command"; then
            log "SUCCESS" "Service deployment completed successfully"
        else
            error_exit "Service deployment failed on $MCP_HOST"
        fi
    fi
}

# Purge Cloudflare cache
purge_cloudflare_cache() {
    if [[ "$SKIP_CLOUDFLARE" == "true" ]]; then
        log "INFO" "Skipping Cloudflare cache purge (SKIP_CLOUDFLARE=true)"
        return
    fi
    
    log "INFO" "Purging Cloudflare cache for manifest..."
    
    # Check for Cloudflare credentials
    local zone_id="${CLOUDFLARE_ZONE_ID:-}"
    local api_token="${CLOUDFLARE_API_TOKEN:-}"
    
    # Try to load from file if not set
    if [[ -f "$DEFAULT_CLOUDFLARE_ZONE_FILE" ]]; then
        source "$DEFAULT_CLOUDFLARE_ZONE_FILE"
        zone_id="${zone_id:-$CLOUDFLARE_ZONE_ID}"
        api_token="${api_token:-$CLOUDFLARE_API_TOKEN}"
    fi
    
    if [[ -z "$zone_id" ]] || [[ -z "$api_token" ]]; then
        log "WARNING" "Cloudflare credentials not found. Skipping cache purge."
        log "INFO" "Set CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN or create $DEFAULT_CLOUDFLARE_ZONE_FILE"
        return
    fi
    
    local purge_data='{"files":["'$MANIFEST_URL'"]}'
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY RUN] Would purge Cloudflare cache for: $MANIFEST_URL"
    else
        local response
        response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$zone_id/purge_cache" \
            -H "Authorization: Bearer $api_token" \
            -H "Content-Type: application/json" \
            --data "$purge_data")
        
        if echo "$response" | jq -e '.success == true' > /dev/null; then
            log "SUCCESS" "Cloudflare cache purged successfully"
        else
            log "WARNING" "Cloudflare cache purge may have failed: $response"
        fi
    fi
}

# Verify deployment
verify_deployment() {
    log "INFO" "Verifying deployment..."
    
    # Wait a moment for service to fully start
    if [[ "$DRY_RUN" != "true" ]]; then
        sleep 5
    fi
    
    # Check manifest
    log "INFO" "Checking MCP manifest at $MANIFEST_URL..."
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY RUN] Would check: curl -fsSL $MANIFEST_URL | jq"
    else
        local manifest
        manifest=$(curl -fsSL "$MANIFEST_URL" 2>/dev/null || echo "")
        
        if [[ -n "$manifest" ]]; then
            log "SUCCESS" "Manifest accessible:"
            echo "$manifest" | jq '.' || echo "$manifest"
            
            # Check transport in manifest
            local transport_in_manifest
            transport_in_manifest=$(echo "$manifest" | jq -r '.transport // "unknown"')
            if [[ "$transport_in_manifest" == "$TRANSPORT" ]]; then
                log "SUCCESS" "Transport correctly set to: $transport_in_manifest"
            else
                log "WARNING" "Transport mismatch. Expected: $TRANSPORT, Got: $transport_in_manifest"
            fi
        else
            log "ERROR" "Failed to retrieve manifest from $MANIFEST_URL"
        fi
    fi
    
    # Check service status on remote host
    if [[ "$SKIP_SERVICE" != "true" ]] && [[ "$DRY_RUN" != "true" ]]; then
        log "INFO" "Checking service status on $MCP_HOST..."
        if ssh "$MCP_HOST" "systemctl is-active $SERVICE_NAME --quiet"; then
            log "SUCCESS" "Service $SERVICE_NAME is active on $MCP_HOST"
        else
            log "ERROR" "Service $SERVICE_NAME is not active on $MCP_HOST"
        fi
    fi
}

# Print usage
usage() {
    cat << EOF
brAInwav Cortex MCP Deployment Script

Usage: $0 [OPTIONS]

Options:
    -h, --help              Show this help message
    -n, --dry-run          Show what would be done without executing
    -f, --force-rebuild    Force rebuild even if wheel exists
    --skip-build           Skip the build step
    --skip-transfer        Skip the transfer step
    --skip-service         Skip service management
    --skip-cloudflare      Skip Cloudflare cache purge
    --host HOST            Remote host for deployment (default: $DEFAULT_HOST)
    --service NAME         Service name to manage (default: $DEFAULT_SERVICE_NAME)
    --transport TYPE       Transport type to set (default: $DEFAULT_TRANSPORT)

Environment Variables:
    MCP_HOST               Remote host for deployment
    SERVICE_NAME           Service name to manage
    TRANSPORT              Transport type to set
    CLOUDFLARE_ZONE_ID     Cloudflare zone ID for cache purge
    CLOUDFLARE_API_TOKEN   Cloudflare API token for cache purge
    DRY_RUN                Set to 'true' for dry run mode

Examples:
    # Full deployment with default settings
    $0
    
    # Dry run to see what would happen
    $0 --dry-run
    
    # Deploy to specific host with custom transport
    $0 --host production-mcp --transport sse
    
    # Force rebuild and deploy
    $0 --force-rebuild
    
    # Only build and transfer, skip service management
    $0 --skip-service --skip-cloudflare

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -n|--dry-run)
                DRY_RUN="true"
                shift
                ;;
            -f|--force-rebuild)
                FORCE_REBUILD="true"
                shift
                ;;
            --skip-build)
                SKIP_BUILD="true"
                shift
                ;;
            --skip-transfer)
                SKIP_TRANSFER="true"
                shift
                ;;
            --skip-service)
                SKIP_SERVICE="true"
                shift
                ;;
            --skip-cloudflare)
                SKIP_CLOUDFLARE="true"
                shift
                ;;
            --host)
                MCP_HOST="$2"
                shift 2
                ;;
            --service)
                SERVICE_NAME="$2"
                shift 2
                ;;
            --transport)
                TRANSPORT="$2"
                shift 2
                ;;
            *)
                error_exit "Unknown option: $1"
                ;;
        esac
    done
}

# Main execution
main() {
    # Create logs directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    log "INFO" "brAInwav Cortex MCP Deployment Script Starting"
    log "INFO" "Configuration:"
    log "INFO" "  Host: $MCP_HOST"
    log "INFO" "  Service: $SERVICE_NAME"
    log "INFO" "  Transport: $TRANSPORT"
    log "INFO" "  Dry Run: $DRY_RUN"
    log "INFO" "  Log File: $LOG_FILE"
    
    # Execute deployment steps
    check_prerequisites
    build_package
    transfer_package
    manage_service
    purge_cloudflare_cache
    verify_deployment
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "SUCCESS" "Dry run completed successfully. No actual changes were made."
    else
        log "SUCCESS" "MCP deployment completed successfully!"
        log "INFO" "Next steps:"
        log "INFO" "  1. Re-add the connector in ChatGPT using: https://cortex-mcp.brainwav.io/mcp"
        log "INFO" "  2. Test with: /mcp.tool call cortex-mcp search '{\"query\":\"test\"}'"
        log "INFO" "  3. Monitor logs: ssh $MCP_HOST 'journalctl -u $SERVICE_NAME -f'"
    fi
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    parse_args "$@"
    main
fi
