# Architecture Overview

> High-level view of Cortex-OS structure, principles, and communication patterns.

For the full detailed diagram and extended explanation see
[`architecture.md`](./architecture.md).

## Core Principles

1. **Governed Monorepo** – Strict import boundaries enforced via ESLint + Nx.
2. **Event-Driven Interactions** – Agent-to-agent (A2A) bus for async workflows.
3. **Contract-First Design** – Shared schemas/types in `libs/typescript/contracts`.
4. **Separation of Concerns** – No direct feature-package cross-imports.
5. **Deterministic Pipelines** – Reproducible agent behavior through explicit config.
6. **Security by Default** – OWASP + LLM security scanning integrated into CI.

## Layered Structure

```text
┌───────────────┐  User Interfaces
│ Apps           │  (CLI, Web UI, TUI)
└───────┬───────┘
        │ DI Mounting
┌───────▼───────┐  Feature Packages (domain logic)
│ Packages       │  agents, mcp, a2a, orchestration, memories, rag
└───────┬───────┘
        │ Contracts / Events
┌───────▼───────┐  Shared Libraries
│ Libs           │  contracts, types, utils
└───────┬───────┘
        │ Governance / Policies
┌───────▼───────┐  Control Plane
│ .cortex/       │  rules, schemas, gates
└───────────────┘
```

## Package Categories

| Category           | Purpose                 | Examples                                                 |
| ------------------ | ----------------------- | -------------------------------------------------------- |
| Applications       | Entry points & UX       | `cortex-os`, `cortex-code`, ~~`cortex-cli`~~ (deprecated) |
| Communication      | Messaging + tool bridge | `a2a`, `mcp`, `orchestration`                            |
| Intelligence       | AI / reasoning          | `agents`, `rag`                                          |
| Data & State       | Persistence & retrieval | `memories`, `registry`                                   |
| Security & Quality | Hardening + simulation  | `security`, `simlab`                                     |
| Governance         | Structural enforcement  | `.cortex/`, root configs                                 |

## Communication Patterns

| Mechanism          | Use Case                        | Notes                                           |
| ------------------ | ------------------------------- | ----------------------------------------------- |
| A2A Event Bus      | Async agent coordination        | JSON-RPC 2.0 style patterns                     |
| MCP Tools          | External side-effect operations | Standard tool protocol (Model Context Protocol) |
| Service Interfaces | Synchronous logic access        | Registered via runtime DI container             |
| Memory Service     | State capture + retrieval       | Avoid direct persistence coupling               |

## Cross-Cutting Concerns

| Concern       | Implementation                                      |
| ------------- | --------------------------------------------------- |
| Validation    | Zod schemas in contracts layer                      |
| Observability | Structured logs + tracing hooks (configurable)      |
| Security      | Semgrep scans, secret management, mTLS roadmap      |
| Testing       | Multi-layer (unit, integration, simulation, E2E)    |
| Performance   | Turborepo + task caching + dependency graph pruning |
| **Performance Optimization** | Advanced auto-scaling, intelligent routing, GPU management, distributed caching |

## Governance & Enforcement

| Layer                | Gate                                        |
| -------------------- | ------------------------------------------- |
| Import Boundaries    | ESLint rules + Nx project graph constraints |
| Contract Consistency | Schema validation in CI (.cortex checks)    |
| Coverage Thresholds  | 90% global / 95% lines enforced in test pipeline |
| Security             | `pnpm security:scan` (Semgrep profiles)     |
| Structure Validation | `pnpm structure:validate` custom governance |

## Extension Points

| Extension           | How to Add                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------- |
| New Agent           | Create feature package under `packages/` and register via runtime DI, publish A2A events |
| New MCP Tool        | Extend MCP package tool registry and expose through protocol server                      |
| New Contract        | Add schema to `libs/typescript/contracts` and re-export index                            |
| New Memory Strategy | Implement memory provider interface and register through DI                              |

## Related Docs

- Full Architecture Reference: [architecture.md](./architecture.md)
- Quick Start: [quick-start.md](./quick-start.md)
- Python Integration: [python-integration.md](./python-integration.md)

---

Return to: [Root README](../README.md)
