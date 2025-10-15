# ChatGPT Connectors Integration with Local Memory via brAInwav FASTMCP Server

## Quick Setup Guide

### 1. Install Python Dependencies (first run)

```bash
cd ~/.Cortex-OS
uv pip install --python .venv/bin/python -e ./packages/cortex-mcp
```

If `uv` is not available, install with pip instead:

```bash
cd ~/.Cortex-OS
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -e ./packages/cortex-mcp
```

### 2. Start Enhanced MCP Server

```bash
# Navigate to your Cortex-OS directory
cd ~/.Cortex-OS

# Start the enhanced server with Local Memory integration
./scripts/start-enhanced-mcp-server.sh
```

### 3. Configure ChatGPT Custom Connector

In ChatGPT:

1. Go to Settings → Connectors → Add source → Custom connector (MCP)
2. Enter server details:
   - **Server URL**: `https://cortex-mcp.brainwav.io/mcp`
   - **Authentication**: Header `X-API-Key: <your key>`
   - **Name**: "brAInwav Local Memory"

### 4. Test the Integration

In ChatGPT, try these commands (tunneled via Cloudflare):

- "Search Local Memory for debugging tips"
- "Store this conversation summary in Local Memory"
- "Fetch local-memory-item-123"

Record the ChatGPT transcript along with the Cloudflare tunnel output and Cortex MCP logs that show `brAInwav MCP client connected` for audit purposes.

### 5. Post-deployment validation (2025-10-11)

1. Run `curl -H "X-API-Key: $MCP_API_KEY" https://<hostname>/mcp --data '{"jsonrpc":"2.0","id":1,"method":"ping"}'` and save the response beside the tunnel logs.
2. Confirm `https://<hostname>/health` returns `200` and attach the output to the TDD checklist.
3. Execute `pnpm test:smart`, `pnpm lint:smart`, `pnpm typecheck:smart`, and `pnpm security:scan`; note the timestamps and exit codes.
4. Update the relevant specs (`docs/operators/chatgpt-connector-bridge.md`, `docs/mcp/CHATGPT_CONNECTOR_MCP_SERVER_SUMMARY.md`, and `packages/mcp-server/IMPLEMENTATION_COMPLETE.md`) on the same day, citing the oversight ID from the latest `vibe_check` call.
## Available Tools

The enhanced server provides these MCP tools for ChatGPT:

### Required ChatGPT Tools

- `search`: Search both Cortex-OS and Local Memory
- `fetch`: Retrieve documents from either source

### Local Memory Tools  

- `local_memory_store`: Store content with tags/metadata
- `local_memory_search`: Search Local Memory specifically
- `local_memory_get`: Retrieve a specific memory item
- `local_memory_delete`: Remove a memory item

### Health & Status

- `ping`: Server health check
- `health_check`: Comprehensive status including Local Memory

## Environment Variables

Set these in your environment:

```bash
export LOCAL_MEMORY_BASE_URL="http://localhost:3028/api/v1"
export LOCAL_MEMORY_NAMESPACE="cortex-chatgpt"
export LOCAL_MEMORY_API_KEY="your-api-key"  # if required
```

Optional Auth0 OAuth configuration (matches the scopes published by the MCP server):

```bash
export AUTH_MODE=oauth2
export AUTH0_DOMAIN="brainwav.uk.auth0.com"
export AUTH0_AUDIENCE="https://cortex-mcp.brainwav.io/mcp"
export MCP_RESOURCE_URL="https://cortex-mcp.brainwav.io/mcp"
export REQUIRED_SCOPES="search.read docs.write memory.read memory.write memory.delete"
```

After setting these values, enable RBAC and “Add Permissions in the Access Token” on the Auth0 API so access tokens include the scopes.

Bridge-specific settings (nested under `MCPSettings.oauth`):

```bash
export CORTEX_MCP_OAUTH__ENABLED=true
export CORTEX_MCP_OAUTH__ISSUER="https://brainwav-dev.us.auth0.com"
export CORTEX_MCP_OAUTH__RESOURCE="https://cortex-mcp.brainwav.io/mcp"
export CORTEX_MCP_OAUTH__JWKS_URI="https://brainwav-dev.us.auth0.com/.well-known/jwks.json"   # optional override
export CORTEX_MCP_OAUTH__SCOPES='{"memory.store":["memories:write"],"memory.search":["memories:read"],"search":["knowledge:read"]}'
```

Validate the rollout and capture evidence for the deployment ticket:

```bash
curl -s https://cortex-mcp.brainwav.io/.well-known/oauth-protected-resource | jq
curl -s https://cortex-mcp.brainwav.io/health/auth | jq
```

The `/health/auth` output feeds the Ops dashboard (Grafana panel `MCP OAuth Health`) and verifies JWKS reachability plus scope metadata freshness.

## Troubleshooting

1. **Server won't start**: Run the installation commands in step 1 or re-run the startup script to trigger the automated installer
2. **Local Memory not responding**: Verify Local Memory service is running
3. **ChatGPT can't connect**: Ensure the Cloudflare tunnel is active, the API key header matches `MCP_API_KEY`, and rerun the validation checklist above

## Architecture

```text
ChatGPT Connectors → brAInwav FASTMCP Server → Local Memory (MCP + REST)
                                          ↘ Cortex-OS Knowledge Base
```

Developed by brAInwav Development Team.
