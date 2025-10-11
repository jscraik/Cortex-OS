# Local Memory MCP & REST API - brAInwav

**Status:** Production Ready  
**Maintainer:** brAInwav Development Team  
**Version:** 0.1.0

## Overview

Local Memory provides persistent knowledge management for Cortex-OS, operating in dual mode to support both **MCP (Model Context Protocol)** and **REST API** interfaces simultaneously.

## Features

- ✅ **Dual Mode Operation**: MCP protocol + REST API running concurrently
- ✅ **Port 3028**: Cloudflare-safe dedicated port for REST API
- ✅ **25 REST Endpoints**: Complete memory operations, analysis, relationships
- ✅ **MCP Integration**: Seamless integration with Claude Desktop, VS Code, Cursor
- ✅ **OAuth Authentication**: Secure auth-handler with token management
- ✅ **License Management**: Enterprise-grade licensing with 1Password integration
- ✅ **OpenTelemetry**: Full observability with traces, logs, and metrics
- ✅ **brAInwav Branding**: All outputs include brAInwav references

## Architecture

```
┌─────────────────────────────────────────┐
│  Local Memory Service (Dual Mode)       │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────┐    ┌───────────────┐  │
│  │ MCP Server  │    │  REST API     │  │
│  │ (STDIO/SSE) │    │  Port: 3028   │  │
│  └─────────────┘    └───────────────┘  │
│         │                    │          │
│         └────────┬───────────┘          │
│                  │                      │
│         ┌────────▼────────┐             │
│         │  Memory Core    │             │
│         │  (Provider)     │             │
│         └─────────────────┘             │
└─────────────────────────────────────────┘
```

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

```bash
# Build the package
pnpm build

# Start in dual mode (default)
pnpm start

# Verify both modes
curl http://localhost:3028/healthz    # REST API
local-memory ps                       # Check MCP + daemon status
```

## Configuration

### Environment Variables

```bash
# Port Configuration (sourced from config/ports.env)
MEMORY_API_PORT=3028              # REST API port (canonical)
LOCAL_MEMORY_PORT=3028            # Backward compatibility

# Host Configuration
LOCAL_MEMORY_HOST=0.0.0.0         # Bind to all interfaces

# Mode Selection
LOCAL_MEMORY_MODE=dual            # Options: mcp, rest, dual (default)

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

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "local-memory": {
      "command": "local-memory",
      "args": ["--mcp"],
      "env": {
        "MEMORY_API_PORT": "3028"
      }
    }
  }
}
```

### VS Code / Cursor

Create `.vscode/mcp.json` or `.cursor/mcp.json`:

```json
{
  "servers": {
    "local-memory": {
      "command": "local-memory",
      "args": ["--mcp"]
    }
  }
}
```

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

1. Check if service is running:
   ```bash
   local-memory ps
   ```

2. Verify port is correct:
   ```bash
   curl http://localhost:3028/healthz
   ```

3. Check logs:
   ```bash
   tail -f ~/.local-memory/logs/memory.log
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

**Co-authored-by: brAInwav Development Team**  
**Last Updated**: 2025-10-11
