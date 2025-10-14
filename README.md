<div align="center">

# Cortex-OS

**Autonomous Software Behavior Reasoning (ASBR) Runtime**

*Production-ready AI agent orchestration platform with event-driven architecture and comprehensive observability*

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-20.x%20|%2022.x-brightgreen)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10.3.0-blue)](https://pnpm.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue)](https://www.typescriptlang.org)
[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/jamiescottcraik/Cortex-OS/actions)
[![Coverage](https://img.shields.io/badge/coverage-90%25+-brightgreen)](https://github.com/jamiescottcraik/Cortex-OS)
[![Security](https://img.shields.io/badge/security-0%20vulnerabilities-green)](https://github.com/jamiescottcraik/Cortex-OS/security)
[![Code Quality](https://img.shields.io/badge/code%20quality-A-brightgreen)](https://github.com/jamiescottcraik/Cortex-OS)

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Architecture](#-architecture) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Development](#-development)
- [Documentation](#-documentation)
- [Packages](#-packages)
- [Security](#-security)
- [Contributing](#-contributing)
- [Support](#-support)
- [License](#-license)

---

## 🎯 About

Cortex-OS is a production-ready **Autonomous Software Behavior Reasoning (ASBR) Runtime** that enables AI agents to collaborate effectively through event-driven architecture and Model Context Protocol (MCP) integrations.

Built as a governed monorepo with strict architectural boundaries, Cortex-OS provides the foundation for building reliable, secure, and scalable AI agent systems. The platform enforces comprehensive quality gates, security best practices, and maintains a clean separation of concerns across all components.

### Why Cortex-OS?

- **🏗️ Production-Ready**: Battle-tested with comprehensive testing (90%+ coverage), security scanning, and quality gates
- **🔒 Security-First**: OWASP compliant with zero known vulnerabilities, OAuth 2.1 + PKCE, and continuous scanning
- **📊 Observable**: Full OpenTelemetry instrumentation, distributed tracing, and comprehensive monitoring
- **🎯 Governed**: Enforced architectural boundaries, import rules, and code quality standards
- **⚡ Performant**: Smart Nx execution, optimized builds, and efficient resource management

---

## ✨ Features

### Core Capabilities

- **🤖 AI Agent Orchestration** – Multi-agent workflows with advanced coordination and A2A communication
- **🔄 Unified Workflow Engine** – Integrated PRP Runner and Task Management with state machine orchestration
- **🧠 Multimodal AI Processing** – Support for images, audio, PDFs with OCR, vision analysis, and cross-modal search
- **🔍 Advanced RAG System** – Retrieval-Augmented Generation with unified embeddings and citation tracking
- **🌟 REF‑RAG Tri-Band Context** – Risk-Enhanced Fact Retrieval with intelligent context bands and verification
- **🌟 Wikidata Semantic Integration** – Production-ready wikidata workflow with vector search, claims, and SPARQL enrichment
- **🔌 MCP Integration** – Standardized tool integration via Model Context Protocol with FastMCP v3
- **📊 Observability** – OpenTelemetry instrumentation, distributed tracing, and comprehensive monitoring

### Quality & Security

- **🛡️ Security-First Design** – OWASP compliance, OAuth 2.1 + PKCE, vulnerability scanning, SBOM generation
- **🧪 Comprehensive Testing** – 90%+ code coverage, mutation testing, TDD enforcement, automated quality gates
- **🏗️ Governed Architecture** – Import boundaries via ESLint + Nx, strict dependency rules, validated structure
- **📈 Quality Metrics** – Automated coverage tracking, mutation score badges, continuous quality monitoring

### Developer Experience

- **⚡ Smart Nx Execution** – Affected-only builds, intelligent caching, optimized task execution
- **🔧 Agent Toolkit** – Unified development interface for code search, validation, and structural modifications
- **📝 Rich Documentation** – Comprehensive guides, API references, architecture documentation
- **🚀 Production Ready** – Docker deployment, CI/CD pipelines, health checks, graceful shutdown
- **⚡ Performance Optimized** – Advanced performance management with auto-scaling, intelligent routing, and GPU acceleration

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 20.x or 22.x
- **pnpm**: 10.3.0 or higher
- **Git**: Latest version

### Installation

```bash
# Clone the repository
git clone https://github.com/jamiescottcraik/Cortex-OS.git
cd Cortex-OS

# Run automated setup (recommended)
./scripts/dev-setup.sh

# Verify installation
pnpm readiness:check

# Start development server
pnpm dev
```

### Performance Optimization (Optional)

For maximum performance, enable the performance optimization suite:

```bash
# Run all performance optimizations
pnpm performance:optimize

# Start with optimized settings
pnpm performance:start

# Individual performance components
pnpm performance:scaling     # Advanced auto-scaling
pnpm performance:redis       # Distributed Redis clustering
pnpm performance:analytics   # Performance analytics
pnpm performance:router      # Intelligent query routing
pnpm performance:gpu         # GPU management
pnpm performance:alerts      # Alerting system
```

### Using Just (Quick Commands)

```bash
just setup          # Set up development environment
just dev            # Start development server
just test           # Run comprehensive tests
just quality        # Run all quality checks
just dev-cycle      # Complete development workflow
just --list         # See all available commands
```

### Manual Setup

```bash
# Install dependencies
pnpm install

# Build packages
pnpm build:smart

# Run tests
pnpm test:smart

# Validate structure
pnpm structure:validate
```


### Optional: Vibe Check MCP Oversight (brAInwav)

- Purpose: External MCP server providing CPI-based oversight via tools: vibe_check, vibe_learn, update/reset/check_constitution.
- Install server locally: `npx @pv-bhat/vibe-check-mcp start --http --port 2091` (or use stdio).
- Configure Cortex-OS to use it by setting:
  - `VIBE_CHECK_HTTP_URL=http://127.0.0.1:2091`
- Enforcement policy: AGENTS.md mandates calling vibe_check after planning and before writes/network. Logs and errors include brAInwav branding.
  - Persist env: add `export VIBE_CHECK_HTTP_URL=...` to your shell rc (~/.zshrc) or create `.env.local` at repo root with the same line.

- Disable or switch server by unsetting the env or pointing to another URL.

For detailed setup instructions, see [docs/quick-start.md](./docs/quick-start.md).

---

## 🏗️ Architecture

### System Overview

Cortex-OS implements a unified memory architecture with strict governance:

```text
┌─────────────────────────────────────────────────────────┐
│                    Clients                              │
├──────────┬──────────┬──────────┬──────────┬────────────┤
│ Claude   │ ChatGPT  │ VS Code  │ Editors  │ Others     │
│ Desktop  │          │          │          │            │
└─────┬────┴─────┬────┴─────┬────┴─────┬────┴─────┬──────┘
      │          │          │          │          │
      │ STDIO    │ HTTP/SSE │ HTTP     │          │
      │          │          │          │          │
┌─────▼────────┐ ┌─────▼────────────────▼────────┐│
│ cortex-os    │ │      cortex-mcp               ││
│ (runtime)    │ │    (MCP Server)               ││
└──────────────┘ └─────┬────────────────┬─────────┘
                       │                │
                 ┌─────▼─────┐   ┌─────▼─────┐
                 │ rest-api  │   │ agent-    │
                 │ (gateway) │   │ toolkit   │
                 └───────────┘   └───────────┘
                       │                │
                       └────────┬───────┘
                                │
                     ┌──────────▼──────────┐
                     │    memory-core      │
                     │  (Single Source of  │
                     │      Truth)         │
                     └──────────┬──────────┘
                                │
                     ┌──────────▼──────────┐
                     │   Storage Layer     │
                     │  SQLite + Qdrant    │
                     └─────────────────────┘
```

### Architecture Principles Recap

- **Single Source of Truth**: All business logic in `memory-core`
- **Thin Adapter Pattern**: MCP, REST, and toolkit delegate to core
- **Event-Driven Architecture**: A2A events for cross-package communication
- **Transport Agnostic**: STDIO, HTTP/streamable, and REST support
- **Governed Boundaries**: Enforced import validation and dependency rules

For detailed architecture information, see [docs/architecture.md](./docs/architecture.md).

---

## 💻 Development

### TypeScript Build System

Cortex-OS uses TypeScript project references for optimized incremental builds:

```bash
# Incremental build with project references (9x faster)
pnpm tsc --build packages/gateway

# Watch mode for development
pnpm tsc --build --watch packages/gateway

# Clean and rebuild
pnpm tsc --build --clean packages/gateway
pnpm tsc --build --force packages/gateway
```

**Benefits**:
- 9x faster incremental builds (45s → 5s)
- Only changed packages recompiled
- Better IDE performance and type checking
- 63 project references across top 10 packages

### Smart Nx Execution (Affected-Only)

Use smart wrappers for efficient development:

```bash
pnpm build:smart       # Build only affected packages
pnpm test:smart        # Test only affected packages
pnpm lint:smart        # Lint only affected packages
pnpm typecheck:smart   # Type-check only affected packages

# Dry-run mode (preview without execution)
pnpm build:smart --dry-run
```

### Quality Commands

```bash
pnpm lint              # ESLint + Biome formatting
pnpm test:coverage     # Run tests with coverage (90%+ required)
pnpm security:scan     # Semgrep security scanning
pnpm structure:validate # Validate governance rules
pnpm nx graph          # Visualize dependencies
```

### TDD Enforcement

```bash
make tdd-setup         # Set up TDD Coach
make tdd-status        # Check TDD status
make tdd-watch         # Run in watch mode
make tdd-validate      # Validate specific files
```

### Agent Toolkit Integration

The Agent Toolkit provides unified development operations:

```typescript
import { createAgentToolkit } from '@cortex-os/agent-toolkit';

const toolkit = createAgentToolkit();
await toolkit.multiSearch('pattern', './src');
await toolkit.validateProject(['*.ts', '*.py', '*.rs']);
```

Shell interface:

```bash
just scout "pattern" path                      # Multi-tool search
just codemod 'find(:[x])' 'replace(:[x])' path # Structural modifications  
just verify changed.txt                        # Auto-validation
```

---

## 📚 Documentation

### Getting Started

- **[Quick Start Guide](./docs/quick-start.md)** – Installation and first steps
- **[Development Setup](./docs/development-setup.md)** – Complete environment configuration
- **[Task Runners Guide](./docs/task-runners.md)** – Just, Make, and pnpm scripts

### Architecture & Design

- **[Architecture Overview](./docs/architecture-overview.md)** – System design and principles
- **[REF‑RAG System](./docs/ref-rag.md)** – Risk-Enhanced Fact Retrieval with tri-band context
- **[Python Integration](./docs/python-integration.md)** – Python packages and workflows
- **[Memory Architecture](./docs/memory-architecture.md)** – Unified memory system
- **[MCP Integration](./docs/mcp-integration.md)** – Model Context Protocol details
- **[Performance Optimization Guide](./PERFORMANCE_OPTIMIZATION_GUIDE.md)** – Comprehensive performance management
- **[Performance Implementation Summary](./PERFORMANCE_IMPLEMENTATION_SUMMARY.md)** – Implementation details and usage

### Development Guides

- **[CODESTYLE.md](./CODESTYLE.md)** – Mandatory coding standards
- **[AGENTS.md](./AGENTS.md)** – Agent workflows and governance
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** – Contribution guidelines
- **[NAMING_CONVENTIONS.md](./NAMING_CONVENTIONS.md)** – File and code naming rules
- **[1Password Env Integration](./docs/development/1password-env.md)** – Shared dotenv loader and FIFO safeguards

### Additional Resources

- **[Streaming Modes](./docs/streaming-modes.md)** – CLI streaming configuration
- **[Memory Tuning Guide](./docs/memory-tuning.md)** – Workspace memory optimization
- **[Code of Conduct](./CODE_OF_CONDUCT.md)** – Community guidelines
- **[Security Policy](./SECURITY.md)** – Responsible disclosure

---

## 📦 Packages

### AI & Automation

| Package | Description | Documentation |
|---------|-------------|---------------|
| `cortex-ai-github` | AI-powered GitHub automation | [README](./packages/cortex-ai-github/README.md) |
| `agents` | Core AI agent behaviors | [README](./packages/agents/README.md) |
| `rag` | REF‑RAG: Risk-Enhanced Fact Retrieval with tri-band context | [README](./packages/rag/README.md) |
| `orchestration` | Multi-agent workflows | [README](./packages/orchestration/README.md) |

### Communication & Integration

| Package | Description | Documentation |
|---------|-------------|---------------|
| `a2a` | Agent-to-agent JSON-RPC 2.0 messaging | [README](./packages/a2a/README.md) |
| `mcp` | Model Context Protocol integration | [README](./packages/mcp/README.md) |
| `mcp-bridge` | MCP transport bridge | [README](./packages/mcp-bridge/README.md) |
| `mcp-registry` | MCP plugin registry | [README](./packages/mcp-registry/README.md) |

### Data & Memory

| Package | Description | Documentation |
|---------|-------------|---------------|
| `memories` | State management with Neo4j/Qdrant | [README](./packages/memories/README.md) |
| `registry` | Service registry and discovery | [README](./packages/registry/README.md) |

### Security & Quality

| Package | Description | Documentation |
|---------|-------------|---------------|
| `security` | OWASP compliance and mTLS | [README](./packages/security/README.md) |
| `simlab` | Simulation test environment | [README](./packages/simlab/README.md) |
| `tdd-coach` | Test-driven development tools | [README](./packages/tdd-coach/README.md) |
| `contracts` | Type-safe contracts | [README](./libs/typescript/contracts/README.md) |

### Applications

| Application | Description | Documentation |
|-------------|-------------|---------------|
| `cortex-os` | Main ASBR runtime application | [README](./apps/cortex-os/README.md) |
| `cortex-code` | Terminal UI and CLI tooling | [README](./apps/cortex-code/README.md) |
| `cortex-webui` | Web dashboard interface | [README](./apps/cortex-webui/README.md) |

---

## 🔒 Security

### Current Security Posture

**Status**: ✅ **ZERO VULNERABILITIES**

- **Dependency Audit**: 0 vulnerabilities across 3,947 dependencies
- **Dependabot**: All security advisories resolved
- **Secret Scanning**: No secrets detected
- **Code Scanning**: Active Semgrep rulesets (OWASP, LLM, MITRE ATLAS)

### Security Features

- **OWASP Compliance**: Top-10 2021 validation throughout codebase
- **LLM Security**: Prompt injection guards, input validation
- **OAuth 2.1 + PKCE**: Secure authentication flows
- **mTLS**: Mutual TLS for production deployments
- **SBOM Generation**: CycloneDX format for artifacts
- **Vulnerability Scanning**: Automated security checks in CI/CD

### Recent Security Fixes

**2025-01-21**: Pino logging update

- Updated `pino` from v8.x/v9.x to v10.0.0 across 14 packages
- Resolved CVE-2025-57319 (fast-redact prototype pollution)
- Implemented pnpm security overrides globally

For detailed security information, see [SECURITY.md](./SECURITY.md) and [SECURITY_FIXES_REPORT.md](./SECURITY_FIXES_REPORT.md).

---

## 🤝 Contributing

We welcome contributions from the community! Please read our guidelines before getting started:

- **[Contributing Guide](./CONTRIBUTING.md)** – How to contribute code, documentation, and bug reports
- **[Code of Conduct](./CODE_OF_CONDUCT.md)** – Community standards and expectations
- **[Development Setup](./docs/development-setup.md)** – Setting up your development environment

### Quick Contribution Workflow

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/Cortex-OS.git

# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes and test
pnpm test:smart
pnpm lint:smart

# Commit with conventional commits
git commit -m "feat: add new feature"

# Push and create a pull request
git push origin feature/your-feature-name
```

---

## 💬 Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/jamiescottcraik/Cortex-OS/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jamiescottcraik/Cortex-OS/discussions)
- **Security**: [security@brainwav.io](mailto:security@brainwav.io) (responsible disclosure)

---

## 📄 License

This project is dual-licensed:

- **[MIT License](./LICENSE)** – Open source license for community use
- **[Commercial License](./COMMERCIAL-LICENSE.md)** – For commercial deployments

For licensing inquiries, contact [licensing@brainwav.io](mailto:licensing@brainwav.io).

---

## 📊 Quality Gate & Metrics

Automated quality signals are produced on every CI run and surfaced as static badges + an inline sparkline:

### Thresholds

#### PR Gate Requirements (Must Pass)

These are **mandatory minimums** for PR merges:

| Metric | PR Gate Minimum | Env Override |
|--------|----------------|-------------|
| Branch Coverage | 65% | `BRANCH_MIN` |
| Mutation Score  | 75% | `MUTATION_MIN` |

The composite gate passes only if BOTH thresholds are met. Customize via:

```bash
BRANCH_MIN=85 MUTATION_MIN=80 pnpm badges:generate
```

#### Aspirational Baselines (Target Goals)

These are the **target coverage expectations** configured in `vitest.config.ts`:

| Metric | Target | Environment Variable |
|--------|--------|--------------------||
| Statements | 90% | `COVERAGE_THRESHOLD_STATEMENTS` |
| Branches | 90% | `COVERAGE_THRESHOLD_BRANCHES` |
| Functions | 90% | `COVERAGE_THRESHOLD_FUNCTIONS` |
| Lines | 95% | `COVERAGE_THRESHOLD_LINES` |

### CI Enforcement

Workflow: `.github/workflows/ci-quality-gate.yml` runs:

1. Coverage sampling (`pnpm coverage:branches:record`)
2. Mutation testing (`pnpm mutation:test`)
3. Badge + metrics generation (`pnpm badges:generate`)
4. Gate enforcement (`pnpm quality:gate`)

Failure returns a non‑zero exit code and blocks the PR with a required status check.

### Inline Sparkline

The inline sparkline between `BRANCH_TREND_INLINE_START/END` markers is injected by:

```bash
pnpm sparkline:inline
```

Generation order (if running locally):

```bash
pnpm coverage:branches:record   # Adds a sample & updates history
pnpm mutation:test              # Produces Stryker JSON
pnpm badges:generate            # Writes badges + metrics + trend
pnpm sparkline:inline           # Embeds data URI sparkline into README
```

### Mutation Operator Effectiveness

Stryker output is aggregated to provide detection rates per operator. View:

```text
reports/badges/mutation-operators-summary.md
```

Columns:

### metrics.json Structure

```jsonc
{
  "branchCoverage": 87.5,
  "mutationScore": 78.3,
  "qualityGate": { "pass": true, "branchMin": 65, "mutationMin": 75 },
  "branchSamples": 12,
  "mutationSamples": 12,
  "generatedAt": "2025-01-01T12:34:56.000Z"
}
```

### Why Static SVGs?

reduce API latency and allow offline inspection while still enabling future
evolution to dynamic endpoints (e.g., GitHub Pages JSON → Shields endpoint
pattern) without breaking existing consumers.

---

## �️ brAInwav Development Standards

```

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

### Key Components

- **UI + runtime apps** mount feature packages via dependency injection
- **Feature packages** communicate via **A2A events** and **MCP tools**
- **Contracts + schemas** in `libs/typescript/contracts`
- **Governance rules & structure validation** in `.cortex/`
- **Agent-Toolkit integration** with tools path resolution prioritizing `$HOME/.Cortex-OS/tools/agent-toolkit`

More detail: [Architecture Overview](./docs/architecture-overview.md) • Full reference: [architecture.md](./docs/architecture.md)

---

## Python Integration (Instructor + Ollama)

Structured LLM usage standardized via `cortex_ml.instructor_client` with
Instructor + Ollama (OpenAI-compatible). Deterministic defaults
(`temperature=0.0`, `seed=42`).

Full guide: [Python Integration](./docs/python-integration.md)

---

## Development & Quality Gates (Summary)

### 🔁 Streaming Modes (CLI Summary)

The CLI and runtime support flexible model output streaming with strict precedence control.

- Default behavior: token deltas streamed to stdout
- Aggregated final output: use `--aggregate` (or set config `stream.mode = "aggregate"`)
- Force token streaming when aggregate is configured: `--no-aggregate`
- JSON event streaming for programmatic consumption: `--json` (alias) or `--stream-json` (emits events: `delta`, `item`, `completed`)
- Precedence: CLI flag > environment (`CORTEX_STREAM_MODE`) > config file > internal default

See full spec & examples: [Streaming Modes Documentation](./docs/streaming-modes.md)

```bash
pnpm lint               # ESLint + Prettier
pnpm test:coverage      # 90% coverage threshold
pnpm security:scan      # Semgrep OWASP profiles
pnpm structure:validate # Governance/import rules
pnpm nx graph           # Dependency visualization
scripts/list-rust-editions.sh -e 2024  # Audit crates pinned to Rust 2024 edition
scripts/cleanup-duplicate-configs.sh   # Remove/consolidate duplicate config files
```

### 🔐 Security Status

**Current Security Posture**: ✅ **ZERO VULNERABILITIES**

- **Dependabot**: All advisories resolved (CVE-2025-57319 fixed)
- **Secret Scanning**: No secrets detected
- **Dependency Audit**: 0 vulnerabilities across 3,947 dependencies
- **Code Scanning**: Semgrep OWASP, LLM, and MITRE ATLAS rulesets active in CI/CD

**Recent Security Fixes** (2025-01-21):

- Updated `pino` from v8.x/v9.x to v10.0.0 across 14 packages
- Resolved fast-redact prototype pollution vulnerability (CVE-2025-57319)
- Implemented pnpm overrides for security enforcement:
  - `pino@>=10.0.0` forced globally
  - `fast-redact` replaced with `slow-redact`
- Updated @pact-foundation/pact to v15.0.1

**Reference**: See [SECURITY_FIXES_REPORT.md](./SECURITY_FIXES_REPORT.md) for comprehensive details.

> **Latest:** Improved streaming modes with unified `--stream-mode` flag, JSON schema validation,
> and comprehensive automation examples. See [`docs/streaming-modes.md`](./docs/streaming-modes.md).

### 🧪 Coverage & Mutation Badges

Badges are generated locally and (optionally) committed so the README can reference static SVGs:

```bash
# Record branch coverage sample and generate badges
pnpm coverage:branches:record
pnpm badges:generate

# Run mutation tests, enforce threshold, then regenerate badges
pnpm mutation:enforce
pnpm badges:generate

# TDD Coach integration for real-time validation
make tdd-setup
make tdd-validate
make tdd-watch
```

Scripts:

| Script | Purpose |
| ------ | ------- |
| `coverage:branches:record` | Run coverage + append branch % to history file |
| `coverage:branches:report` | Show branch coverage trend |
| `coverage:branches:enforce` | Fail if branch coverage < 65% (env `BRANCH_MIN` override) |
| `mutation:test` | Run Stryker mutation tests (targeted scope) |
| `mutation:enforce` | Run Stryker then enforce `MUTATION_MIN` (default 75%) |
| `mutation:badges` | Run Stryker then generate both badges |
| `badges:generate` | Generate SVG badges from existing reports |

Outputs:

- Branch coverage history: `reports/branch-coverage-history.json`
- Mutation report JSON: `reports/mutation/mutation.json`
- Badges: `reports/badges/{branch-coverage.svg,mutation-score.svg}`
- Metrics JSON (for Pages / API): `reports/badges/metrics.json`

Nightly workflow (`badge-refresh.yml`) regenerates coverage, mutation score, badges, and publishes a
GitHub Pages artifact (includes `index.html`, badges, and `metrics.json`). This enables low‑latency
cached badge rendering while allowing programmatic consumption of the combined metrics at:

```text
https://<github-user>.github.io/Cortex-OS/metrics.json
```

Example JSON shape:

```json
{
  "branchCoverage": 92.31,
  "mutationScore": 76.45,
  "generatedAt": "2025-09-14T02:17:12.345Z"
}
```

To manually refresh locally (e.g., before pushing a quality improvements PR):

```bash
pnpm coverage:branches:record
pnpm mutation:enforce  # ensures threshold >= 75%
pnpm badges:generate
git add reports/badges reports/branch-coverage-history.json reports/mutation/mutation.json
git commit -m "chore(badges): manual refresh" && git push
```

CI Workflows:

- `ci-smoke-micro-edge.yml` – fast heuristic & negative-path guard (<5s)
- `ci-mutation-guard.yml` – mutation score enforcement (`MUTATION_MIN`)

Adjust thresholds via env overrides in CI if needed.

---

## 🔋 Memory Management & Agent Guidance

This repository experienced a transient spike in memory usage during
`pnpm install` and concurrent Nx tasks. A focused, reversible mitigation
set is in place. Agents (LLMs, automation scripts) and developers must
respect these constraints until the baseline is declared stable.

### Implemented Mitigations (Active)

| Layer | Change | File | Purpose | Revisit When |
|-------|--------|------|---------|--------------|
| pnpm  | `childConcurrency: 2` | `pnpm-workspace.yaml` | Limit simultaneous lifecycle scripts | After two stable low-RSS installs |
| pnpm  | `useNodeVersion: 24.7.0`, `engineStrict: true` | `pnpm-workspace.yaml` | Avoid duplicate toolchains / watchers | If multi-version testing required |
| Nx    | `parallel: 1`, `maxParallel: 1` | `nx.json` | Serialize heavy tasks to lower peak | When memory plateau acceptable |
| Graph | Added `.nxignore` patterns | `.nxignore` | Reduce hashing + watcher churn | If excluded dirs become needed |
| Tool  | Memory sampler script | `scripts/sample-memory.mjs` | Consistent RSS / heap telemetry | Likely keep (low overhead) |

Full detail & rollback: **[Memory Tuning Guide](./docs/memory-tuning.md)**.

### Required Behaviors (Agents & Devs)

1. Do **not** raise Nx parallelism or remove `childConcurrency` without two
  comparative sampler runs (before vs after).
2. Always sample during bulk ops: `node scripts/sample-memory.mjs --tag <label> \
  --out .memory/<label>.jsonl -- pnpm <command>`.
3. Prefer incremental refactors—avoid unnecessary workspace-wide rebuilds.
4. Large dependency PRs: include sampler diff (pre/post install) + rationale.
5. Agents must use `@cortex-os/agent-toolkit` `multiSearch` instead of raw
  recursive greps to minimize IO storms.

### Quick Sampling Examples

Install (cold):

```bash
rm -rf node_modules .pnpm-store
node scripts/sample-memory.mjs --tag install-cold --interval 1500 --out .memory/install-cold.jsonl -- pnpm install
```

Focused build:

```bash
node scripts/sample-memory.mjs --tag build --interval 2000 --out .memory/build.jsonl -- pnpm nx run cortex-os:build
```

Tail peak candidate:

```bash
awk '{print $0}' .memory/build.jsonl | jq '.rssMB' | sort -n | tail -1
```

### Escalation Criteria

Open an issue titled `perf(memory): escalation` if ANY:

- Peak RSS > 2.5x baseline after a small dependency addition
- Sustained upward drift across three comparable runs
- Install > 15 min wall time with unchanged dependency graph

### Rollback (Condensed)

See full guide, but nominally:

```bash
sed -i.bak 's/"parallel": 1/"parallel": 2/' nx.json
sed -i.bak 's/"maxParallel": 1/"maxParallel": 2/' nx.json
# Edit pnpm-workspace.yaml to remove childConcurrency/useNodeVersion/engineStrict if justified
```

### Future (Optional)

- Add automated peak parser to CI summary
- Enforce memory budget via sentinel script (fail if > threshold)
- Integrate flamegraphs for largest builds

---

### 🛡️ Code Quality & Security Automation

This repository enforces a layered quality model combining fast local feedback, pre-push hard gates, and CI/PR decoration:

| Layer             | Scope             | Tools                                                                                                     | Failing Effect                    |
| ----------------- | ----------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Pre-commit (fast) | Staged files only | Biome/ESLint formatting, minimal lint, pattern guard, `.env` presence check                               | Blocks commit (fix immediately)   |
| Pre-push (full)   | Entire workspace  | Typecheck (TS/py), Ruff, Semgrep focused profiles, tests + coverage, structural governance                | Blocks push (stops degraded code) |
| CI Workflows      | Trusted baseline  | Semgrep SARIF (OWASP + LLM + Top 10), optional SonarCloud, structure validation, license + security scans | Blocks merge via required checks  |

### 🧪 TDD Enforcement

This repository enforces Test-Driven Development practices using the TDD Coach package:

| Layer          | Scope         | Tools                  | Failing Effect                     |
| -------------- | ------------- | ---------------------- | ---------------------------------- |
| Development    | Real-time     | TDD Coach Watch Mode   | Immediate feedback in IDE          |
| Pre-commit     | Staged files  | TDD Coach Validation   | Blocks non-TDD compliant commits   |
| CI/CD Pipeline | Pull requests | TDD Coach Status Check | Blocks merge of non-compliant code |

To enforce TDD practices:

```bash
# Set up TDD Coach
make tdd-setup

# Check current TDD status
make tdd-status

# Validate specific files
make tdd-validate FILES="src/file1.ts src/file2.ts"

# Run in watch mode during development
make tdd-watch
```

See [TDD Enforcement Guide](./docs/tdd-enforcement-guide.md) for detailed instructions.

#### Semgrep Usage

Baseline (captures current state – do NOT run casually unless intentionally resetting):

```bash
pnpm security:scan:baseline   # writes reports/semgrep-baseline.json
```

Diff against baseline (local developer check before large refactors / PR polish):

```bash
pnpm security:scan:diff       # generates current + compares; exits non-zero on NEW findings
```

CI pipeline runs (excerpt):

```bash
pnpm security:scan:ci         # produces JSON report consumed for SARIF conversion
```

Reports directory structure (examples):

```text
reports/
  semgrep-baseline.json   # canonical baseline – versioned in repo if approved
  semgrep-current.json    # transient diff artefact
  semgrep-results.json    # CI raw scan output
```

#### SonarCloud (Optional)

`sonar-project.properties` config exists at repo root. CI workflow (`sonar.yml`) performs:

1. Install + cache dependencies
2. Run tests & collect coverage
3. Invoke Sonar scanner for PR decoration + quality gate

To disable: delete the workflow or restrict with a branch condition.

#### Common Commands

```bash
pnpm lint:all             # Full lint suite across workspace
pnpm security:scan        # Focused Semgrep (primary OWASP profile)
pnpm security:scan:all    # Expanded profiles (OWASP + LLM + MITRE ATLAS)
pnpm security:scan:diff   # New issues vs baseline only
pnpm test:coverage        # Enforces 90%+ threshold
pnpm structure:validate   # Governance / import boundary integrity
```

#### Developer Workflow Tips

- Keep baseline churn intentional – treat resets as mini change-control events.
- Prefer suppressions (`// semgrep-disable-next-line <rule-id>`) with justification comments.
- Run `pnpm security:scan:diff` before pushing if you touched risky surfaces (auth, network, dynamic exec, file IO).
- Use `nx graph` to visualize dependency impact of refactors prior to wide code moves.
- Use the canonical variable catalog in `.env.example`; keep the tracked `.env` scrubbed
  (no real secrets) and load real values via untracked overlays or a secret manager.

Further detail: see [`SECURITY.md`](./SECURITY.md) and future `docs/code-quality.md` (placeholder to expand if needed).

---

## 🚀 CI/CD Workflows Architecture

Cortex-OS uses a **modern, reusable GitHub Actions architecture** designed for
efficiency, maintainability, and scalability. All workflows have been optimized
for fast execution with improved caching and standardized patterns.

### Core Reusable Workflows

- **`quality-gates.yml`** - Fast PR quality checks (lint, typecheck, tests, build)
- **`security-modern.yml`** - Comprehensive security scanning (CodeQL, Semgrep, secrets)
- **`supply-chain-security.yml`** - Dependency analysis, SBOM generation, vulnerability assessment
- **`reusable-full-stack-setup.yml`** - Standardized Node.js/Python/Rust environment setup

### Key Workflow Categories

#### Pull Request Workflows

- **`pr-light.yml`** - Minimal quality gates for fast feedback
- **`ci.yml`** - Full integration checks via quality-gates
- **`readiness.yml`** - Package-level coverage enforcement (≥95%)

#### Security & Compliance  

- **`unified-security.yml`** - Redirects to security-modern.yml (migration pattern)
- **`codeql.yml`** - GitHub CodeQL analysis
- **`deep-security.yml`** - Weekly comprehensive scans

#### Specialized Workflows

- **`advanced-ci.yml`** - Full CI/CD pipeline with performance testing
- **`scheduled-lint.yml`** - Automated governance and quality checks
- **`nightly-quality.yml`** - Coverage tracking and quality metrics

### Migration Benefits

The recent workflow modernization provides:

- ✅ **60% faster setup** through shared reusable workflows
- ✅ **Improved cache hit rates** via standardized caching strategies  
- ✅ **Reduced duplication** from 200+ lines to 20 lines per workflow
- ✅ **Consistent permissions** and concurrency controls
- ✅ **Better maintainability** with centralized patterns

### Deprecated Workflows

Legacy workflows have been moved to `.deprecated-workflows/` with full deprecation tracking:

- `security-scan.yml`, `security.yml` → replaced by `security-modern.yml`
- `compliance.yml`, `license-check.yml`, `gitleaks.yml` → integrated into main workflows
- `security-and-sbom.yml`, `security-enhanced-sast.yml` → consolidated patterns

See `.deprecated-workflows/DEPRECATION_RECORD.md` for full migration details.

### Workflow Usage

Standard commands leverage the new architecture:

```bash
# Trigger quality gates manually
gh workflow run quality-gates.yml

# Run security scan
gh workflow run security-modern.yml

# Check workflow status  
gh run list --workflow=quality-gates.yml
```

For detailed workflow documentation, see [`.github/workflows/WORKFLOWS-OVERVIEW.md`](./.github/workflows/WORKFLOWS-OVERVIEW.md).

---

## Automated Linting & Scheduled Quality Runs

In addition to on-demand commands and the existing **nightly quality** workflow, the repository includes a **scheduled lint** workflow: `scheduled-lint.yml`.

### Schedule

Runs three times daily at 10:00, 14:00, and 20:00 UTC (GMT). You can also trigger it manually via the Actions tab.

### Workflow Steps

| Phase             | Command                      | Purpose                                               |
| ----------------- | ---------------------------- | ----------------------------------------------------- |
| Biome (changed)   | `pnpm biome:ci`              | Fast style + formatting validation                    |
| ESLint (quality)  | `pnpm lint:quality`          | Core quality & import rules                           |
| ESLint (security) | `pnpm lint:security`         | Security-focused rules (sonarjs, boundaries)          |
| Ruff (Python)     | `pnpm python:lint`           | Python style & lint consistency                       |
| Structure         | `pnpm structure:validate`    | Enforces architecture governance                      |
| Pattern Guard     | `pnpm lint:ripgrep:hardened` | Detects secrets, debug statements, forbidden patterns |
| AST Policy        | `pnpm lint:ast-grep:check`   | Enforces structural AST policies                      |

All steps soft-fail (`|| true`) to ensure an aggregated summary; review logs for violations.
Promote to hard failure by removing `|| true` once baseline is clean.

### Local Parity

```bash
pnpm lint:all            # Aggregated lint suite
pnpm structure:validate  # Governance integrity
# Manual pre-commit equivalent (Husky hooks run automatically on commit)
pnpm biome:staged  # format + lint staged files
pnpm test:safe     # quick, low-risk tests
```

### Future Enhancements (Optional)

1. Open an issue automatically if violations increase week-over-week.
2. Upload SARIF for AST-Grep + pattern guard to unify security dashboards.
3. Persist weekly lint trend JSON similar to coverage trend.

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

Apache-2.0 – see [LICENSE](./LICENSE)

---

## Support

- **📧 Email**: <support@cortex-os.dev>
- **💬 Discussions**: [GitHub Discussions](https://github.com/jamiescottcraik/Cortex-OS/discussions)
- **🐛 Issues**: [GitHub Issues](https://github.com/jamiescottcraik/Cortex-OS/issues)
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

![GitHub Stars](https://img.shields.io/github/stars/jamiescottcraik/Cortex-OS?style=social) ![GitHub Forks](https://img.shields.io/github/forks/jamiescottcraik/Cortex-OS?style=social) ![GitHub Issues](https://img.shields.io/github/issues/jamiescottcraik/Cortex-OS) ![GitHub PRs](https://img.shields.io/github/issues-pr/jamiescottcraik/Cortex-OS)

<!-- markdownlint-enable MD013 -->

## Submodules

The repository no longer vendors external code via Git submodules. The
`external/openai-codex` pointer has been removed and replaced with an explicit vendor
workflow driven by `scripts/sync-cortex-code.sh`.

Inspect upstream changes without modifying the working tree:

```bash
./scripts/sync-cortex-code.sh
```

Apply a vendor update from `openai/codex`:

```bash
./scripts/sync-cortex-code.sh --run
```

For detailed guidance, see [`apps/cortex-code/UPSTREAM_SYNC.md`](apps/cortex-code/UPSTREAM_SYNC.md).

## MCP developer helpers

This repository includes a couple of small helper scripts to make Model Context Protocol (MCP)
local development more reproducible across machines.

- `tools/mcp/wrap_local_memory.sh` — a repo-local wrapper that locates an installed `local-memory`
  binary (or respects `LOCAL_MEMORY_BIN`), then execs it with the forwarded arguments. The VS Code
  MCP configuration is set to call this wrapper so maintainers don't need to hardcode user-specific
  absolute paths.

- `tools/mcp/check_mcp_paths.sh` — a small diagnostic script that verifies the presence of an
  executable `local-memory` and the in-repo MCP Python server script `packages/cortex-mcp/cortex_fastmcp_server_v2.py`.

Quick checks:

```bash
# Run the environment diagnostic (exit 0 on success)
./tools/mcp/check_mcp_paths.sh

# If your local-memory binary is installed in a non-standard location, set the override:
LOCAL_MEMORY_BIN=/custom/path/local-memory ./tools/mcp/check_mcp_paths.sh

# The wrapper is used automatically by VS Code via .vscode/mcp.json. You can also run it directly:
./tools/mcp/wrap_local_memory.sh --mcp
```

If you run into issues, the diagnostic script prints actionable hints. For CI or non-interactive
environments set `LOCAL_MEMORY_BIN` to the absolute binary path.

## Port Configuration

Cortex-OS uses several ports for different services. See `ports.env` for the complete list:

### MCP Ports

- **Pieces OS**: `39300` - Pieces MCP server (required for Pieces CLI integration)
- **Cortex MCP**: `3024` - Main Cortex-OS MCP server
- **Memory MCP**: `3026` - Local memory MCP server with Cloudflare tunnel access
  - Cloudflare tunnel: <https://cortex-mcp.brainwav.io>
  - External integrations connect via the tunnel URL
- **Memory API**: `3028` - Local memory REST API

### Core Services

- **Cortex Runtime**: `3000` - Main runtime server
- **WebUI Backend**: `3001` - Web application backend
- **WebUI Frontend**: `5173` - Development server

### Quick Port Check

```bash
# Verify all required ports are available
./scripts/system/check-port-conflicts.sh

# Check if Pieces OS is running on its port
lsof -i :39300

# Check if MCP server is running and accessible via tunnel
curl -I http://localhost:3024/health
curl -I https://cortex-mcp.brainwav.io/health
```

### External MCP Integration

For external integrations (ChatGPT, Claude Desktop, VS Code, Cursor):

- **Local Development**: Connect to `http://localhost:3024`
- **External Access**: Connect via Cloudflare tunnel: `https://cortex-mcp.brainwav.io`
- **Authentication**: Configure with MCP tokens or API keys as needed

### Pieces CLI Setup

The Pieces CLI provides access to Pieces OS Long-Term Memory (LTM):

```bash
# Install Pieces CLI
bash ./scripts/install-pieces-cli.sh

# Enable Pieces MCP integration
export PIECES_MCP_ENABLED=true

# Run Pieces CLI
pieces run --ignore-onboarding
```

See `docs/pieces-cli-installation.md` for complete setup instructions.
