# Local Memory MCP & REST API - brAInwav

**Status:** Production Ready  
**Maintainer:** brAInwav Development Team  
**Version:** 0.1.0

## Overview

Local Memory provides persistent knowledge management for Cortex-OS. This package contains the **REST API server** (optional) that provides HTTP access to memory operations.

**Note**: Most users access memory through the **MCP Server** (port 3024 in `packages/mcp-server`), which is already running and provides full memory functionality. This REST API server (port 3028) is only needed for direct HTTP/REST integrations outside of MCP protocol.

## Features

- ✅ **REST API Server**: HTTP endpoints for memory operations (port 3028)
- ✅ **Complete API**: Store, search, analyze, relationships, stats endpoints
- ✅ **Optional Service**: Only needed for non-MCP HTTP integrations
- ✅ **OAuth Authentication**: Secure auth-handler with token management
- ✅ **License Management**: Enterprise-grade licensing with 1Password integration
- ✅ **OpenTelemetry**: Full observability with traces, logs, and metrics
- ✅ **brAInwav Branding**: All outputs include brAInwav references

## Architecture Clarification

**Primary Access**: Memory is primarily accessed through the **MCP Server** (`packages/mcp-server` on port 3024), which provides:
- MCP protocol tools (memory.store, memory.search, etc.)
- Direct access to memory-core library
- STDIO transport for Claude Desktop
- HTTP/SSE transport for ChatGPT
- Already running and functional

**This Package**: Provides an optional **standalone REST API** server for:
- HTTP REST integrations outside MCP protocol
- Direct API access for custom applications
- Alternative to MCP protocol when needed

## ⚡ Quick Start

**Get started in 2 commands:**

```bash
cd apps/cortex-os/packages/local-memory
pnpm start:service
```

This automatically:
- ✅ Checks Ollama and required models
- ✅ Starts Qdrant if installed
- ✅ Builds TypeScript code
- ✅ Starts REST API on port 3028
- ✅ Verifies health checks

**Test it:**
```bash
curl http://127.0.0.1:3028/healthz
```

**New in this release:**
- 🚀 One-command startup with dependency checks
- 🔧 Automated port configuration
- 🧪 Complete test suite
- 📚 Comprehensive troubleshooting guides

**Important**: For most users, this REST API server is **not required**. The MCP Server (`packages/mcp-server` on port 3024) already provides full memory access via MCP protocol and is the recommended primary interface.

See [`docs/SETUP.md`](docs/SETUP.md) for detailed instructions.

## 🔄 Autostart on System Boot (Optional)

**Configure the service to start automatically at login and shutdown gracefully at logout:**

```bash
cd apps/cortex-os/packages/local-memory
chmod +x scripts/*.sh
pnpm install:autostart
```

This configures a macOS LaunchAgent that:
- ✅ Starts automatically when you log in
- ✅ Restarts automatically if it crashes
- ✅ Shuts down gracefully at logout/shutdown
- ✅ Provides system-level service management

**Management:**
```bash
# Check status
launchctl list | grep brainwav

# Stop service
launchctl stop com.brainwav.local-memory

# Start service
launchctl start com.brainwav.local-memory

# Restart service
launchctl kickstart -k gui/$(id -u)/com.brainwav.local-memory

# Uninstall autostart
pnpm uninstall:autostart
```

**View Logs:**
```bash
tail -f logs/launchd-stdout.log  # Service output
tail -f logs/launchd-stderr.log  # Errors
tail -f logs/local-memory.log    # Application logs
```

See [`docs/AUTOSTART.md`](docs/AUTOSTART.md) for complete documentation, troubleshooting, and platform-specific instructions (Linux systemd, Windows Task Scheduler).

## Architecture

### Cortex-OS Memory Access Layers

