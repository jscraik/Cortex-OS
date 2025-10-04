# Cortex-OS DevContainer Setup

This directory contains the DevContainer configuration for Cortex-OS, providing a consistent, reproducible development environment.

## Quick Start

### Using VS Code

1. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Open the project in VS Code
3. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
4. Select "Dev Containers: Reopen in Container"
5. Wait for the container to build (first time takes ~5-10 minutes)

### Using CLI

```bash
# Install devcontainer CLI
npm install -g @devcontainers/cli

# Build and run the container
devcontainer up --workspace-folder .

# Execute commands in the container
devcontainer exec --workspace-folder . bash
```

## What's Included

### Development Tools

- **Node.js 22.12.0** - Primary runtime
- **pnpm 10.4.0** - Package manager
- **Rust 1.80.1** - For Rust components
- **Python 3.12.6** - For cortex-py
- **Docker CLI** - For container operations
- **mise** - Tool version management

### VS Code Extensions

- ESLint, Prettier, Biome - Code formatting
- TypeScript/JavaScript support
- Rust Analyzer
- Python extensions (Black, Ruff)
- Docker extension
- Copilot integration
- Vitest explorer

### Pre-configured Services

- **Qdrant** - Vector database (port 6333)
- **Redis** - Caching (port 6379)
- **PostgreSQL** - Advanced features (port 5432)

### Port Forwarding

All development ports are automatically forwarded:
- 3000 - MCP Server (Cloudflare Tunnel)
- 3001 - GitHub AI App
- 3002 - Semgrep App
- 3003 - Structure App
- 3028 - Local Memory API
- 6333 - Qdrant Dashboard
- 9600 - MCP Hub HTTP
- 9700 - REST API

## Development Workflow

### First Time Setup

1. Container builds automatically
2. Dependencies are installed
3. Git hooks are configured
4. Welcome message displayed

### Daily Development

```bash
# Start all services
pnpm dev

# Run tests
pnpm test

# Lint and format
pnpm lint
pnpm format

# Build project
pnpm build

# Memory-safe testing
pnpm test:safe
```

### Managing Services

```bash
# Start additional services
docker-compose -f docker/memory-stack/docker-compose.new.yml up -d

# Check service status
docker ps

# View logs
docker-compose -f docker/memory-stack/docker-compose.new.yml logs -f
```

## Troubleshooting

### Container Won't Build

1. Check Docker is running
2. Verify you have enough disk space
3. Try rebuilding: `Dev Containers: Rebuild Container`

### Ports Already in Use

The DevContainer automatically detects and avoids port conflicts. If you see errors:

1. Stop other services using those ports
2. Or modify `.devcontainer/devcontainer.json` to use different ports

### Performance Issues

1. Increase Docker memory allocation (recommended: 8GB+)
2. Use SSD storage
3. Exclude `node_modules` from file syncing

### Extension Issues

If extensions don't install:

1. Open Command Palette
2. Run "Extensions: Show Installed Extensions"
3. Install manually from VS Code Marketplace

## Customization

### Adding New Extensions

Edit `.devcontainer/devcontainer.json`:

```json
"customizations": {
  "vscode": {
    "extensions": [
      "existing.extension",
      "new.extension.to.add"
    ]
  }
}
```

### Changing Node Version

Update `.devcontainer/Dockerfile`:

```dockerfile
FROM node:22.12.0-bullseye as base
# Change to your preferred version
```

### Adding New Services

Edit `.devcontainer/docker-compose.devcontainer.yml`:

```yaml
services:
  new-service:
    image: service-image:latest
    ports:
      - "1234:1234"
```

## File Structure

```
.devcontainer/
├── devcontainer.json          # Main configuration
├── docker-compose.devcontainer.yml  # Services for development
├── Dockerfile                 # Container definition
└── README.md                  # This file

scripts/ (created automatically)
├── dev-setup-oncreate.sh      # Runs once on container creation
├── dev-setup-postcreate.sh    # Runs after creation
├── dev-setup-poststart.sh     # Runs every time container starts
└── dev-setup-update.sh        # Update dependencies
```

## Best Practices

1. **Commit changes**: The container configuration is part of your project
2. **Use .devcontainerignore**: Exclude unnecessary files
3. **Document dependencies**: Add any new system dependencies to Dockerfile
4. **Keep it lean**: Only install what's needed for development
5. **Version pin**: Pin all versions for reproducibility

## Security Notes

- Containers run as non-root user (vscode)
- Docker socket is mounted for container-in-container
- SSH keys are mounted read-only
- Git config is optional and read-only

## Need Help?

- [Dev Containers documentation](https://code.visualstudio.com/docs/devcontainers/containers)
- [Cortex-OS documentation](/docs)
- Create an issue in the repository