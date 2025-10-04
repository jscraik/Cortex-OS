# Development Setup Guide

This guide covers setting up a complete Cortex-OS development environment with all services and GitHub Apps.

## Prerequisites

- **Node.js** 20 or later
- **pnpm** 9.9.0 (exact version required)
- **Git** 2.40+
- **Docker** (optional, for containerized deployment)

## Initial Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/cortex-os/cortex-os.git
cd cortex-os

# Install dependencies
pnpm install

# Verify installation
pnpm readiness:check
```

### 2. Environment Configuration

Set up your environment variables:

```bash
# Optional: Set custom configuration location (default: ~/.Cortex-OS)
export CORTEX_OS_HOME="$HOME/.Cortex-OS"

# Create configuration directory if it doesn't exist
mkdir -p "$CORTEX_OS_HOME/config"
```

### 3. Port Configuration

Cortex-OS uses a centralized port registry. The default configuration is:

- **MCP Server**: 3000 (reserved for Cloudflare tunnel)
- **GitHub AI App**: 3001
- **Semgrep App**: 3002
- **Structure App**: 3003

#### View Current Port Configuration

```bash
# Check which ports are in use
./free-ports.sh list

# View port registry
cat config/ports.env
```

#### Free Ports if Needed

```bash
# Free all GitHub app ports
./free-ports.sh all

# Free specific ports
./free-ports.sh 3001 3002
```

## GitHub Apps Setup

### 1. Diagnostic Check

Before setting up GitHub Apps, run the diagnostic script:

```bash
./github-apps-diagnostic.sh
```

This will show:

- Current process status
- Port availability
- Configuration requirements
- Setup instructions

### 2. Start GitHub Apps

```bash
# Start all GitHub apps with placeholder configuration
./start-github-apps.sh
```

This script will:

- Check port availability
- Start all three GitHub apps
- Provide status feedback
- Give next steps for configuration

### 3. Configuration Requirements

⚠️ **Important**: The initial setup uses placeholder configuration. You need to:

1. **Set up real GitHub tokens** in the `.env` files:
   - `packages/cortex-ai-github/.env`
   - `packages/cortex-semgrep-github/.env`
   - `packages/cortex-structure-github/.env`

2. **Create actual GitHub Apps** and get webhook secrets

3. **Configure webhook URLs** pointing to your tunnel/domain endpoints

## Core Development Commands

### Build and Test

```bash
# Build all packages
pnpm build

# Run tests with coverage
pnpm test:coverage

# Run security scanning
pnpm security:scan

# Lint and format code
pnpm lint && pnpm format
```

### Development Servers

```bash
# Start core runtime
pnpm dev

# Start specific applications
cd apps/cortex-code && cargo run        # TUI interface
```

### GitHub Apps Management

```bash
# Check status
./github-apps-diagnostic.sh

# Start all apps
./start-github-apps.sh

# Free ports if needed
./free-ports.sh all

# Monitor logs
tail -f packages/cortex-ai-github/logs/app.log
tail -f packages/cortex-semgrep-github/logs/app.log
tail -f packages/cortex-structure-github/logs/app.log
```

## Troubleshooting

### Port Conflicts

If you encounter port conflicts:

```bash
# Check what's using your ports
./free-ports.sh list

# Free specific ports
./free-ports.sh 3001 3002 3003

# Or free all GitHub app ports
./free-ports.sh all
```

### Service Status Issues

Check service logs:

```bash
# View recent logs
tail -f packages/*/logs/app.log

# Check process status
./github-apps-diagnostic.sh
```

### Configuration Issues

Verify your configuration:

```bash
# Check port registry
cat config/ports.env

# Verify environment setup
echo $CORTEX_OS_HOME

# Test endpoints
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

## Advanced Configuration

### Custom Port Configuration

To customize ports, edit `config/ports.env`:

```bash
# config/ports.env
MCP_PORT=3000
GITHUB_AI_PORT=3001
SEMGREP_PORT=3002
STRUCTURE_PORT=3003
```

### Environment Variables

Key environment variables:

- `CORTEX_OS_HOME` - Configuration and data directory (default: `~/.Cortex-OS`)
- `NODE_ENV` - Development environment (development/production)
- `GITHUB_TOKEN` - GitHub personal access token for API access

### Service Configuration

Each GitHub app has its own configuration:

1. **cortex-ai-github** - AI-powered code review and assistance
2. **cortex-semgrep-github** - Security scanning and vulnerability detection
3. **cortex-structure-github** - Repository structure validation

Configure each by copying the example environment files:

```bash
cp packages/cortex-ai-github/.env.example packages/cortex-ai-github/.env
cp packages/cortex-semgrep-github/.env.example packages/cortex-semgrep-github/.env
cp packages/cortex-structure-github/.env.example packages/cortex-structure-github/.env
```

## Next Steps

1. **Configure Real GitHub Tokens** - Replace placeholder tokens with real ones
2. **Set Up GitHub Apps** - Create GitHub Apps in your organization
3. **Configure Webhooks** - Point webhooks to your service endpoints
4. **Test Integration** - Verify GitHub Apps respond to repository events
5. **Monitor Services** - Use diagnostic tools to ensure everything is working

For more details, see:

- [GitHub Apps Commands](./github-apps-commands.md)
- [MCP Integration Guide](./mcp/)
- [Architecture Overview](./architecture.md)
