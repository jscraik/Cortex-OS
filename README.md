# Cortex-OS

**Autonomous Software Behavior Reasoning (ASBR) Runtime** - Clean, governed monorepo with strict import boundaries, SBOM, and CI gates.

## Architecture Overview

Cortex-OS is a monorepo containing several applications and shared libraries. The architecture is designed to be modular, with clear separation between applications and the services they consume.

-   **`apps/`**: Contains all user-facing applications, including the main `cortex-os` runtime, the `cortex-cli`, and the `cortex-marketplace` web interface.
-   **`packages/`**: Contains all shared libraries and services. These packages provide the core functionality of the system, such as agent-to-agent communication (`a2a`), memory (`memories`), and workflow `orchestration`.
-   **`libs/`**: Contains low-level framework libraries, utilities, and type definitions.
-   **`.cortex/`**: The governance hub of the project, containing all policies, schemas, and validation scripts.
-   **`contracts/`**: Defines the data contracts (e.g., CloudEvents) for communication between services.

## Project Structure

A high-level overview of the most important directories:

```markdown
.
├── .cortex/              # Governance hub (single source of truth)
├── apps/                 # Applications and services
│   ├── cortex-os/        # Main ASBR Runtime application
│   ├── cortex-cli/       # Command-line interface
│   └── cortex-web/       # Shared web UI components
├── packages/             # Shared libraries and services
│   ├── a2a/              # Agent-to-Agent communication bus
│   ├── agents/           # Core agent implementations
│   ├── memories/         # Long-term memory management
│   ├── model-gateway/    # Gateway for accessing AI models
│   ├── orchestration/    # Workflow orchestration
│   ├── rag/              # Retrieval-Augmented Generation
│   └── ...               # and many other packages
├── contracts/            # API and event contracts
├── libs/                 # Low-level framework libraries (TS, Python)
└── ...
```

For a complete and authoritative reference of the project structure, please see [`.cortex/docs/project-structure.md`](./.cortex/docs/project-structure.md).

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
