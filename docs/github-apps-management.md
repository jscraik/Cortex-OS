# GitHub Apps Management Guide

This guide covers managing the three GitHub Apps in the Cortex-OS system: AI, Semgrep, and Structure Guard.

## Overview

Cortex-OS includes three autonomous GitHub Apps:

1. **cortex-ai-github** (Port 3001) - AI-powered code review and assistance
2. **cortex-semgrep-github** (Port 3002) - Security scanning and vulnerability detection
3. **cortex-structure-github** (Port 3003) - Repository structure validation

## Quick Start

### Check Status

```bash
# Run diagnostic to see current status
./github-apps-diagnostic.sh
```

### Start All Apps

```bash
# Start all three GitHub apps
./start-github-apps.sh
```

### Manage Ports

```bash
# View port usage
./free-ports.sh list

# Free all GitHub app ports
./free-ports.sh all

# Free specific ports
./free-ports.sh 3001 3002
```

## Configuration

### Port Registry

Ports are managed centrally via the configuration registry:

```bash
# View current port assignments
cat config/ports.env

# Example content:
# MCP_PORT=3000
# GITHUB_AI_PORT=3001
# SEMGREP_PORT=3002
# STRUCTURE_PORT=3003
```

### Environment Variables

Each app requires configuration via `.env` files:

#### cortex-ai-github

```bash
# packages/cortex-ai-github/.env
GITHUB_TOKEN=your_github_token
WEBHOOK_SECRET=your_webhook_secret
APP_ID=your_app_id
# IMPORTANT: Do NOT paste actual keys here. Use environment files and secret stores.
# Use a file path or base64 string from a secure secret manager (placeholder below):
PRIVATE_KEY_PATH="/secure/path/to/your/github-app-private-key.pem"
## Alternatively (CI only), inject via env var from secrets manager:
# GITHUB_APP_PRIVATE_KEY_B64="<base64-encoded-key-from-secrets-manager>"
```

#### cortex-semgrep-github

```bash
# packages/cortex-semgrep-github/.env
GITHUB_TOKEN=your_github_token
WEBHOOK_SECRET=your_webhook_secret
SEMGREP_TOKEN=your_semgrep_token
```

#### cortex-structure-github

```bash
# packages/cortex-structure-github/.env
GITHUB_TOKEN=your_github_token
WEBHOOK_SECRET=your_webhook_secret
```

## Management Scripts

### Diagnostic Script

The diagnostic script provides comprehensive status information:

```bash
./github-apps-diagnostic.sh
```

**Output includes:**

- Port registry configuration
- Process status for each app
- Port availability and usage
- Environment variable status
- Configuration suggestions
- Setup instructions

### Startup Script

The startup script handles launching all GitHub apps:

```bash
./start-github-apps.sh
```

**Features:**

- Loads port configuration from central registry
- Checks port availability before starting
- Creates log directories
- Starts services with proper environment variables
- Provides status feedback and next steps

### Port Management Script

Manage port allocation and conflicts:

```bash
# List current port usage
./free-ports.sh list

# Free all GitHub app ports (3001, 3002, 3003)
./free-ports.sh all

# Free specific ports
./free-ports.sh 3001 3002
```

## Service Management

### Starting Services

#### Start All Services

```bash
./start-github-apps.sh
```

#### Start Individual Services

```bash
# Start AI GitHub app
cd packages/cortex-ai-github
PORT=3001 pnpm dev

# Start Semgrep app
cd packages/cortex-semgrep-github
PORT=3002 pnpm dev

# Start Structure app
cd packages/cortex-structure-github
PORT=3003 pnpm dev
```

### Monitoring Services

#### Check Service Status

```bash
# Use diagnostic script
./github-apps-diagnostic.sh

# Check specific ports
curl http://localhost:3001/health  # AI app
curl http://localhost:3002/health  # Semgrep app
curl http://localhost:3003/health  # Structure app
```

#### View Logs

```bash
# View all logs
tail -f packages/*/logs/app.log

# View specific app logs
tail -f packages/cortex-ai-github/logs/app.log
tail -f packages/cortex-semgrep-github/logs/app.log
tail -f packages/cortex-structure-github/logs/app.log
```

### Stopping Services

#### Stop All Services

```bash
# Free all GitHub app ports (kills processes)
./free-ports.sh all
```

#### Stop Individual Services

```bash
# Find and kill specific processes
lsof -ti:3001 | xargs kill  # AI app
lsof -ti:3002 | xargs kill  # Semgrep app
lsof -ti:3003 | xargs kill  # Structure app
```

## Troubleshooting

### Common Issues

#### Port Conflicts

**Problem**: Port already in use

```bash
❌ Port 3001 is already in use
```

