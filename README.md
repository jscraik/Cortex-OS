# Cortex-OS

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![Package Manager](https://img.shields.io/badge/pnpm-v9.9.0-blue)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#build-status)
[![Test Coverage](https://img.shields.io/badge/coverage-90%25+-brightgreen)](#testing)
[![Security Scan](https://img.shields.io/badge/security-OWASP%20compliant-green)](#security)
[![Code Quality](https://img.shields.io/badge/code%20quality-A-brightgreen)](#code-quality)

**Autonomous Software Behavior Reasoning (ASBR) Runtime**  
_Clean, governed monorepo with strict architectural boundaries and comprehensive quality gates_

[📖 Documentation](#documentation) • [🚀 Quick Start](#quick-start) • [🏗️ Architecture](#architecture) • [🤝 Contributing](#contributing) • [📦 Packages](#packages)

</div>

---

## Overview

Cortex-OS is a production-ready **Autonomous Software Behavior Reasoning (ASBR) Runtime** that enables AI agents to collaborate effectively through event-driven architecture and Model Context Protocol (MCP) integrations. The system implements strict governance boundaries, comprehensive testing, and industrial-grade security practices.

### 🎯 Key Features

- **🤖 AI Agent Orchestration** - Multi-agent workflows with A2A communication
- **🔌 MCP Integration** - Standardized tool integration via Model Context Protocol
- **🛡️ Security First** - OWASP compliance, SBOM generation, vulnerability scanning
- **📊 Observability** - Comprehensive monitoring, tracing, and analytics
- **🏗️ Governed Architecture** - Strict import boundaries enforced via ESLint and Nx
- **🧪 Quality Gates** - 90% test coverage, automated security scanning
- **🚀 Production Ready** - Docker deployment, CI/CD pipelines, health monitoring

## Quick Start

### Prerequisites

- **Node.js** 20 or later (global `crypto` API required)
- **pnpm** 9.9.0 (exact version required)
- **Git** 2.40+
- **Docker** (optional, for containerized deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/cortex-os/cortex-os.git
cd cortex-os


# Run automated setup (trusts mise, installs dependencies, lints code, validates structure, and cleans up workspace)

./scripts/dev-setup.sh

# Set up environment (optional - uses ~/.Cortex-OS by default)
export CORTEX_OS_HOME="$HOME/.Cortex-OS"

# Verify installation
pnpm readiness:check
```

### Efficiency Tools Auto-Setup

This repo auto-ensures a small set of CLI tools that speed up development (e.g., `ripgrep`, `ctags`, `hyperfine`, `delta`, `gitleaks`, `semgrep`, `codeql`, `src`).

- Auto-run points: `postinstall`, `post-checkout`, `post-merge`, and `pre-commit` will quietly ensure required tools are present.
- Hooks path: `postinstall` configures `git config --local core.hooksPath .githooks` (skipped in CI) so Git uses our hooks.
- Opt-out: set `CORTEX_EFFICIENCY_SETUP_SKIP=1` to skip all auto-ensure behavior (useful for constrained or managed environments).
- Manual commands:

```bash
pnpm ensure:tools   # Check and install missing tools
pnpm install:tools  # Force-install tools without checks
```

If you prefer not to modify your environment, export `CORTEX_EFFICIENCY_SETUP_SKIP=1` before `pnpm install` and in your shell profile.

### Development Server

```bash
# Start the core runtime
pnpm dev

# Start TUI interface
cd apps/cortex-code && cargo run

# Start web interface
cd apps/cortex-webui && pnpm dev

# Set up GitHub Apps (requires configuration)
./github-apps-diagnostic.sh        # Check current status
./start-github-apps.sh             # Start all GitHub apps
./free-ports.sh all                 # Free GitHub app ports if needed
```

### Port Configuration

Cortex-OS uses a centralized port registry for development services:

- **MCP Server**: 3000 (Cloudflare tunnel reserved)
- **GitHub AI App**: 3001
- **Semgrep App**: 3002
- **Structure App**: 3003

Port configuration is managed via `config/ports.env` and can be customized using the `CORTEX_OS_HOME` environment variable.

### Quick Commands

```bash
# Build all packages
pnpm build

# Run tests with coverage
pnpm test:coverage

# Security scanning
pnpm security:scan

# Lint and format
pnpm lint && pnpm format

# Check governance compliance
pnpm structure:validate
```

## Architecture

### 🏛️ System Overview

Cortex-OS implements a **governed monorepo architecture** with strict separation of concerns:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     Apps        │    │    Packages      │    │     Libs        │
│                 │    │                  │    │                 │
│ • cortex-os     │───▶│ • a2a (comms)   │───▶│ • contracts     │
│ • cortex-code    │    │ • mcp (tools)    │    │ • types         │
│ • cortex-webui  │    │ • orchestration  │    │ • utils         │
│ • cortex-cli    │    │ • memories       │    │ • telemetry     │
└─────────────────┘    │ • rag            │    └─────────────────┘
                       │ • agents         │              ▲
                       │ • security       │              │
                       └──────────────────┘              │
                                ▲                        │
                                │                        │
                       ┌──────────────────┐              │
                       │    .cortex/      │──────────────┘
                       │   (Governance)   │
                       │                  │
                       │ • rules/         │
                       │ • schemas/       │
                       │ • gates/         │
                       └──────────────────┘
```

### 📦 Package Categories

| Category           | Purpose                  | Key Packages                               |
| ------------------ | ------------------------ | ------------------------------------------ |
| **Applications**   | User-facing interfaces   | `cortex-os`, `cortex-code`, `cortex-webui` |
| **Communication**  | Agent-to-agent messaging | `a2a`, `mcp`, `orchestration`              |
| **Intelligence**   | AI capabilities          | `agents`, `rag`, `cortex-ai-github`        |
| **Infrastructure** | Core services            | `memories`, `security`, `registry`         |
| **Governance**     | Validation & policies    | `.cortex/`, quality gates                  |

### 🔄 Communication Patterns

1. **A2A Event Bus** - Async pub/sub messaging via JSON-RPC 2.0
2. **MCP Tools** - External integrations and side effects
3. **Service Interfaces** - DI-based contracts for core services

**Critical**: Direct imports between feature packages are **forbidden** by ESLint rules and Nx dependency constraints.

## Documentation

### 📚 Core Documentation

- **[Architecture Guide](https://github.com/jamiescottcraik/Cortex-OS/blob/main/docs/architecture.md)** - System design and patterns
- **[API Reference](./docs/api/)** - Complete API documentation
- **[Deployment Guide](./docs/deployment.md)** - Production deployment
- **[Security Guide](./docs/security.md)** - Security practices and compliance

### 🛠️ Development Documentation

- **[Development Setup](./docs/development.md)** - Local development environment
- **[Testing Guide](./docs/testing.md)** - Testing strategies and practices
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute
- **[Code of Conduct](./CODE_OF_CONDUCT.md)** - Community guidelines

### 📖 Package Documentation

| Package                                          | Description                  | Documentation                                   |
| ------------------------------------------------ | ---------------------------- | ----------------------------------------------- |
| [cortex-ai-github](./packages/cortex-ai-github/) | AI-powered GitHub automation | [README](./packages/cortex-ai-github/README.md) |
| [cortex-code](./apps/cortex-code/)               | Terminal user interface      | [README](./apps/cortex-code/README.md)          |
| [a2a](./packages/a2a/)                           | Agent-to-agent communication | [README](./packages/a2a/README.md)              |
| [mcp](./packages/mcp/)                           | Model Context Protocol       | [README](./packages/mcp/README.md)              |
| [orchestration](./packages/orchestration/)       | Multi-agent workflows        | [README](./packages/orchestration/README.md)    |

## Packages

<details>
<summary><strong>🤖 AI & Automation</strong></summary>

- **[cortex-ai-github](./packages/cortex-ai-github/)** - AI-powered GitHub automation with comment-as-API triggers
- **[agents](./packages/agents/)** - Core AI agent implementations and behaviors
- **[rag](./packages/rag/)** - Retrieval-Augmented Generation pipeline
- **[orchestration](./packages/orchestration/)** - Multi-agent workflow coordination

</details>

<details>
<summary><strong>🔌 Communication & Integration</strong></summary>

- **[a2a](./packages/a2a/)** - Agent-to-Agent JSON-RPC 2.0 communication
- **[mcp](./packages/mcp/)** - Model Context Protocol integration and plugin system
- **[mcp-bridge](./packages/mcp-bridge/)** - MCP transport bridge and adapters
- **[mcp-registry](./packages/mcp-registry/)** - MCP plugin registry and marketplace

</details>

<details>
<summary><strong>💾 Data & Memory</strong></summary>

- **[memories](./packages/memories/)** - Long-term state management with Neo4j/Qdrant
- **[registry](./packages/registry/)** - Service registry and discovery
- **[mvp](./packages/mvp/)** - Minimum Viable Product core functionality

</details>

<details>
<summary><strong>🛡️ Security & Quality</strong></summary>

- **[security](./packages/security/)** - Security utilities, OWASP compliance, mTLS
- **[simlab](./packages/simlab/)** - Simulation environment for testing
- **[contracts](./libs/typescript/contracts/)** - Type-safe contracts and validation

</details>

<details>
<summary><strong>🖥️ User Interfaces</strong></summary>

- **[cortex-os](./apps/cortex-os/)** - Main ASBR runtime application
- **[cortex-code](./apps/cortex-code/)** - Terminal UI with multi-view interface
- **[cortex-webui](./apps/cortex-webui/)** - Web-based dashboard and interface
- **[cortex-cli](./apps/cortex-cli/)** - Command-line interface and tools

</details>

## Development

### 🛠️ Development Tools

```bash
# Monorepo tools
pnpm nx graph              # Visualize project dependencies
pnpm turbo run build      # Parallel task execution

# Quality gates
pnpm lint                  # ESLint + Prettier
pnpm test:coverage         # Jest with 90% threshold
pnpm security:scan         # Semgrep OWASP analysis
pnpm structure:validate    # Governance compliance

# GitHub Apps development
./github-apps-diagnostic.sh    # Diagnose GitHub app setup
./start-github-apps.sh         # Start all GitHub apps
./free-ports.sh all            # Free GitHub app ports

# Port management
./free-ports.sh list           # Show port usage
./free-ports.sh 3001 3002     # Free specific ports

# MCP development
pnpm mcp:start             # Start MCP server
pnpm mcp:smoke             # MCP smoke tests

# Simulation testing
pnpm simlab:critical       # Critical system tests
```

### 🧪 Testing

- **Unit Tests**: Package-specific tests in `tests/` directories
- **Integration Tests**: Multi-package interactions in `tests/integration/`
- **Security Tests**: OWASP compliance testing in `tests/security/`
- **E2E Tests**: End-to-end scenarios via Playwright
- **Coverage**: 90% threshold enforced globally

### 📊 Quality Gates

- **Coverage**: 90% statements/branches/functions/lines required
- **Security**: Semgrep scanning with OWASP, LLM, and MITRE ATLAS rulesets
- **Type Safety**: TypeScript strict mode throughout
- **Import Boundaries**: ESLint enforced architectural rules
- **Performance**: Bundle size limits and performance budgets

## Build Status

| Service       | Status                                                           | Coverage                                                             | Security                                                             |
| ------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Core Runtime  | ![Build](https://img.shields.io/badge/build-passing-brightgreen) | ![Coverage](https://img.shields.io/badge/coverage-94%25-brightgreen) | ![Security](https://img.shields.io/badge/security-clean-brightgreen) |
| TUI Interface | ![Build](https://img.shields.io/badge/build-passing-brightgreen) | ![Coverage](https://img.shields.io/badge/coverage-92%25-brightgreen) | ![Security](https://img.shields.io/badge/security-clean-brightgreen) |
| AI GitHub App | ![Build](https://img.shields.io/badge/build-passing-brightgreen) | ![Coverage](https://img.shields.io/badge/coverage-96%25-brightgreen) | ![Security](https://img.shields.io/badge/security-clean-brightgreen) |
| MCP Services  | ![Build](https://img.shields.io/badge/build-passing-brightgreen) | ![Coverage](https://img.shields.io/badge/coverage-91%25-brightgreen) | ![Security](https://img.shields.io/badge/security-clean-brightgreen) |

## Security

Cortex-OS implements comprehensive security measures:

- **🔐 OWASP Compliance** - Validated against OWASP Top-10 2021
- **🤖 LLM Security** - OWASP LLM Top-10 validation
- **🛡️ MITRE ATLAS** - ML security framework compliance
- **🔑 Secret Management** - Secure credential handling
- **🌐 Network Security** - mTLS, SPIFFE/SPIRE integration
- **📋 SBOM Generation** - Software Bill of Materials tracking

### Security Scanning

```bash
pnpm security:scan              # OWASP precise rules
pnpm security:scan:comprehensive # All security rulesets
pnpm security:scan:llm          # LLM-specific rules
pnpm security:scan:atlas        # MITRE ATLAS rules
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Follow** our development guidelines and run quality checks
4. **Commit** your changes (`git commit -m 'Add amazing feature'`)
5. **Push** to the branch (`git push origin feature/amazing-feature`)
6. **Open** a Pull Request

### Development Guidelines

- Follow the established architecture patterns
- Maintain 90% test coverage
- Pass all security scans
- Follow the code style (ESLint + Prettier)
- Update documentation as needed

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Support

- **📧 Email**: <support@cortex-os.dev>
- **💬 Discussions**: [GitHub Discussions](https://github.com/cortex-os/cortex-os/discussions)
- **🐛 Issues**: [GitHub Issues](https://github.com/cortex-os/cortex-os/issues)
- **📖 Documentation**: [docs.cortex-os.dev](https://docs.cortex-os.dev)

## Acknowledgments

- **Model Context Protocol** - Anthropic's MCP specification
- **A2A Architecture** - Event-driven agent communication patterns
- **OWASP** - Security guidelines and validation frameworks
- **OpenAI** - AI model integration patterns

---

<div align="center">

**Built with ❤️ by the Cortex-OS Team**

[![GitHub Stars](https://img.shields.io/github/stars/cortex-os/cortex-os?style=social)](https://github.com/cortex-os/cortex-os)
[![GitHub Forks](https://img.shields.io/github/forks/cortex-os/cortex-os?style=social)](https://github.com/cortex-os/cortex-os)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub PRs](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)

</div>
