# Cortex-OS

<!-- markdownlint-disable MD013 -->

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ![Node.js Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen) ![Package Manager](https://img.shields.io/badge/pnpm-v9.9.0-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue) ![Build Status](https://img.shields.io/badge/build-passing-brightgreen) ![Test Coverage](https://img.shields.io/badge/coverage-90%25+-brightgreen) ![Security Scan](https://img.shields.io/badge/security-OWASP%20compliant-green) ![Code Quality](https://img.shields.io/badge/code%20quality-A-brightgreen)

<!-- markdownlint-enable MD013 -->

## Autonomous Software Behavior Reasoning (ASBR) Runtime

Clean, governed monorepo with strict architectural boundaries and
comprehensive quality gates.

[Documentation](#documentation) • [Quick Start](./docs/quick-start.md) •
[Architecture](./docs/architecture-overview.md) • [Python Integration](./docs/python-integration.md) •
[Contributing](#contributing) • [Packages](#packages)

---

## Overview

Cortex-OS is a production-ready **Autonomous Software Behavior Reasoning (ASBR)
Runtime** enabling AI agents to collaborate through event-driven architecture
and Model Context Protocol (MCP) integrations. The system implements strict
governance boundaries, comprehensive testing, and security practices.

### 🎯 Key Features

- **🤖 AI Agent Orchestration** – Multi-agent workflows with A2A communication
- **🔌 MCP Integration** – Standardized tool integration via MCP
- **🛡️ Security First** – OWASP compliance, SBOM generation, vulnerability scanning
- **📊 Observability** – Monitoring, tracing, analytics hooks
- **🏗️ Governed Architecture** – Import boundaries (ESLint + Nx)
- **🧪 Quality Gates** – 90% test coverage & automated scans
- **🚀 Production Ready** – Docker deployment & CI/CD pipelines

---

## Quick Start (Condensed)

See the full guide: [docs/quick-start.md](./docs/quick-start.md)

```bash
git clone https://github.com/cortex-os/cortex-os.git
cd cortex-os

# Trust repository config to silence mise warnings (suppresses trust prompts)
mise trust

# Run automated setup (installs deps, sets up git hooks, lints, validates structure)
./scripts/dev-setup.sh

# For a minimal setup without git hooks or extra tooling:
# ./scripts/dev-setup.sh --minimal

# Optional: customize workspace home (defaults to ~/.Cortex-OS)
export CORTEX_OS_HOME="$HOME/.Cortex-OS"

# Verify installation
pnpm readiness:check
pnpm dev
```

Helpful:

```bash
pnpm build
pnpm test:coverage
pnpm security:scan
pnpm structure:validate
```

---

## Architecture Snapshot

High‑level governed monorepo:

- UI + runtime apps mount feature packages via DI
- Feature packages communicate via **A2A events** and **MCP tools**
- Contracts + schemas in `libs/typescript/contracts`
- Governance rules & structure validation in `.cortex/`

More detail: [Architecture Overview](./docs/architecture-overview.md) • Full reference: [architecture.md](./docs/architecture.md)

---

## Python Integration (Instructor + Ollama)

Structured LLM usage standardized via `cortex_ml.instructor_client` with
Instructor + Ollama (OpenAI-compatible). Deterministic defaults
(`temperature=0.0`, `seed=42`).

Full guide: [Python Integration](./docs/python-integration.md)

---

## Documentation

### 📚 Core Documentation

- **[Architecture Guide](./docs/architecture.md)** – System design and patterns
- **[Architecture Overview](./docs/architecture-overview.md)** – High-level summary
- **[Quick Start](./docs/quick-start.md)** – Fast setup path
- **[Python Integration](./docs/python-integration.md)** – Instructor + Ollama
- **[Deployment Guide](./docs/deployment.md)** – Production deployment
- **[Security Guide](./docs/security.md)** – Security practices and compliance

### 🛠️ Development Documentation

- **[Development Setup](./docs/development-setup.md)** – Local environment
- **[Testing Guide](./docs/testing.md)** – Strategies and practices
- **[Contributing Guide](./CONTRIBUTING.md)** – How to contribute
- **[Code of Conduct](./CODE_OF_CONDUCT.md)** – Community guidelines

### 📖 Package Documentation

| Package            | Description                  | Documentation                                   |
| ------------------ | ---------------------------- | ----------------------------------------------- |
| `cortex-ai-github` | AI-powered GitHub automation | [README](./packages/cortex-ai-github/README.md) |
| `cortex-code`      | Terminal user interface      | [README](./apps/cortex-code/README.md)          |
| `a2a`              | Agent-to-agent communication | [README](./packages/a2a/README.md)              |
| `mcp`              | Model Context Protocol       | [README](./packages/mcp/README.md)              |
| `orchestration`    | Multi-agent workflows        | [README](./packages/orchestration/README.md)    |

---

## Packages

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
- **[cortex-code](./apps/cortex-code/)** – Terminal UI
- **[cortex-webui](./apps/cortex-webui/)** – Web dashboard
- **[cortex-cli](./apps/cortex-cli/)** – Command-line tools

---

## Development & Quality Gates (Summary)

```bash
pnpm lint               # ESLint + Prettier
pnpm test:coverage      # 90% coverage threshold
pnpm security:scan      # Semgrep OWASP profiles
pnpm structure:validate # Governance/import rules
pnpm nx graph           # Dependency visualization
```

---

## Contributing

We welcome contributions! See the [Contributing Guide](./CONTRIBUTING.md) for details.

Quick Flow:

1. Fork
2. Branch: `git checkout -b feature/awesome`
3. Implement + tests + docs
4. `pnpm lint && pnpm test`
5. Commit & push
6. Open PR (follows template)

---

## License

MIT – see [LICENSE](./LICENSE)

---

## Support

- **📧 Email**: <support@cortex-os.dev>
- **💬 Discussions**: [GitHub Discussions](https://github.com/cortex-os/cortex-os/discussions)
- **🐛 Issues**: [GitHub Issues](https://github.com/cortex-os/cortex-os/issues)
- **📖 Documentation**: <https://docs.cortex-os.dev>

---

## Acknowledgments

- Model Context Protocol (MCP)
- A2A event-driven agent patterns
- OWASP & MITRE guidance
- OpenAI + Instructor ecosystem

---

Built with ❤️ by the Cortex-OS Team

<!-- markdownlint-disable MD013 -->

![GitHub Stars](https://img.shields.io/github/stars/cortex-os/cortex-os?style=social) ![GitHub Forks](https://img.shields.io/github/forks/cortex-os/cortex-os?style=social) ![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os) ![GitHub PRs](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)

<!-- markdownlint-enable MD013 -->
