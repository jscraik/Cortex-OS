# Cortex-OS

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![Package Manager](https://img.shields.io/badge/pnpm-10.17.1-blue)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue)](https://www.typescriptlang.org/)
[![Build Status](https://github.com/jamiescottcraik/Cortex-OS/workflows/CI/badge.svg)](https://github.com/jamiescottcraik/Cortex-OS/actions)
[![CodeQL](https://github.com/jamiescottcraik/Cortex-OS/workflows/CodeQL/badge.svg)](https://github.com/jamiescottcraik/Cortex-OS/actions?query=workflow%3ACodeQL)
[![Security Scan](https://github.com/jamiescottcraik/Cortex-OS/workflows/Security/badge.svg)](https://github.com/jamiescottcraik/Cortex-OS/actions?query=workflow%3ASecurity)
[![Coverage](https://img.shields.io/codecov/c/github/jamiescottcraik/Cortex-OS?token=YOUR_TOKEN)](https://codecov.io/gh/jamiescottcraik/Cortex-OS)
[![Quality Gate](https://img.shields.io/badge/quality%20gate-passing-brightgreen)](https://github.com/jamiescottcraik/Cortex-OS/actions)

## Autonomous Software Behavior Reasoning (ASBR) Runtime

Governed AI agent orchestration platform with event-driven architecture and MCP integration

> [!IMPORTANT]
> Semantic search and embeddings require configuring an external MLX or Ollama embedding service. Without it, Cortex-OS falls back to keyword-only retrieval and disables vector indexing.

[Website](https://docs.cortex-os.dev) • [Documentation](./docs) • [Quick Start](./docs/quick-start.md) • [API Reference](https://api.cortex-os.dev)

---

## 🚨 brAInwav Production Standards

**ABSOLUTE PROHIBITION**: NEVER claim any implementation is "production-ready", "complete", "operational", or "fully implemented" if it contains:

- `Math.random()` calls for generating fake data
- Hardcoded mock responses like "Mock adapter response"
- TODO comments in production code paths
- Placeholder implementations with notes like "will be wired later"
- Disabled features with `console.warn("not implemented")`
- Fake system metrics or data generation

**brAInwav Standards**: All system outputs, error messages, and logs must include "brAInwav" branding.
Status claims must be verified against actual code implementation.

**Reference**: See `.cortex/rules/RULES_OF_AI.md` for complete production standards.

---

## Overview

Cortex-OS is a production-ready **Autonomous Software Behavior Reasoning (ASBR) Runtime** enabling AI agents
to collaborate through event-driven architecture and Model Context Protocol (MCP) integrations.
The system implements strict governance boundaries, comprehensive testing, and security practices.
>>>>>>> 3ee42ccf8 (chore: remove external/openai-codex submodule and clean tmp/external directories)
Cortex-OS is an actively developed **Autonomous Software Behavior Reasoning (ASBR) Runtime** enabling AI agents to collaborate through event-driven architecture and Model Context Protocol (MCP) integrations. The system implements strict governance boundaries, comprehensive testing, and transparent security practices that are still evolving.
=======
Cortex-OS is a production-ready **Autonomous Software Behavior Reasoning (ASBR) Runtime** enabling AI agents
to collaborate through event-driven architecture and Model Context Protocol (MCP) integrations.
The system implements strict governance boundaries, comprehensive testing, and security practices.
>>>>>>> 3ee42ccf8 (chore: remove external/openai-codex submodule and clean tmp/external directories)

### 🎯 Key Features

- **🤖 AI Agent Orchestration** – Multi-agent workflows with A2A communication
- **🧠 Multimodal AI Processing** – Comprehensive support for images, audio, PDFs with OCR, vision analysis, and cross-modal search
- **🔍 Retrieval-Augmented Workflows** – Hybrid keyword/vector search when embeddings backends are configured
- **🔌 MCP Integration** – Standardized tool integration via MCP with FastMCP v3 advanced features
- **🛡️ Security First** – Documented hardening roadmap with current safeguards (see [Security Posture](./docs/security.md))
- **📊 Comprehensive Observability** – OpenTelemetry instrumentation, monitoring, tracing, analytics hooks
- **🏗️ Governed Architecture** – Import boundaries (ESLint + Nx), strict architectural rules
- **🧪 Quality Gates & TDD** – 95/95 coverage targets, mutation testing ≥80%, automated TDD coach integration
- **🚀 Deployment Tooling** – Docker compose stack, CI/CD pipelines, and health checks for iterative hardening
- **🎯 Reality Filter** – Truthfulness verification and accuracy validation for all AI agents

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 10.17.1
- **Git** >= 2.25.0

### Installation

```bash
# Clone the repository
git clone https://github.com/jamiescottcraik/Cortex-OS.git
cd Cortex-OS

# Run automated setup (recommended)
./scripts/dev-setup.sh

# For minimal setup
./scripts/dev-setup.sh --minimal

# Verify installation
pnpm readiness:check
```

### Development

```bash
# Start development server
pnpm dev

# Build the project
pnpm build

# Run tests with coverage
pnpm test:coverage

# Run security scans
pnpm security:scan

# Validate architecture
pnpm structure:validate
```

---

## 🏗️ Architecture

Cortex-OS follows a governed monorepo architecture with strict boundaries:

```text
┌─────────────────────────────────────────────────────────────┐
│                    Clients                                  │
├──────────┬──────────┬──────────┬──────────┬───────────────┤
│ Claude   │ ChatGPT  │ VS Code  │ Editors  │ Others        │
│ Desktop  │          │          │          │               │
└─────┬────┴─────┬────┴─────┬─────┬─────┬─────┬───────┘
      │          │          │     │     │     │
      │ STDIO    │ HTTP/    │ HTTP/│     │     │
      │ (stdio)  │ stream   │ stream│     │     │
      │          │ (sse)    │ (poll)│     │     │
┌─────▼─────┐  ┌─▼───────────────────────▼─────┐ ┌───▼───┐
│ cortex-   │  │          cortex-mcp         │ │Tools  │
│ os (app)  │  │        (MCP Server)         │ │mount  │
└───────────┘  └─────┬────────────────────┬────┘ └───────┘
                      │                    │
                ┌─────▼─────┐        ┌─────▼─────┐
                │ rest-api  │        │ agent-    │
                │ (gateway) │        │ toolkit   │
                └───────────┘        └───────────┘
                      │                    │
                      └────────┬───────────┘
                               │
                    ┌──────────▼──────────┐
                    │     memory-core    │
                    │   (Single Source   │
                    │      of Truth)     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    Storage Layer    │
                    │  SQLite + Qdrant    │
                    └─────────────────────┘
```

### Core Principles

- **Single Source of Truth** - `memory-core` contains all business logic
- **Thin Adapter Pattern** - MCP, REST, and agent-toolkit adapters delegate to `memory-core`
- **Event-Driven Architecture** - All operations emit A2A events for observability
- **Transport Agnostic** - Supports STDIO, HTTP/streamable, and REST access patterns
- **Governed Boundaries** - Strict import validation and architectural rules

---

## 📚 Documentation

### Core Documentation

- **Architecture Guide (in progress)** – Drafting updated system design documentation
- **[Quick Start](./docs/quick-start.md)** – Fast setup path
- **[Python Integration](./docs/python-integration.md)** – Instructor + Ollama
- **[Deployment Guide](./docs/deployment.md)** – Production deployment
- **[Security Posture](./docs/security.md)** – Current safeguards, limitations, and roadmap
- **[Streaming Modes](./docs/streaming-modes.md)** – Token, aggregated, and JSON streaming

### Development Documentation

- **[Development Setup](./docs/development-setup.md)** – Local environment
- **[Testing Guide](./docs/testing.md)** – Strategies and practices
- **[Contributing Guide](./CONTRIBUTING.md)** – How to contribute
- **[Code of Conduct](./CODE_OF_CONDUCT.md)** – Community guidelines

---

## 📦 Packages

### 🤖 AI & Automation

- **[cortex-ai-github](./packages/cortex-ai-github/)** – GitHub automation
- **[agents](./packages/agents/)** – Core AI agent behaviors
- **[rag](./packages/rag/)** – Retrieval-Augmented Generation pipeline
- **[orchestration](./packages/orchestration/)** – Multi-agent workflows

### 🔌 Communication & Integration

- **[a2a](./packages/a2a/)** – JSON-RPC 2.0 agent messaging
- **[mcp](./packages/mcp/)** – Model Context Protocol integration
- **[mcp-bridge](./packages/mcp-bridge/)** – MCP transport bridge
- **[mcp-registry](./packages/mcp-registry/)** – MCP plugin registry

### 💾 Data & Memory

- **[memories](./packages/memories/)** – State management (Neo4j/Qdrant)
- **[registry](./packages/registry/)** – Service registry and discovery
- **[mvp](./packages/mvp/)** – MVP core functionality

### 🛡️ Security & Quality

- **[security](./packages/security/)** – OWASP compliance and mTLS
- **[simlab](./packages/simlab/)** – Simulation test environment
- **[contracts](./libs/typescript/contracts/)** – Type-safe contracts

### 🖥️ User Interfaces

- **[cortex-os](./apps/cortex-os/)** – Runtime application
- **[cortex-py](./apps/cortex-py/)** – Python bindings and utilities

---

## 🛠️ Development

### Commands

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm test:coverage    # Run tests with coverage (90%+ threshold)

# Quality & Security
pnpm lint             # ESLint + Prettier
pnpm lint:all         # Full lint suite
pnpm security:scan    # Semgrep OWASP profiles
pnpm structure:validate # Governance/import rules

# Smart Nx Execution (affected-only)
pnpm build:smart      # Affected build with base/head auto-detect
pnpm test:smart       # Affected test
pnpm lint:smart       # Affected lint

# Memory Management
pnpm memory:clean     # Aggressive cleanup
pnpm memory:monitor   # Active memory monitoring
pnpm test:safe        # Memory-safe test runner
```

### Agent Toolkit (MANDATORY)

The `packages/agent-toolkit` provides a unified interface for all development operations:

```typescript
import { createAgentToolkit } from '@cortex-os/agent-toolkit';

const toolkit = createAgentToolkit();
await toolkit.multiSearch('pattern', './src');
await toolkit.validateProject(['*.ts', '*.py', '*.rs']);
```

Shell interface:

- `just scout "pattern" path` - Multi-tool search
- `just codemod 'find' 'replace' path` - Structural modifications
- `just verify changed.txt` - Auto-validation

---

## 🛡️ Quality Gates

### Coverage Requirements

| Metric | Minimum | Target |
|--------|---------|--------|
| Statements | 90% | 95% |
| Branches | 90% | 95% |
| Functions | 90% | 95% |
| Lines | 95% | 98% |

### Security Standards

- **OWASP Compliance** – Semgrep scanning with OWASP profiles
- **CodeQL Analysis** – GitHub Advanced Security
- **Secret Scanning** – Gitleaks integration
- **Dependency Scanning** – Automated vulnerability assessment
- **SBOM Generation** – Software Bill of Materials

### Network Safety

- **Safe Fetch Utilities** – All backend HTTP requests must use the shared `safeFetch` and `safeFetchJson` wrappers located in
`libs/typescript/utils/src/safe-fetch.ts` to enforce SSRF protections, request allowlists, timeouts, and brAInwav-branded error messaging.

### CI/CD Pipeline

- **Pre-commit** – Fast formatting and linting
- **Pre-push** – Full typecheck, tests, and security scans
- **CI/CD** – Comprehensive quality gates with required status checks

---

## 🔐 Security

Cortex-OS follows industry-leading security practices:

- **OAuth 2.1 + PKCE** authentication
- **mTLS** for service-to-service communication
- **OWASP** compliance tracking
- **Zero-trust** architecture
- **Encrypted** data at rest and in transit
- **Regular** security audits and penetration testing

For security concerns, email: <security@cortex-os.dev>

---

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](./CONTRIBUTING.md) for details.

### Quick Flow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Implement your changes with tests
4. Ensure all quality gates pass (`pnpm lint && pnpm test && pnpm security:scan`)
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Requirements

- All code must pass quality gates
- New features require tests
- Documentation updates for API changes
- Follow [CODESTYLE.md](./CODESTYLE.md) guidelines

---

## 📄 License

This project is licensed under the Apache License 2.0 – see the [LICENSE](./LICENSE) file for details.

```text
Copyright 2024 Cortex-OS Contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

## 📞 Support

- **📧 Email**: <support@cortex-os.dev>
- **💬 Discussions**: [GitHub Discussions](https://github.com/jamiescottcraik/Cortex-OS/discussions)
- **🐛 Issues**: [GitHub Issues](https://github.com/jamiescottcraik/Cortex-OS/issues)
- **📖 Documentation**: <https://docs.cortex-os.dev>
- **🚨 Security**: <security@cortex-os.dev>

---

## 🙏 Acknowledgments

- **[Model Context Protocol (MCP)](https://modelcontextprotocol.io/)** – For the standardized tool integration framework
- **[A2A](./packages/a2a/)** – Event-driven agent communication patterns
- **[OWASP](https://owasp.org/)** – Security standards and guidance
- **[OpenAI](https://openai.com/)** – AI platform and API
- **[Nx](https://nx.dev/)** – Monorepo tools
- **[pnpm](https://pnpm.io/)** – Fast, disk space efficient package manager

---

## Built with ❤️ by the Cortex-OS Team

[![GitHub stars](https://img.shields.io/github/stars/jamiescottcraik/Cortex-OS?style=social)](https://github.com/jamiescottcraik/Cortex-OS/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/jamiescottcraik/Cortex-OS?style=social)](https://github.com/jamiescottcraik/Cortex-OS/network)
[![GitHub issues](https://img.shields.io/github/issues/jamiescottcraik/Cortex-OS)](https://github.com/jamiescottcraik/Cortex-OS/issues)
[![GitHub license](https://img.shields.io/github/license/jamiescottcraik/Cortex-OS)](https://github.com/jamiescottcraik/Cortex-OS/blob/main/LICENSE)
