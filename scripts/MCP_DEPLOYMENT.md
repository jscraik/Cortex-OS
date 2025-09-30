# MCP Deployment Automation

This directory contains automation scripts for deploying the brAInwav Cortex MCP server to production.

## 🚀 Quick Start

### Option 1: Automated Deployment (Recommended)

```bash
# Full automated deployment
./scripts/deploy-mcp.sh

# Dry run to see what would happen
./scripts/deploy-mcp.sh --dry-run

# Deploy to specific host
./scripts/deploy-mcp.sh --host your-mcp-host
```

### Option 2: Manual Build Only

```bash
# Just build the package locally
./scripts/build-mcp.sh
```

## 📋 Prerequisites

### Local Machine

- `uv` (Python package manager)
- `ssh` and `scp` (for remote deployment)
- `curl` and `jq` (for verification)
- SSH key access to your MCP host

### Remote Host

- Python 3.12+
- `pip` package manager
- `systemd` service management
- Service user with sudo privileges for systemctl

### Optional: Cloudflare Integration

- Cloudflare Zone ID
- Cloudflare API Token with Cache Purge permissions

## 🛠️ Scripts Overview

### `deploy-mcp.sh` - Complete Deployment Automation

Automates the entire deployment process:

1. **Build Phase**: Creates wheel and source distributions
2. **Transfer Phase**: Copies packages to remote host via SCP
3. **Service Phase**: Stops service, upgrades package, restarts service
4. **Cache Phase**: Purges Cloudflare CDN cache for manifest
5. **Verification Phase**: Validates deployment success

#### Usage Examples

```bash
# Standard deployment
./scripts/deploy-mcp.sh

# Dry run (show what would happen)
./scripts/deploy-mcp.sh --dry-run

# Force rebuild even if wheel exists
./scripts/deploy-mcp.sh --force-rebuild

# Deploy to custom host with specific transport
./scripts/deploy-mcp.sh --host production-mcp --transport sse

# Skip specific phases
./scripts/deploy-mcp.sh --skip-cloudflare --skip-service

# Deploy only (skip build)
./scripts/deploy-mcp.sh --skip-build
```

#### Command Line Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Show what would be done without executing |
| `--force-rebuild` | Force rebuild even if wheel exists |
| `--skip-build` | Skip the build step |
| `--skip-transfer` | Skip the transfer step |
| `--skip-service` | Skip service management |
| `--skip-cloudflare` | Skip Cloudflare cache purge |
| `--host HOST` | Remote host for deployment |
| `--service NAME` | Service name to manage |
| `--transport TYPE` | Transport type to set |

### `build-mcp.sh` - Local Build Only

Simple script that only builds the MCP package locally without deployment.

```bash
./scripts/build-mcp.sh
```

Outputs wheel and source distribution to `packages/cortex-mcp/dist/`

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_HOST` | `brainwav-mcp` | Remote host for deployment |
| `SERVICE_NAME` | `cortex-fastmcp.service` | systemd service name |
| `TRANSPORT` | `streamable-http` | MCP transport type |
| `CLOUDFLARE_ZONE_ID` | - | Cloudflare Zone ID |
| `CLOUDFLARE_API_TOKEN` | - | Cloudflare API Token |
| `DRY_RUN` | `false` | Enable dry run mode |

### Cloudflare Setup

1. Copy the template:

   ```bash
   cp packages/cortex-mcp/infrastructure/cloudflare/.env.template \
      packages/cortex-mcp/infrastructure/cloudflare/.env
   ```

2. Edit the file with your credentials:

   ```bash
   export CLOUDFLARE_ZONE_ID="your-zone-id-here"
   export CLOUDFLARE_API_TOKEN="your-api-token-here"
   ```

3. Create API Token at: <https://dash.cloudflare.com/profile/api-tokens>
   - Permissions: Zone:Cache Purge, Zone:Zone Read
   - Zone Resources: Include your domain zone

## 🔍 Verification Steps

After deployment, the script automatically verifies:

1. **Service Status**: Checks if systemd service is active
2. **Manifest Accessibility**: Validates MCP manifest at public URL
3. **Transport Configuration**: Confirms correct transport setting
4. **Health Endpoint**: Tests basic connectivity

Manual verification commands:

```bash
# Check service status
ssh your-host 'sudo systemctl status cortex-fastmcp.service'

# Check manifest
curl -fsSL https://cortex-mcp.brainwav.io/.well-known/mcp.json | jq

# Monitor logs
ssh your-host 'journalctl -u cortex-fastmcp.service -f'
```

## 🚨 Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clean and retry
cd packages/cortex-mcp
rm -rf dist build .venv
uv sync
uv build
```

#### SSH Connection Issues

```bash
# Test SSH connectivity
ssh -o ConnectTimeout=10 your-host 'echo "Connected"'

# Check SSH key
ssh-add -l
```

#### Service Start Failures

```bash
# Check service logs
ssh your-host 'journalctl -u cortex-fastmcp.service --no-pager -n 50'

# Check Python environment
ssh your-host 'python3 -c "import cortex_fastmcp_server_v2; print(\"Import OK\")"'
```

#### Cloudflare Cache Issues

```bash
# Manual cache purge
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://cortex-mcp.brainwav.io/.well-known/mcp.json"]}'
```

### Debug Mode

Enable verbose logging:

```bash
./scripts/deploy-mcp.sh --dry-run  # See what would happen
tail -f logs/mcp-deployment-*.log  # Monitor deployment logs
```

## 📝 Logs

Deployment logs are automatically saved to:

```
logs/mcp-deployment-YYYYMMDD-HHMMSS.log
```

Logs include:

- Timestamp for each operation
- Success/failure status
- Error details and troubleshooting hints
- SSH command outputs
- Service status information

## 🔄 ChatGPT Integration

After successful deployment:

1. **Remove old connector** in ChatGPT → Settings → MCP
2. **Add new connector** with URL: `https://cortex-mcp.brainwav.io/mcp`
3. **Test functionality**:

   ```bash
   /mcp.tool call cortex-mcp search '{"query":"FastMCP manifest smoke"}'
   ```

## 🏗️ Development Workflow

For development iterations:

```bash
# Quick build and test locally
./scripts/build-mcp.sh

# Deploy to staging
MCP_HOST=staging-mcp ./scripts/deploy-mcp.sh

# Deploy to production with verification
./scripts/deploy-mcp.sh --host production-mcp
```

## 📚 Related Documentation

- [`packages/cortex-mcp/README.md`](../packages/cortex-mcp/README.md) - MCP package details
- [`packages/cortex-mcp/DEPLOYMENT.md`](../packages/cortex-mcp/DEPLOYMENT.md) - Manual deployment guide
- [`packages/cortex-mcp/FASTMCP_README.md`](../packages/cortex-mcp/FASTMCP_README.md) - FastMCP implementation