```
┌─────────────────────────────────────────────────────────┐
│              Client Applications                     │
│  Claude Desktop | ChatGPT | VS Code | Custom Apps   │
└────────┬───────────────────────────────┬────────┘
         │                               │
         │ MCP Protocol                  │ HTTP/REST
         │                               │
  ┌──────┴──────────────┐      ┌────────┴──────────────┐
  │  MCP Server (PRIMARY)  │      │  REST API (OPTIONAL) │
  │  Port: 3024            │      │  Port: 3028          │
  │  packages/mcp-server   │      │  This Package        │
  │                        │      │                      │
  │  • STDIO transport    │      │  • HTTP endpoints    │
  │  • HTTP/SSE transport │      │  • For non-MCP use   │
  │  • MCP tools         │      │  • Custom apps       │
  └─────────┬────────────┘      └─────────┬────────────┘
           │                             │
           └───────────┬─────────────┘
                      │
              ┌───────┴─────────┐
              │  Memory Core      │
              │  (@cortex-os/     │
              │   memory-core)    │
              │                   │
              │  • SQLite DB     │
              │  • Qdrant        │
              │  • Embeddings    │
              └───────────────────┘
```

### Key Points

1. **MCP Server (Port 3024)** - Primary interface
   - Already running and functional
   - Used by Claude Desktop, ChatGPT, IDEs
   - Provides full memory access via MCP protocol
   - Located in `packages/mcp-server`

2. **REST API Server (Port 3028)** - Optional service
   - This package provides the REST API
   - Only needed for non-MCP HTTP integrations
   - Not required if using MCP protocol
   - Located in `apps/cortex-os/packages/local-memory`

3. **Memory Core** - Shared backend
   - Both servers use the same memory-core library
   - SQLite database + optional Qdrant vectors
   - No data duplication between services

## Installation & Setup

### Prerequisites

1. **Node.js**: v18+ with pnpm
2. **Ollama**: For embedding models
3. **Qdrant**: Optional, for enhanced performance

```bash
# Install Ollama models
ollama pull nomic-embed-text
ollama pull qwen2.5:3b

# Install Qdrant (optional)
# See installation docs in repository root
```

### Build & Start

#### Quick Start (Recommended)

```bash
# One-command startup (checks dependencies, starts Qdrant, builds, and starts server)
cd apps/cortex-os/packages/local-memory
pnpm start:service

# The script will:
# 1. Check Ollama and required models
# 2. Start Qdrant if needed
# 3. Build the TypeScript code
# 4. Start REST API server on port 3028
# 5. Verify health checks
```

#### Manual Start

```bash
# Build the package
pnpm build

# Start REST API server directly
pnpm start

# Or with environment variables
MEMORY_API_PORT=3028 LOCAL_MEMORY_HOST=0.0.0.0 pnpm start
```

#### Verify Services

```bash
# Check REST API health
curl http://localhost:3028/healthz

# Expected response:
# {"success":true,"data":{"healthy":true,"timestamp":"..."}}

# Check Qdrant (if using)
curl http://localhost:6333/healthz

# Check Ollama models
ollama list
```

#### Stop Services

```bash
# Stop local-memory service
pnpm stop:service

# Or manually
kill $(cat logs/server.pid)

# Stop Qdrant (optional)
pkill -f qdrant
```

## Configuration

### Environment Variables

```bash
# Port Configuration (sourced from config/ports.env)
MEMORY_API_PORT=3028              # REST API port (canonical)
LOCAL_MEMORY_PORT=3028            # Backward compatibility

# Host Configuration
LOCAL_MEMORY_HOST=0.0.0.0         # Bind to all interfaces

# Note: This REST API server is separate from the MCP server
# The MCP server (packages/mcp-server) runs independently on port 3024

# Authentication
MCP_API_KEY=<your-api-key>        # For MCP protocol auth
NO_AUTH=true                      # Development only: disable auth

# Observability
MEMORY_LOG_LEVEL=info             # Log level: trace, debug, info, warn, error
OTEL_EXPORTER_OTLP_ENDPOINT=...   # OpenTelemetry collector

# Storage
MEMORIES_SHORT_STORE=qdrant       # Options: memory, qdrant
MEMORIES_EMBEDDER=ollama          # Options: ollama, openai
```

