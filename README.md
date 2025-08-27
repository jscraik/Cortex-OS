# Cortex-OS

**Autonomous Software Behavior Reasoning (ASBR) Runtime** - Clean, governed monorepo with strict import boundaries, SBOM, and CI gates.

## Architecture Overview

Cortex-OS follows the **ASBR (Autonomous Software Behavior Reasoning)** architecture pattern with clear separation of concerns:

### ASBR Runtime

- **Location**: `apps/cortex-os/`
- **Role**: Main application runtime that orchestrates feature packages
- **Provides**: CLI, HTTP APIs, UI adapters, coordination logic

### Feature Packages (mounted by ASBR)

- **Location**: `apps/cortex-os/packages/`
- **Role**: Domain-specific features and capabilities
- **Examples**: `agents/`, `asbr/`, `mvp/`, `mvp-core/`, `mvp-server/`

### Shared Library Packages

- **Location**: `packages/`
- **Role**: Cross-cutting services and shared infrastructure
- **Examples**: `a2a/`, `mcp/` (restructured), `memories/`, `orchestration/`, `rag/`, `simlab/`

### Applications

- **Location**: `apps/`
- **Role**: Production applications and services
- **Examples**: `cortex-os/` (ASBR Runtime), `cortex-marketplace-api/` (MCP Marketplace)

## Communication Patterns

Features communicate through three sanctioned mechanisms:

1. **A2A Event Bus** (`packages/a2a`) - Async pub/sub messaging
2. **Service Interfaces** - DI-based contracts via ASBR coordination
3. **MCP Tools** (`packages/mcp`) - External integrations and side effects

**Direct imports between feature packages are forbidden** to maintain loose coupling.

## Quick Start

```bash
# Install dependencies
pnpm install

# Development
pnpm dev

# Testing
pnpm test
pnpm test:integration
pnpm test:coverage

# Build
pnpm build

# Linting & formatting
pnpm lint
pnpm format
```

## Project Structure

```markdown
apps/ # Applications
├── cortex-os/ # ASBR Runtime
│ ├── src/ # Main application code
│ ├── packages/ # Feature packages mounted by ASBR
│ │ ├── agents/ # Feature-level agents/neurons
│ │ ├── asbr/ # Core ASBR reasoning package
│ │ ├── mvp/ # MVP foundations
│ │ ├── mvp-core/ # MVP core components
│ │ └── mvp-server/ # MVP HTTP server
│ └── brain/ # Brain modules
└── cortex-marketplace-api/ # MCP Marketplace API
  ├── src/ai/ # AI services (MLX, Ollama)
  └── src/registry/ # Server registry

packages/ # Shared library packages
├── a2a/ # Agent-to-Agent communication
├── mcp/ # Model Context Protocol (RESTRUCTURED)
│ └── src/lib/ # Clean implementation (7 core modules)
│   ├── types.ts # Core type definitions
│   ├── client.ts # MCP client
│   ├── server.ts # MCP server
│   ├── bridge.ts # Transport bridges
│   ├── transport.ts # Transport layer
│   ├── config.ts # Configuration
│   └── index.test.ts # TDD test suite (16 tests)
├── memories/ # Long-term state management
├── orchestration/ # Multi-agent workflow coordination
├── rag/ # Retrieval-Augmented Generation
└── simlab/ # Simulation environment

libs/ # Framework libraries
├── typescript/ # TypeScript utilities and contracts
└── python/ # Python utilities

tests/ # Integration and E2E tests
```

## Key Principles

- **Modular Architecture**: Features are independent, replaceable packages
- **Strict Boundaries**: No direct cross-feature imports
- **Contract-Based**: All communication through well-defined interfaces
- **Event-Driven**: Async coordination via A2A event bus
- **Security First**: OWASP compliance, input validation, capability boundaries
- **Test-Driven**: Comprehensive testing with coverage gates (MCP: 16 TDD tests)
- **Accessibility**: WCAG 2.2 AA compliance throughout
- **Clean Architecture**: Removed backward compatibility bloat (30+ files from MCP)
- **AI-Enhanced**: MLX (Qwen3) for semantic search, Ollama fallback
