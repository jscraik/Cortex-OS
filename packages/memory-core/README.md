# Cortex-OS Local Memory Refactor

## Overview

This directory contains the working documentation and task artifacts for the comprehensive refactor of the Cortex-OS Local Memory system. The refactor aims to create a unified, production-ready memory architecture that eliminates duplication and establishes clear separation of concerns.

## Objectives

### Primary Goals

1. **Unify Memory Implementation** - Consolidate duplicate memory code from `packages/memories` and `packages/rag` into a single `memory-core` package
2. **Thin Adapter Pattern** - Create lightweight adapters (MCP, REST, Agent-Toolkit) that delegate to `memory-core`
3. **Agent-Toolkit Integration** - Enable first-class agent-toolkit tool support with proper tools path resolution
4. **A2A Event Emission** - Emit events for all memory operations for observability and orchestration
5. **Token Budget Enforcement** - Implement 40K token cap with 20K trimming for search results

### Architecture Principles

- **Single Source of Truth** - `memory-core` contains all business logic
- **No Duplication** - Remove duplicate memory implementations across packages
- **Event-Driven** - All operations emit A2A events for cross-service communication
- **Transport Agnostic** - Support STDIO, HTTP/streamable, and REST access patterns
- **Local Development** - Support `$HOME/.Cortex-OS/tools/agent-toolkit` for local tool installation

## Documents

### Core Planning

- **[TDD Plan](./mcp-and-memory-tdd-plan.md)** - Comprehensive 12-phase Test-Driven Development plan with detailed implementation guidance, checklists, and Docker Compose deployment architecture

### Additional Artifacts

- **[Local Memory Hardening Baseline](./local-memory-hardening-baseline.md)** - Security and production readiness requirements

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Clients                                  │
├──────────┬──────────┬──────────┬──────────┬───────────────┤
│ Claude   │ ChatGPT  │ VS Code  │ Editors  │ Others        │
│ Desktop  │          │          │          │               │
└─────┬────┴─────┬────┴─────┬────┴─────┬────┴─────┬─────────┘
      │          │          │          │          │
      │          │          │          │          │
┌─────▼─────┐  ┌─▼──────────▼──────────▼──────────▼─┐
│ cortex-   │  │          cortex-mcp               │
│ os (app)  │  │        (MCP Server)               │
└───────────┘  └─────┬──────────────────────┬──────┘
                      │                      │
                ┌─────▼─────┐          ┌─────▼─────┐
                │ rest-api  │          │ agent-    │
                │ (gateway) │          │ toolkit   │
                └───────────┘          └───────────┘
                      │                      │
                      └──────────┬───────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     memory-core         │
                    │   (Single Source of     │
                    │      Truth)             │
                    └──────────┬─────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    Storage Layer    │
                    │  SQLite + Qdrant    │
                    └─────────────────────┘
```

## Deployment Architecture

The refactor includes a comprehensive Docker Compose setup that provides:

- **Service Containerization** - Each service in its own container with proper isolation
- **Health Checks** - All services include readiness and liveness probes
- **Bind Mounts** - Agent-toolkit tools mounted from `$HOME/.Cortex-OS/tools/agent-toolkit`
- **Transport Support** - STDIO, HTTP/streamable, and REST endpoints
- **Observability** - A2A event emission for all operations

See the [Docker Compose Architecture](./mcp-and-memory-tdd-plan.md#docker-compose-deployment-architecture) section in the TDD plan for detailed configuration.

## Progress Tracking

The refactor follows a strict 12-phase TDD approach:

- **Phase 0** - Baseline & Safety Nets (Current phase)
- **Phase 1** - Core Memory Refactor
- **Phase 2** - Adapter Layer Creation
- **Phase 3** - MCP Server Refactor
- **Phase 4** - Agent-Toolkit Integration
- **Phase 5-12** - Additional features and production hardening

Each phase includes:

- ✅ Pre-requisites verification
- 🧪 Test writing (TDD red phase)
- 🟢 Implementation (TDD green phase)
- 🔄 Refactoring (TDD refactor phase)
- ✅ Validation gates

## Success Criteria

1. **No Code Duplication** - Single memory implementation in `memory-core`
2. **Production Ready** - Docker Compose deployment with health checks
3. **Full Test Coverage** - 90%+ coverage across all components
4. **Event-Driven** - A2A events for all operations
5. **Multi-Transport** - STDIO, HTTP, and REST access
6. **Agent-Toolkit Ready** - Tools path resolution working
7. **Memory Management** - Token budget enforcement implemented
8. **Documentation** - Comprehensive docs for architecture, deployment, and usage