### Port Registry

All port assignments are managed centrally in `config/ports.env`:

```bash
CORTEX_MCP_PORT=3024
LOCAL_MEMORY_MCP_PORT=3026
MEMORY_API_PORT=3028              # ← Local Memory REST API
PIECES_OS_PORT=39300
OLLAMA_PORT=11434
```

**Important**: Always update `config/ports.env` first, then sync to other configs.

## REST API Endpoints

### Base URL
```
http://localhost:3028
```

### Health & Status
- `GET /healthz` - Health check with detailed status
- `GET /readyz` - Readiness probe

### Memory Operations
- `POST /memory/store` - Store new memory
- `POST /memory/search` - Search memories
- `POST /memory/analysis` - Analyze memory patterns
- `POST /memory/relationships` - Manage memory relationships
- `POST /memory/stats` - Get memory statistics

### Maintenance
- `POST /maintenance/optimize` - Optimize storage
- `POST /maintenance/cleanup` - Cleanup old data

### Example Request

```bash
curl -X POST http://localhost:3028/memory/store \
  -H 'Content-Type: application/json' \
  -d '{
    "content": "Implemented dual-mode local memory with MCP and REST API",
    "importance": 9,
    "tags": ["architecture", "local-memory", "dual-mode"],
    "domain": "cortex-os",
    "metadata": {
      "branding": "brAInwav",
      "feature": "memory-persistence"
    }
  }'
```

### Response Format

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "content": "...",
    "importance": 9,
    "tags": ["..."],
    "timestamp": "2025-10-11T20:00:00Z"
  }
}
```

## MCP Integration

**Important**: This REST API package does NOT provide MCP integration. For MCP protocol access, use the **MCP Server** (`packages/mcp-server` on port 3024).

The MCP Server provides:
- `memory.store` - Store memories
- `memory.search` - Search memories
- `memory.analysis` - Analyze patterns
- `memory.relationships` - Find connections
- `memory.stats` - Get statistics

See `packages/mcp-server/README.md` for MCP configuration.

### If You Need REST API Access

This package provides HTTP REST endpoints as an alternative to MCP protocol for custom applications that don't support MCP.

## Development

### Scripts

```bash
# Development with watch mode
pnpm dev

# Build TypeScript
pnpm build

# Run tests
pnpm test
pnpm test:watch
pnpm test:safe         # Safe test runner for CI

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Evaluation
pnpm eval              # Run evaluations
pnpm eval:ragas        # RAGAS metrics
pnpm eval:gdpr         # GDPR compliance

# License Management
pnpm license           # License CLI
pnpm license:info      # Show license info
pnpm license:check     # Check 1Password

# Service Management
pnpm start:service     # Start with dependency checks
pnpm stop:service      # Stop service
pnpm restart:service   # Restart service
pnpm test:api          # Test REST API endpoints

# Autostart Configuration
pnpm install:autostart   # Install LaunchAgent (macOS)
pnpm uninstall:autostart # Remove LaunchAgent
```

### Project Structure

```
apps/cortex-os/packages/local-memory/
├── src/
│   ├── auth/              # OAuth & auth handlers
│   │   ├── auth-handler.ts
│   │   ├── oauth-client.ts
│   │   └── types.ts
│   ├── cli/               # CLI tools
│   │   ├── license-manager.ts
│   │   └── local-eval.ts
│   ├── evaluation/        # Evaluation framework
│   ├── license/           # License management
│   ├── observability/     # OpenTelemetry integration
│   ├── retrieval/         # Search & retrieval
│   ├── index.ts           # Package exports
│   └── server.ts          # REST API server
├── __tests__/             # Test files
├── docs/                  # Documentation
├── package.json
├── tsconfig.json
└── README.md              # This file
```

## Testing

### Unit Tests

```bash
pnpm test
```

### Integration Tests

```bash
# Start service in test mode
MEMORY_API_PORT=3028 pnpm start

