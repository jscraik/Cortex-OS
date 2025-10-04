# Cortex-OS Project Structure Reference

> **⚠️ HISTORICAL DOCUMENT**: This document references `apps/api`, `cortex-marketplace`, `cortex-marketplace-api`, and `cortex-webui` which have been removed from the codebase. Content preserved for historical reference and architectural context.

This document serves as the authoritative reference for the Cortex-OS project structure and architecture. All agents and developers should refer to this document to understand the codebase organization.

## 📁 Project Layout

```text
cortex-os-clean/
├── .cortex/                          # Governance hub (single source of truth)
├── apps/                             # Applications and services
│   ├── cortex-code/                   # Command-line interface for Cortex-OS
│   ├── cortex-marketplace/           # Frontend for the MCP Marketplace
│   ├── cortex-marketplace-api/       # API for the MCP Marketplace
│   ├── cortex-os/                    # ASBR Runtime (main application)
│   ├── cortex-py/                    # Python-based services and agents
│   └── cortex-webui/                   # Web-based UI components
├── packages/                         # Shared libraries and services
│   ├── a2a/                          # Agent-to-Agent communication bus
│   ├── agents/                       # Core agent implementations
│   ├── asbr/                         # Autonomous Software Behavior Reasoning engine
│   ├── kernel/                       # Core kernel for the MVP
│   ├── mcp/                          # Model Context Protocol (umbrella package)
│   ├── mcp-bridge/                   # Bridge for MCP communication
│   ├── mcp-registry/                 # Registry for MCP servers
│   ├── mcp-server/                   # Server implementation for MCP
│   ├── memories/                     # Long-term memory management for agents
│   ├── model-gateway/                # Gateway for accessing AI models
│   ├── mvp/                          # Minimum Viable Product components
│   ├── mvp-core/                     # Core functionality for the MVP
│   ├── mvp-server/                   # Server for the MVP
│   ├── orchestration/                # Workflow orchestration for agents
│   ├── prp-runner/                   # Runner for PRP (Planning, Reasoning, and Programming)
│   ├── rag/                          # Retrieval-Augmented Generation services
│   ├── registry/                     # Schema registry service
│   ├── security/                     # Security components (SPIFFE/SPIRE)
│   └── simlab-mono/                  # Simulation laboratory
├── contracts/                        # API and event contracts
├── examples/                         # Example agent and server implementations
├── infra/                            # Infrastructure setup (Docker, NATS)
├── libs/                             # Low-level framework libraries (TS, Python)
├── services/                         # Standalone services (e.g., ML inference)
└── tools/                            # Development and operational tools
```

## 🏗️ Architecture Overview

### Applications Layer

The `apps/` directory contains all user-facing applications and services:

- **`cortex-os/`**: The main ASBR (Agent Service Bus Runtime) application that coordinates agents and services.
- **`cortex-cli/`**: A command-line interface for interacting with Cortex-OS.
- **`cortex-marketplace/` & `cortex-marketplace-api/`**: The frontend and API for the MCP Marketplace.
- **`cortex-web/`**: Contains shared web-based UI components.
- **`cortex-py/`**: Hosts Python-based services and agents.

### Shared Libraries and Services

The `packages/` directory contains all shared libraries and services that provide cross-cutting concerns and infrastructure:

- **`a2a/`**: Agent-to-Agent communication bus.
- **`orchestration/`**: Workflow coordination with outbox/DLQ patterns.
- **`memories/`**: Persistent state management for agents.
- **`rag/`**: Retrieval-Augmented Generation services.
- **`model-gateway/`**: A centralized gateway for accessing AI models.
- **`mcp/`, `mcp-bridge/`, `mcp-registry/`, `mcp-server/`**: A collection of packages implementing the Model Context Protocol for tool integration.
- **`agents/`**: Core implementations of different agent types.
- **`asbr/`**: The core Autonomous Software Behavior Reasoning engine.
- **`security/`**: SPIFFE/SPIRE security infrastructure.
- **`simlab-mono/`**: The simulation laboratory for testing agents.
- **`registry/`**: The schema registry service for validating events and data.

### Contracts

Event and API contract definitions:

- **Location**: `contracts/`
- **Components**:
  - `cloudevents/`: CloudEvents envelope schemas.
  - `asyncapi/`: Channel specifications.
  - `tests/`: AJV validation tests.

## 🔄 Communication Patterns

### Agent-to-Agent (A2A) Messaging

- **Bus**: NATS JetStream for durable messaging.
- **Contracts**: Defined in `contracts/cloudevents/`.
- **Validation**: Schema registry at `packages/registry/`.
- **Patterns**: Event sourcing, CQRS, outbox pattern.

### Service Integration

- **Clean Architecture**: Restructured MCP package with functional patterns.
- **Transport Bridges**: stdio ↔ HTTP/SSE for remote server support.
- **AI-Enhanced Search**: MLX (Qwen3) primary, Ollama fallback.
- **Security First**: Content validation, safety checks, supply chain security.
- **No Direct Imports**: Services communicate via A2A events or contracts.
- **Dependency Injection**: The ASBR runtime wires dependencies.

## 🛡️ Governance & Validation

### Single Source of Truth

All governance lives in `.cortex/`:

1. **Rules** (`.cortex/rules/`): Human-readable policies.
2. **Policies** (`.cortex/policy/`): Machine-readable JSON.
3. **Schemas** (`.cortex/schemas/`): Validation schemas.
4. **Gates** (`.cortex/gates/`): Enforcement scripts.

### Validation Flow

```text
Code Changes → Pre-commit Hooks → CI Gates → Runtime Enforcement
```

### Structure Guard

- **Location**: `tools/structure-guard/`
- **Purpose**: Enforce project structure compliance.
- **Validation**: Runs in CI on all PRs.

## 🚀 Development Workflow

### Local Development

```bash
# Install dependencies
pnpm install

# Start local NATS
cd infra/compose && docker-compose -f nats-dev.yml up -d

# Run example agents
cd examples/agents/agent-a && pnpm dev
cd examples/agents/agent-b && pnpm dev

# Run tests
pnpm test

# Run contract validation
cd contracts/tests && pnpm test
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
cd packages/orchestration && pnpm build
```

### Schema Registry

```bash
# Start registry service
cd packages/registry && pnpm dev

# Access schemas at http://localhost:3000/registry
```

## 🤝 Contributing

### Code Organization

1. **Applications**: New applications go in `apps/`.
2. **Shared Services**: Cross-cutting concerns go in `packages/`.
3. **Contracts**: Event schemas go in `contracts/cloudevents/`.
4. **Examples**: Reference implementations go in `examples/`.

### Validation Requirements

- All changes must pass structure guard.
- Contract changes require AJV tests.
- New packages must be added to `pnpm-workspace.yaml`.
- Documentation updates required for API changes.

---

**Note**: This document is maintained in `.cortex/docs/project-structure.md` and is the single source of truth for project organization. All agents should reference this document when making architectural decisions.
