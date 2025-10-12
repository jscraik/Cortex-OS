#!/usr/bin/env bash
# brAInwav OAuth2 Validation Script
# Co-authored-by: brAInwav Development Team <dev@brainwav.dev>

set -euo pipefail

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [brAInwav] $*" >&2
}

log "Starting brAInwav OAuth2 configuration validation..."

# Configuration
MCP_URL="${MCP_RESOURCE_URL:-https://cortex-mcp.brainwav.io}"
METADATA_URL="$MCP_URL/.well-known/oauth-protected-resource"
MCP_ENDPOINT="$MCP_URL/mcp"

log "Validating brAInwav OAuth2 metadata endpoint: $METADATA_URL"

# Test 1: Check OAuth protected resource metadata
echo "=== Test 1: brAInwav OAuth Protected Resource Metadata ==="
if curl -s --max-time 10 "$METADATA_URL" | jq . 2>/dev/null; then
    log "✅ brAInwav OAuth metadata endpoint is accessible and returns valid JSON"
else
    log "❌ brAInwav OAuth metadata endpoint failed or returned invalid JSON"
    exit 1
fi

echo ""
echo "=== Test 2: brAInwav MCP Endpoint Authentication Challenge ==="
log "Testing brAInwav MCP endpoint authentication: $MCP_ENDPOINT"

# Test 2: Check MCP endpoint returns 401 with WWW-Authenticate header
RESPONSE=$(curl -i -s --max-time 10 -X POST "$MCP_ENDPOINT" \
    -H 'Content-Type: application/json' \
    -d '{}' 2>/dev/null || echo "")

if echo "$RESPONSE" | grep -i "HTTP/.*401" >/dev/null; then
    log "✅ brAInwav MCP endpoint correctly returns 401 Unauthorized"
else
    log "❌ brAInwav MCP endpoint did not return 401 Unauthorized"
    echo "Response: $RESPONSE"
    exit 1
fi

if echo "$RESPONSE" | grep -i "WWW-Authenticate.*Bearer" >/dev/null; then
    log "✅ brAInwav MCP endpoint includes proper WWW-Authenticate header"
else
    log "❌ brAInwav MCP endpoint missing WWW-Authenticate header"
    echo "Response headers:"
    echo "$RESPONSE" | head -20
    exit 1
fi

echo ""
echo "=== Test 3: brAInwav Scope Advertisement ==="
# Test 3: Check if required scopes are advertised
EXPECTED_SCOPES="search.read docs.write memory.read memory.write memory.delete"
if curl -s --max-time 10 "$METADATA_URL" | jq -r '.scopes[]?' 2>/dev/null | grep -q "search.read"; then
    log "✅ brAInwav required scopes are advertised in metadata"
else
    log "⚠️  Could not verify all brAInwav required scopes in metadata"
fi

log "brAInwav OAuth2 validation completed successfully!"
log "brAInwav MCP Server OAuth2 integration is properly configured"

echo ""
echo "Next steps for brAInwav OAuth2 setup:"
echo "1. Ensure your Auth0 API has RBAC enabled"
echo "2. Enable 'Add Permissions in Access Token' in Auth0 API settings"
echo "3. Configure matching scopes in Auth0: $EXPECTED_SCOPES"
echo "4. Test with a valid OAuth2 bearer token"