# Run integration tests
curl http://localhost:3028/healthz
curl -X POST http://localhost:3028/memory/store -H 'Content-Type: application/json' -d '{"content":"test","importance":5}'
```

### Coverage

Minimum coverage requirements:
- Global: ≥ 90%
- Changed lines: ≥ 95%

```bash
pnpm test:coverage
```

## Security

### Authentication

- **MCP Protocol**: Requires `MCP_API_KEY` by default
- **REST API**: CORS whitelist validation (see `@cortex-os/security`)
- **Development**: Use `NO_AUTH=true` to disable (local only)

### Headers

REST API supports multiple auth methods:
```bash
# API Key
X-API-Key: <key>

# Bearer Token
Authorization: Bearer <key>

# Basic Auth
Authorization: Basic <base64(user:key)>
```

### Security Scanning

```bash
pnpm security:scan          # Run security scanners
```

## Observability

### Logging

Structured logging with Pino:

```typescript
import { pino } from 'pino';
const logger = pino({ level: process.env.MEMORY_LOG_LEVEL || 'info' });

logger.info({ brand: 'brAInwav', requestId: '...' }, 'Operation completed');
```

### Metrics

Prometheus metrics available at `/metrics` (when enabled).

### Tracing

OpenTelemetry traces with automatic instrumentation:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318 pnpm start
```

## Troubleshooting

### REST API Not Responding

**Problem**: `REST is unreachable (http://127.0.0.1:3028)` or connection refused errors.

**Solution Steps**:

1. **Check if service is running**:
   ```bash
   # Check process
   ps aux | grep "node.*server.js"
   
   # Check port
   lsof -i :3028
   
   # If using start script, check PID file
   cat apps/cortex-os/packages/local-memory/logs/server.pid
   ```

2. **Start the service if not running**:
   ```bash
   cd apps/cortex-os/packages/local-memory
   pnpm start:service
   ```
   
   Or manually:
   ```bash
   # Build first
   pnpm build
   
   # Set environment and start
   export MEMORY_API_PORT=3028
   export LOCAL_MEMORY_HOST=0.0.0.0
   node ./dist/server.js
   ```

3. **Verify health endpoint**:
   ```bash
   curl -v http://127.0.0.1:3028/healthz
   ```
   
   Expected response:
   ```json
   {"success":true,"data":{"healthy":true,"timestamp":"2025-10-11T..."}}
   ```

4. **Check logs for errors**:
   ```bash
   # Service logs
   tail -f apps/cortex-os/packages/local-memory/logs/local-memory.log
   
   # Or if using different location
   tail -f ~/.local-memory/logs/memory.log
   ```

5. **Common Issues**:
   
   **Port already in use**:
   ```bash
   # Find what's using port 3028
   lsof -i :3028
   
   # Kill the process
   kill $(lsof -t -i:3028)
   ```
   
   **Build not current**:
   ```bash
   # Clean and rebuild
   rm -rf dist
   pnpm build
   ```
   
   **Dependencies missing**:
   ```bash
   # Reinstall dependencies
   pnpm install
   ```
   
   **Qdrant not running** (if using Qdrant backend):
   ```bash
   # Check Qdrant
   curl http://localhost:6333/healthz
   
   # Start Qdrant if needed
   cd ~/.local-memory && ./qdrant &
   ```

6. **Test with curl**:
   ```bash
   # Health check
   curl -X GET http://127.0.0.1:3028/healthz
   
   # Store memory
   curl -X POST http://127.0.0.1:3028/memory/store \
     -H 'Content-Type: application/json' \
     -d '{
       "content": "Test memory from troubleshooting",
       "importance": 5,
       "tags": ["test"],
       "domain": "troubleshooting"
     }'
   ```

7. **Enable debug logging**:
   ```bash
   export MEMORY_LOG_LEVEL=debug
   pnpm start
   ```