**Solution**: Free the port

```bash
./free-ports.sh 3001
# or
./free-ports.sh all
```

#### Configuration Missing

**Problem**: Missing environment variables

```bash
⚠️ Missing .env file for cortex-ai-github
```

**Solution**: Copy example files and configure

```bash
cp packages/cortex-ai-github/.env.example packages/cortex-ai-github/.env
# Edit the file with your actual values
```

#### Service Won't Start

**Problem**: Service fails to start

```bash
❌ cortex-ai-github failed to start
```

**Solution**: Check logs and configuration

```bash
# Check logs
tail -f packages/cortex-ai-github/logs/app.log

# Verify configuration
./github-apps-diagnostic.sh

# Restart service
cd packages/cortex-ai-github && PORT=3001 pnpm dev
```

### Debug Commands

```bash
# Check process status
ps aux | grep -E "(cortex-ai|cortex-semgrep|cortex-structure)"

# Check port usage
lsof -i :3001,3002,3003

# Check configuration
cat config/ports.env
ls -la packages/*/

# Test endpoints
for port in 3001 3002 3003; do
  echo "Testing port $port:"
  curl -s http://localhost:$port/health || echo "No response"
done
```

## GitHub App Setup

### Creating GitHub Apps

Each service needs a corresponding GitHub App:

1. **Go to GitHub Settings** → Developer settings → GitHub Apps
2. **Create New GitHub App** for each service
3. **Configure Permissions** based on service needs
4. **Set Webhook URL** to your service endpoint
5. **Generate Private Key** and save securely

### Webhook Configuration

Configure webhook URLs for your deployed services:

```bash
# Production webhook URLs (example)
AI App:      https://cortex-github.brainwav.io/webhook
Semgrep App: https://semgrep-github.brainwav.io/webhook
Structure:   https://insula-github.brainwav.io/webhook

# Development webhook URLs (using ngrok or similar)
AI App:      https://your-tunnel.ngrok.io/webhook
Semgrep App: https://your-tunnel2.ngrok.io/webhook
Structure:   https://your-tunnel3.ngrok.io/webhook
```

### App Permissions

#### cortex-ai-github

- Issues: Read & Write
- Pull requests: Read & Write
- Contents: Read
- Metadata: Read

#### cortex-semgrep-github

- Issues: Read & Write
- Pull requests: Read & Write
- Contents: Read
- Security advisories: Read

#### cortex-structure-github

- Issues: Read & Write
- Pull requests: Read & Write
- Contents: Read
- Administration: Read

## Usage Examples

### Manual Commands

Each GitHub app responds to specific commands in comments:

#### AI App Commands

```bash
@cortex review     # Review the current PR
@cortex analyze    # Analyze code patterns
@cortex secure     # Security analysis
@cortex document   # Generate documentation
@cortex triage     # Triage issues
@cortex optimize   # Performance optimization
@cortex health     # Health check
@cortex fix        # Suggest fixes
```

#### Semgrep App Commands

```bash
@semgrep scan      # Run security scan
@semgrep help      # Show available commands
```

#### Structure App Commands

```bash
@insula analyze    # Analyze repository structure
@insula validate   # Validate against policies
```

### Automated Triggers

Apps automatically respond to:

- New pull requests
- Pull request updates
- New issues
- Push events (configured)

## Best Practices

### Development Workflow

1. **Start with diagnostic**: Always run `./github-apps-diagnostic.sh`
2. **Free ports first**: Use `./free-ports.sh all` before starting
3. **Monitor logs**: Keep log windows open during development
4. **Test endpoints**: Verify services respond to health checks
5. **Use proper configuration**: Don't use placeholder tokens in production

### Configuration Management

1. **Use environment files**: Keep secrets in `.env` files, not code
2. **Version control exclusion**: Never commit `.env` files
3. **Backup configuration**: Keep secure backups of private keys
4. **Rotate credentials**: Regularly rotate tokens and secrets

### Monitoring and Maintenance

1. **Regular health checks**: Use diagnostic script regularly
2. **Log rotation**: Monitor log file sizes
3. **Port management**: Clean up unused processes
4. **Configuration validation**: Verify setup after changes

## Integration with Cortex-OS

The GitHub Apps integrate seamlessly with the broader Cortex-OS ecosystem:

- **A2A Communication**: Apps communicate via A2A event bus
- **MCP Integration**: Use MCP tools for external integrations
- **Memory System**: Store context and history in memories package
- **Orchestration**: Coordinate multi-app workflows via orchestration

For more information, see:

- [Architecture Overview](./architecture.md)
- [Development Setup](./development-setup.md)
- [MCP Integration Guide](./mcp/)
