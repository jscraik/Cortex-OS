# Cortex-OS Project Structure Reference

This document serves as the authoritative reference for the Cortex-OS project structure and architecture. All agents and developers should refer to this document to understand the codebase organization.

## 📁 Project Layout

```text
cortex-os-clean/
├── .cortex/                          # Governance hub (single source of truth)
│   ├── rules/                        # Human-readable governance
│   ├── policy/                       # Machine-readable policies
│   ├── schemas/                      # JSON schemas for validation
│   ├── gates/                        # Validation scripts
│   └── docs/                         # Architecture documentation
├── apps/
│   └── cortex-os/                    # ASBR Runtime (main application)
│       ├── packages/                 # Feature packages
│       │   ├── agents/               # Agent implementations
│       │   ├── mvp/                  # MVP components
│       │   ├── mvp-core/             # Core MVP functionality
│       │   └── mvp-server/           # MVP server components
│       └── src/                      # Main application source
├── packages/                         # Shared service libraries
│   ├── a2a/                         # Agent-to-Agent communication
│   │   ├── a2a-core/                # Core A2A functionality
│   │   ├── a2a-transport/           # Transport layer
│   │   └── a2a-contracts/           # A2A contracts and schemas
│   ├── orchestration/               # Workflow orchestration
│   │   ├── src/lib/outbox/          # Transactional outbox pattern
│   │   └── src/lib/dlq/             # Dead Letter Queue handling
│   ├── memories/                    # Memory and state management
│   ├── rag/                         # Retrieval-Augmented Generation
│   │   ├── src/pipeline/            # RAG pipelines
│   │   ├── src/embed/               # Embedding services
│   │   └── src/store/               # Vector stores
│   ├── simlab/                      # Simulation laboratory
│   ├── mcp/                         # Model Context Protocol
│   │   ├── mcp-transport/           # MCP transport
│   │   ├── mcp-bridge/              # MCP bridges
│   │   ├── mcp-server/              # MCP server
│   │   ├── mcp-core/                # Core MCP functionality
│   │   └── mcp-registry/            # MCP registry
│   └── security/                    # SPIFFE/SPIRE security
├── contracts/                       # Event and API contracts
│   ├── cloudevents/                 # CloudEvents schemas
│   ├── asyncapi/                    # AsyncAPI specifications
│   └── tests/                       # Contract validation tests
├── registry/                        # Schema registry service
│   └── src/                         # Registry implementation
├── examples/                        # Example implementations
│   ├── agents/
│   │   ├── agent-a/                 # Example agent A
│   │   └── agent-b/                 # Example agent B
│   └── bus/
│       └── nats-dev/                # Local NATS development setup
├── infra/
│   └── compose/
│       └── nats-dev.yml             # NATS docker-compose
└── libs/                           # Framework libraries
    ├── typescript/
    │   ├── contracts/               # TypeScript contract definitions
    │   ├── types/                   # Type definitions
    │   └── utils/                   # Utility functions
    └── python/                      # Python libraries
```

## 🏗️ Architecture Overview

### ASBR Runtime (Apps Layer)

The **ASBR (Agent Service Bus Runtime)** is the main application that coordinates feature packages and provides interfaces:

- **Location**: `apps/cortex-os/`
- **Responsibilities**:
  - Coordinate feature packages
  - Provide CLI/HTTP/UI interfaces
  - Dependency injection container
  - Feature package mounting

### Feature Packages

Domain-specific logic organized as packages:

- **Location**: `apps/cortex-os/packages/`
- **Types**:
  - `agents/`: Agent implementations
  - `mvp/`: Minimum Viable Product components
  - `mvp-core/`: Core MVP functionality
  - `mvp-server/`: MVP server components

### Shared Services

Cross-cutting concerns and infrastructure:

- **Location**: `packages/`
- **Services**:
  - `a2a/`: Agent-to-Agent communication bus
  - `orchestration/`: Workflow coordination with outbox/DLQ
  - `memories/`: Persistent state management
  - `rag/`: Retrieval-Augmented Generation
  - `simlab/`: Simulation environment
  - `mcp/`: Model Context Protocol integration
  - `security/`: SPIFFE/SPIRE security infrastructure

### Contracts & Registry

Event and API contract definitions:

- **Location**: `contracts/`
- **Components**:
  - `cloudevents/`: CloudEvents envelope schemas
  - `asyncapi/`: Channel specifications
  - `tests/`: AJV validation tests
- **Registry**: `registry/src/` - Serves schemas at `/registry`

### Development & Examples

Local development and reference implementations:

- **Location**: `examples/`
- **Components**:
  - `agents/agent-a`, `agents/agent-b`: Example agents
  - `bus/nats-dev/`: Local NATS development setup

## 🔄 Communication Patterns

### Agent-to-Agent (A2A) Messaging

- **Bus**: NATS JetStream for durable messaging
- **Contracts**: Defined in `contracts/cloudevents/`
- **Validation**: Schema registry at `registry/`
- **Patterns**: Event sourcing, CQRS, outbox pattern

### Service Integration

- **No Direct Imports**: Services communicate via A2A events or contracts
- **Dependency Injection**: ASBR runtime wires dependencies
- **MCP Integration**: External tools via Model Context Protocol

## 🛡️ Governance & Validation

### Single Source of Truth

All governance lives in `.cortex/`:

1. **Rules** (`.cortex/rules/`): Human-readable policies
2. **Policies** (`.cortex/policy/`): Machine-readable JSON
3. **Schemas** (`.cortex/schemas/`): Validation schemas
4. **Gates** (`.cortex/gates/`): Enforcement scripts

### Validation Flow

```text
Code Changes → Pre-commit Hooks → CI Gates → Runtime Enforcement
```

### Structure Guard

- **Location**: `tools/structure-guard/`
- **Purpose**: Enforce project structure compliance
- **Validation**: Runs in CI on all PRs

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
cd registry && pnpm dev

# Access schemas at http://localhost:3000/registry
```

## 📋 Event Types

### Agent Task Events

- `agent.task.created`: New task created
- `agent.task.assigned`: Task assigned to agent
- `agent.task.completed`: Task completed successfully
- `agent.task.failed`: Task failed with error

### System Events

- `system.health.check`: Health status update
- `system.metrics.report`: Performance metrics
- `orchestration.workflow.started`: Workflow initiated
- `orchestration.workflow.completed`: Workflow finished

## 🔧 Configuration

### Environment Variables

- `NATS_URL`: NATS server connection string
- `REGISTRY_PORT`: Schema registry port
- `AGENT_ID`: Unique agent identifier
- `SPIFFE_ENDPOINT`: SPIFFE Workload API endpoint

### Feature Flags

- `ENABLE_OUTBOX`: Enable transactional outbox pattern
- `ENABLE_DLQ`: Enable dead letter queue processing
- `ENABLE_TRACING`: Enable distributed tracing

## 📚 Key Concepts

### Outbox Pattern

- **Location**: `packages/orchestration/src/lib/outbox/`
- **Purpose**: Ensure reliable message delivery
- **Implementation**: Wraps all side-effecting publishes

### Dead Letter Queue (DLQ)

- **Location**: `packages/orchestration/src/lib/dlq/`
- **Purpose**: Handle failed message processing
- **Features**: Quarantine, retry logic, monitoring

### Schema Registry Service

- **Location**: `registry/src/`
- **Purpose**: Centralized schema management
- **Features**: Versioning, ETags, local resolution

### Contract Testing

- **Location**: `contracts/tests/`
- **Tools**: AJV for JSON Schema validation
- **Coverage**: CloudEvents envelopes, AsyncAPI specs

## 🤝 Contributing

### Code Organization

1. **Feature Packages**: New features go in `apps/cortex-os/packages/`
2. **Shared Services**: Cross-cutting concerns in `packages/`
3. **Contracts**: Event schemas in `contracts/cloudevents/`
4. **Examples**: Reference implementations in `examples/`

### Validation Requirements

- All changes must pass structure guard
- Contract changes require AJV tests
- New packages must be added to `pnpm-workspace.yaml`
- Documentation updates required for API changes

### CI Pipeline

- **Unit Tests**: All packages
- **Contract Tests**: `contracts/tests/`
- **Integration Tests**: `examples/`
- **Structure Guard**: Project layout validation
- **Path-filtered Builds**: Only affected packages

---

**Note**: This document is maintained in `.cortex/docs/project-structure.md` and is the single source of truth for project organization. All agents should reference this document when making architectural decisions.