### Build Failures

1. Clear dist and rebuild:
   ```bash
   rm -rf dist
   pnpm build
   ```

2. Check TypeScript configuration:
   ```bash
   pnpm typecheck
   ```

3. Verify dependencies:
   ```bash
   pnpm install
   ```

### MCP Integration Issues

1. Verify MCP binary location:
   ```bash
   which local-memory
   ```

2. Check Claude Desktop config:
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

3. Restart Claude Desktop after config changes

## Integration with Cortex-OS

### Memory Persistence

Follow the dual-mode workflow from `docs/local-memory-fix-summary.md`:

1. Store decision in `.github/instructions/memories.instructions.md`
2. Persist via MCP or REST API
3. Maintain parity between both modes

### TypeScript Integration

```typescript
import { LocalMemoryOrchestrationAdapter } from '@cortex-os/examples/local-memory-rest-api';

const adapter = new LocalMemoryOrchestrationAdapter({
  baseUrl: 'http://localhost:3028/api/v1'
});

await adapter.store({
  content: 'Implementation decision',
  importance: 8,
  tags: ['architecture'],
  domain: 'cortex-os'
});
```

## brAInwav Standards

All outputs, logs, and errors include brAInwav branding per `RULES_OF_AI.md`:

- ✅ Structured logging with `brand: "brAInwav"`
- ✅ Error messages include brAInwav references
- ✅ Health checks return brAInwav branding
- ✅ OpenAPI documentation branded
- ✅ Constitutional compliance enforced

## Contributing

Follow the agentic workflow defined in `.cortex/rules/agentic-coding-workflow.md`:

1. Research → Planning → Implementation → Review → Verification → Archive
2. Store all decisions in task folders: `~/tasks/[feature]/`
3. Use TDD with ≥ 90% coverage
4. Follow `CODESTYLE.md` conventions
5. Complete `code-review-checklist.md` before merge

## License

Enterprise license managed via 1Password integration.

See `docs/LICENSE_MANAGEMENT.md` for details.

## Support

- **Documentation**: See repository `docs/` folder
- **Issues**: GitHub Issues
- **Team**: brAInwav Development Team

---

**brAInwav Development Team**
**Last Updated**: 2025-10-11

---

## 📖 Architecture Documentation

**NEW**: See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for a complete explanation of the Cortex-OS memory architecture, including:
- Clear distinction between MCP Server (port 3024) and REST API Server (port 3028)
- When to use each service
- Common misconceptions clarified
- Decision tree for choosing the right service
- Current status of both services

---

## Quick Command Reference

```bash
# Start service (recommended)
pnpm start:service

# Stop service
pnpm stop:service

# Test API endpoints
pnpm test:api

# Build manually
pnpm build

# Start manually
export MEMORY_API_PORT=3028
node ./dist/server.js

# Make scripts executable (first time only)
chmod +x scripts/*.sh
```

## Files Added

### Configuration
- `port.env` - Port and environment configuration
- `launchd/com.brainwav.local-memory.plist` - macOS LaunchAgent template

### Scripts
- `scripts/start-local-memory.sh` - Automated startup script
- `scripts/stop-local-memory.sh` - Service stop script
- `scripts/test-local-memory.sh` - API testing suite
- `scripts/persist-brainwav-memory.sh` - Example memory persistence
- `scripts/install-autostart.sh` - Install autostart (macOS LaunchAgent)
- `scripts/uninstall-autostart.sh` - Remove autostart configuration

### Documentation
- `docs/SETUP.md` - Comprehensive setup guide
- `docs/AUTOSTART.md` - Autostart configuration guide
- `docs/FIX-SUMMARY.md` - Technical implementation details

### Generated Files (after installation)
- `AUTOSTART-INFO.txt` - Quick reference for installed service
- `logs/launchd-stdout.log` - LaunchAgent output logs
- `logs/launchd-stderr.log` - LaunchAgent error logs
