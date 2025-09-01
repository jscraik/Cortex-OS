# Cortex-OS

[![CI Status](https://github.com/Cortex-OS/Cortex-OS/actions/workflows/ci.yml/badge.svg)](https://github.com/Cortex-OS/Cortex-OS/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

**Autonomous Software Behavior Reasoning (ASBR) Runtime** — a clean, governed monorepo with strict import boundaries, SBOM, and CI gates.

## Table of Contents

- [Requirements](#requirements)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Communication Patterns](#communication-patterns)
- [Quick Start](#quick-start)
- [Key Principles](#key-principles)
- [MLX Models Directory](#mlx-models-directory)
- [Contributing](#contributing)
- [Licensing](#licensing)

## Requirements

- Node.js 18 or later (global `crypto` API required).

## Architecture Overview

Cortex-OS is a monorepo containing several applications and shared libraries. The architecture is modular with clear separation between applications and the services they consume.

- **`apps/`** – Contains user-facing applications, including the main `cortex-os` runtime, the `cortex-cli`, and the `cortex-marketplace` web interface.
- **`packages/`** – Shared libraries and services providing core functionality such as agent-to-agent communication (`a2a`), memory (`memories`), and workflow orchestration.
- **`libs/`** – Low-level framework libraries, utilities, and type definitions.
- **`.cortex/`** – Governance hub with policies, schemas, and validation scripts.
- **`contracts/`** – Data contracts (e.g., CloudEvents) for inter-service communication.

## Project Structure

```markdown
.
├── .cortex/ # Governance hub (single source of truth)
├── apps/ # Applications and services
│ ├── cortex-os/ # Main ASBR Runtime application
│ ├── cortex-cli/ # Command-line interface
│ └── cortex-web/ # Shared web UI components
├── packages/ # Shared libraries and services
│ ├── a2a/ # Agent-to-Agent communication bus
│ ├── agents/ # Core agent implementations
│ ├── memories/ # Long-term memory management
│ ├── model-gateway/ # Gateway for accessing AI models
│ ├── orchestration/ # Workflow orchestration
│ ├── rag/ # Retrieval-Augmented Generation
│ └── ... # and many other packages
├── contracts/ # API and event contracts
├── libs/ # Low-level framework libraries (TS, Python)
└── ...
```

For a complete reference, see [`.cortex/docs/project-structure.md`](./.cortex/docs/project-structure.md).

## Communication Patterns

Features communicate through three sanctioned mechanisms:

1. **A2A Event Bus** (`packages/a2a`) – asynchronous pub/sub messaging.
2. **Service Interfaces** – dependency-injection-based contracts via ASBR coordination.
3. **MCP Tools** (`packages/mcp`) – external integrations and side effects.

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

- **Modular Architecture** – features are independent, replaceable packages.
- **Strict Boundaries** – no direct cross-feature imports.
- **Contract-Based** – communication through well-defined interfaces.
- **Event-Driven** – asynchronous coordination via A2A event bus.
- **Security First** – OWASP compliance, input validation, capability boundaries.
- **Test-Driven** – comprehensive testing with coverage gates (MCP: 16 TDD tests).
- **Accessibility** – WCAG 2.2 AA compliance throughout.
- **Clean Architecture** – removed backward compatibility bloat (30+ files from MCP).
- **AI-Enhanced** – MLX (Qwen3) for semantic search, Ollama fallback.

## MLX Models Directory

The MLX embedder uses the Hugging Face cache at `~/.cache/huggingface` by default. Set the `MLX_MODELS_DIR` environment variable to use a different directory.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Licensing

- Open-source edition: Apache License, Version 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
- Commercial option: see [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md) for paid features/support.
- Contributions: use permissive-licensed deps only (Apache/MIT/BSD); avoid AGPL/SSPL unless isolated and optional.
- Trademarks: "Cortex-OS" and related marks are subject to trademark policies.
