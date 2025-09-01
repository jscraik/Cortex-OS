# Cloudflare Tunnel Setup for Cortex Structure Guard

## Overview

The Cortex Structure Guard GitHub App is exposed through a Cloudflare tunnel at `insula-github.brainwav.io`, providing secure HTTPS access and protection against DDoS attacks.

## Configuration

### Tunnel Details

- **Hostname**: `insula-github.brainwav.io`
- **Local Port**: `3003`
- **Tunnel Name**: `insula-github-app`
- **Config File**: `infrastructure/cloudflare/tunnel.config.yml`

### Endpoints Exposed

1. **Main Application**: `https://insula-github.brainwav.io/`
2. **GitHub Webhooks**: `https://insula-github.brainwav.io/webhook`
3. **Health Check**: `https://insula-github.brainwav.io/health`
4. **API Endpoints**: `https://insula-github.brainwav.io/api/*`

## Setup Instructions

### 1. Configure Cloudflare Tunnel (Done in Cloudflare Dashboard)

Based on your screenshot, you've already configured:

- **Subdomain**: `insula-github`
- **Domain**: `brainwav.io`
- **Service Type**: `HTTP`
- **URL**: `localhost:3003`

### 2. Install Dependencies and Start Services

```bash
# Navigate to the structure guard directory
cd packages/cortex-structure-github

# Install dependencies
pnpm install

# Start both the app and tunnel
./start-with-tunnel.sh
```

### 3. Verify Setup

```bash
# Check if the app is running
pm2 status cortex-structure-github

# Test the endpoints
curl https://insula-github.brainwav.io/health
curl -X POST https://insula-github.brainwav.io/webhook -H "Content-Type: application/json" -d '{"test": true}'

# Check tunnel logs
tail -f logs/tunnel.log
```

## GitHub App Configuration

### Webhook URL

Set in your GitHub App settings:

```
https://insula-github.brainwav.io/webhook
```

### Webhook Events

Subscribe to these events for optimal structure monitoring:

- `push` - Monitor commits for structure violations
- `pull_request` - Validate PR changes
- `pull_request.opened` - Check structure on new PRs
- `pull_request.synchronize` - Re-validate on PR updates
- `repository` - Monitor repository settings changes

### Permissions Required

- **Repository permissions:**
  - Contents: Read & Write (to read files and create fix commits)
  - Pull requests: Read & Write (to comment on PRs)
  - Issues: Read & Write (to create structure violation issues)
  - Metadata: Read (to access repository information)

## Monitoring and Maintenance

### Health Checks

The app provides several health check endpoints:

- `GET /health` - Basic health status
- `GET /api/status` - Detailed application status
- `GET /api/metrics` - Performance metrics (if enabled)

### Log Monitoring

```bash
# PM2 application logs
pm2 logs cortex-structure-github

# Cloudflare tunnel logs
tail -f packages/cortex-structure-github/logs/tunnel.log

# Combined monitoring
pm2 logs cortex-structure-github | grep -E "(ERROR|WARN|structure)"
```

### Common Issues and Solutions

#### 1. Tunnel Connection Issues

```bash
# Restart the tunnel
pkill -f "cloudflared tunnel"
cloudflared tunnel --config infrastructure/cloudflare/tunnel.config.yml run insula-github-app

# Check tunnel status
cloudflared tunnel list
```

#### 2. App Not Responding

```bash
# Restart the PM2 process
pm2 restart cortex-structure-github

# Check for port conflicts
lsof -i :3003

# Verify environment variables
pm2 env cortex-structure-github
```

#### 3. Webhook Delivery Failures

- Check GitHub App webhook delivery logs
- Verify webhook secret matches
- Ensure tunnel is accessible from GitHub
- Check application logs for errors

## Security Considerations

### 1. Webhook Security

- Webhook signatures are verified using the secret
- Rate limiting is enabled (100 requests/minute by default)
- HTTPS is enforced through Cloudflare

### 2. Repository Access

- Uses GitHub App authentication for secure access
- Minimal permissions required for operation
- Supports both public and private repositories

### 3. Auto-Fix Safety

- Dry-run mode enabled by default
- Limited number of auto-fixes per PR (configurable)
- All changes are logged and auditable

## Environment Variables Summary

Key environment variables for tunnel integration:

```bash
# Core settings
PORT=3003
TUNNEL_HOSTNAME=insula-github.brainwav.io

# GitHub integration
GITHUB_TOKEN=your_token_here
WEBHOOK_SECRET=your_webhook_secret_here
STRUCTURE_APP_ID=your_app_id_here

# Safety settings
AUTO_FIX_ENABLED=true
DRY_RUN=false
MAX_AUTO_FIXES_PER_PR=10
```

## Integration with Other Cortex Apps

The Structure Guard app complements the existing Cortex ecosystem:

- **Port 3001**: cortex-ai-github (AI automation)
- **Port 3002**: cortex-semgrep-github (Security scanning)  
- **Port 3003**: cortex-structure-github (Structure validation)

All apps use Cloudflare tunnels for secure external access and can work together to provide comprehensive repository management.
