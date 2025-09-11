# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Cortex-OS is an **Autonomous Software Behavior Reasoning (ASBR) Runtime** - a governed monorepo implementing AI agent capabilities with strict architectural boundaries and comprehensive testing. The system follows event-driven architecture with A2A (Agent-to-Agent) communication patterns and MCP (Model Context Protocol) integrations.

### Governance Structure

The project uses `.cortex/` as the **governance hub** and single source of truth for all policies, rules, and validation:

- **`.cortex/rules/`**: Human-readable governance policies (RULES_OF_AI.md, AGENTS.md, etc.)
- **`.cortex/schemas/`**: JSON schemas for validation (policy, workflow, task, memory schemas)
- **`.cortex/gates/`**: Enforcement scripts and validation tools
- **`.cortex/docs/`**: Authoritative architectural documentation
- **`.cortex/library/`**: Reusable packs, blueprints, and patterns

## Architecture

### ASBR Runtime Structure

- **Location**: `apps/cortex-os/`
- **Role**: Main application runtime that orchestrates feature packages
- **Entry**: `apps/cortex-os/src/index.ts` → `runtime.ts`

### Feature Packages (Domain Logic)

- **Location**: `packages/`
- **Key Packages**:
  - `a2a/` - Agent-to-Agent JSON-RPC 2.0 communication
  - `mcp/` - Model Context Protocol integration and plugin system
  - `orchestration/` - Multi-agent workflow coordination
  - `memories/` - Long-term state management with Neo4j/Qdrant
  - `rag/` - Retrieval-Augmented Generation with embeddings
  - `agents/` - Agent implementations and enhanced behaviors
  - `asbr/` - Core ASBR reasoning logic
  - `simlab/` - Simulation environment for testing

### Communication Patterns

1. **A2A Event Bus** - Async pub/sub messaging via JSON-RPC 2.0
2. **Service Interfaces** - DI-based contracts via ASBR coordination
3. **MCP Tools** - External integrations and side effects

**Critical**: Direct imports between feature packages are **forbidden** by both ESLint rules and Nx dependency constraints. Use A2A events or service interfaces.

## Development Commands

### Core Development

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Build all packages
pnpm build
turbo run build

# Build specific package (Nx)
nx run cortex-os:build
nx run a2a:build
nx run mcp:build

# Build with quality gates
pnpm build:with-gates
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Coverage with thresholds (90% required)
pnpm test:coverage:threshold

# Integration tests
pnpm test:integration

# Security tests
pnpm test:security
pnpm test:security:all

# Launch readiness tests
pnpm test:launch

# MCP-specific tests
pnpm test:gitmcp

# Accessibility tests
pnpm test:accessibility
pnpm test:a11y
```

### Testing Individual Packages

```bash
# Test specific package (Turbo)
turbo run test --filter=@cortex-os/a2a
turbo run test --filter=@cortex-os/mcp

# Test specific package (Nx)
nx run a2a:test
nx run mcp:test
nx run cortex-os:test

# Single test file
vitest run packages/a2a/tests/specific-test.test.ts
```

### Code Quality

```bash
# Lint and fix
pnpm lint

# Format code
pnpm format

# Security scanning (Semgrep-based)
pnpm security:scan              # OWASP precise rules (ERROR severity only)
pnpm security:scan:all          # OWASP precise + improved rules
pnpm security:scan:llm          # OWASP LLM Top-10 rules
pnpm security:scan:atlas        # MITRE ATLAS framework rules
pnpm security:scan:comprehensive # All security rulesets combined
pnpm security:scan:ci           # CI-optimized with JSON output

# Structure validation (via .cortex governance)
pnpm structure:validate
```

### MCP (Model Context Protocol)

```bash
# Start MCP server
pnpm mcp:start

# MCP development
pnpm mcp:dev

# MCP smoke tests
pnpm mcp:smoke

# Test MCP functionality
pnpm mcp:test
```

### Simulation Lab

```bash
# Run smoke tests
pnpm simlab:smoke

# Critical system tests
pnpm simlab:critical

# Full test suite
pnpm simlab:full

# Generate reports
pnpm simlab:report
```

## Package Manager & Build System

- **Package Manager**: `pnpm@9.0.0` (required)
- **Monorepo Tools**: Nx + Turbo (hybrid approach)
- **Nx Workspace**: Configured in `nx.json` with project-specific `project.json` files
- **Turbo Pipeline**: Configured in `turbo.json` for task orchestration
- **pnpm Workspace**: Defined in `pnpm-workspace.yaml`
- **Node Version**: `>=20.0.0`

### Workspace Structure

```
packages:
  - 'apps/*'           # Applications
  - 'packages/*'       # Shared libraries
  - 'packages/a2a/a2a-*'     # A2A sub-packages
  - 'packages/mcp/mcp-*'     # MCP sub-packages
  - 'libs/*'           # Framework libraries
  - 'libs/typescript/*' # TypeScript utilities
```

## Nx Workspace Configuration

### Project Structure & Tags

Each project has a `project.json` file defining its build targets, dependencies, and tags:

- **Applications** (`apps/`): Tagged with `scope:app`, `type:app`
- **Feature Libraries** (`packages/`): Tagged with specific scopes (`scope:a2a`, `scope:mcp`, etc.)
- **Shared Libraries** (`libs/`): Tagged with `type:shared`

### Nx Dependency Constraints

Nx enforces architectural boundaries via dependency constraints in `nx.json`:

```typescript
// Examples of enforced constraints:
// ASBR packages can only depend on A2A, MCP, and shared libraries
// MVP packages can only depend on MVP-core, A2A, MCP, and shared libraries
// Applications can depend on all feature packages and shared libraries
```

### Nx Commands

```bash
# Run tasks for specific projects
nx run <project>:<target>
nx run cortex-os:build
nx run a2a:test
nx run mcp:lint

# Run tasks for all projects
nx run-many --target=build
nx run-many --target=test --parallel=3

# Nx dependency graph
nx graph

# Nx affected commands (only run tasks for changed projects)
nx affected --target=test
nx affected --target=build

# Cache management
nx reset  # Clear Nx cache
```

## Import Path Aliases

TypeScript path mapping is configured for clean imports:

```typescript
// A2A packages
import { EventBus } from '@cortex-os/a2a-core/bus';
import { Transport } from '@cortex-os/a2a-transport/fsq';

// MCP packages
import { McpClient } from '@cortex-os/mcp-core/client';
import { PluginRegistry } from '@cortex-os/mcp-registry/fs-store';

// Feature packages
import { AgentOrchestrator } from '@cortex-os/orchestration/service';
import { MemoryService } from '@cortex-os/memories/service';
import { RAGPipeline } from '@cortex-os/rag/pipeline';
```

## Testing Architecture

### Test Organization

- **Root Config**: `vitest.config.ts` (orchestrates all projects)
- **Workspace Config**: `vitest.workspace.ts`
- **Package Configs**: Each package has its own `vitest.config.ts`
- **Coverage**: 90% threshold enforced globally

### Test Types

- **Unit**: Package-specific tests in `tests/` directories
- **Integration**: `tests/integration/` - multi-package interactions
- **E2E**: End-to-end scenarios via `test:integration:e2e`
- **Security**: `tests/security/` - OWASP compliance testing
- **Accessibility**: WCAG 2.2 AA compliance testing

### Quality Gates

- **Coverage**: 90% statements/branches/functions/lines required
- **Security**: Semgrep scanning with custom OWASP, LLM, and MITRE ATLAS rulesets
- **Type Safety**: TypeScript strict mode (relaxed in base config)
- **Import Boundaries**: ESLint enforced architectural rules

## Security Considerations

### Semgrep Security Scanning

The project uses Semgrep with multiple custom rulesets in `.semgrep/`:

- **`owasp-precise.yaml`**: Focused OWASP Top-10 2021 rules (ERROR severity)
  - SQL/Command/Code injection detection
  - Server-Side Request Forgery (SSRF) prevention
  - Direct execution vulnerabilities
- **`owasp-top-10-improved.yaml`**: Comprehensive OWASP Top-10 coverage
  - Broken Access Control (A01)
  - Cryptographic Failures (A02) - weak hashing, ECB mode
  - All injection types (A03)
  - Insecure Design patterns (A04)
  - Security Misconfigurations (A05) - debug mode, dev environment
  - Authentication Failures (A07) - credential storage issues
  - Data Integrity Failures (A08) - eval(), Function() usage
  - Logging/Monitoring issues (A09) - secret leakage in logs
  - SSRF vulnerabilities (A10)

- **`owasp-llm-top-ten.yaml`**: LLM-specific security rules
  - Hardcoded secrets detection
  - Prompt injection prevention
  - Unsafe code execution patterns

- **`mitre-atlas.yaml`**: MITRE ATLAS framework for ML security
  - Extends the public MITRE ATLAS ruleset

### OWASP Compliance

- LLM Top-10 validation in `packages/asbr/src/security/`
- Prompt injection guards in A2A communication
- Input sanitization and output validation
- Security regression testing

### Capabilities & Boundaries

- MCP tools run in sandboxed environments
- Network egress controls for testing (`MCP_NETWORK_EGRESS=disabled`)
- Workload identity and mTLS in production deployments
- Secret management via `packages/a2a/src/security/secure-secret-manager.ts`

## Governance & Validation Framework

### .cortex Structure

The `.cortex/` directory serves as the governance hub with these key components:

#### Rules & Policies

- **`RULES_OF_AI.md`**: Fundamental AI ethics and behavior principles
- **`AGENTS.md`**: Agent workflow specifications and role definitions
- **Policy schemas**: Machine-readable governance (agents, tools, repository policies)

#### Validation Gates

- **`validate-structure.ts`**: Project structure compliance
- **`validate-policies.ts`**: Policy adherence checking
- **`validate-docs.ts`**: Documentation consistency
- **`validate-context.ts`**: Context and schema validation

#### Library & Patterns

- **`library/packs/`**: Reusable patterns (auth, database, frontend, security, testing)
- **`library/blueprints/`**: Architectural templates
- **`library/personas/`**: Agent behavior definitions

### Validation Flow

```text
Code Changes → .cortex gates → CI validation → Runtime enforcement
```

## Key Architecture Principles

1. **Event-Driven**: All inter-package communication via A2A events
2. **Loose Coupling**: No direct cross-package imports enforced by linting and Nx constraints
3. **Contract-Based**: Well-defined interfaces with Zod validation
4. **Governance-First**: All behavior governed by `.cortex/` policies and rules
5. **Security-First**: OWASP compliance and capability boundaries
6. **Test-Driven**: Comprehensive coverage with quality gates
7. **Accessibility**: WCAG 2.2 AA compliance throughout

## Development Workflow

1. **Feature Development**: Work in feature packages (`packages/`)
2. **Governance Compliance**: Follow `.cortex/` policies and validation gates
3. **Communication**: Use A2A events for inter-package coordination
4. **Testing**: Write tests first, maintain 90% coverage
5. **Quality**: Run `pnpm lint` and `pnpm format` before commits
6. **Structure Validation**: Ensure compliance with `pnpm structure:validate`
7. **Integration**: Test with `pnpm test:integration`
8. **Security**: Validate with `pnpm test:security`

## Debugging & Troubleshooting

### Common Issues

- **Import Errors**: Check ESLint restricted paths rules in `eslint.config.js` and Nx dependency constraints in `nx.json`
- **Governance Violations**: Review `.cortex/gates/` validation output and policy compliance
- **Structure Issues**: Run `pnpm structure:validate` and check `.cortex/docs/project-structure.md`
- **Test Failures**: Review coverage thresholds and missing test configs
- **Build Issues**: Verify Turbo cache with `turbo run build --force`
- **MCP Problems**: Check `pnpm mcp:smoke` and connection configs

### Logs & Monitoring

- Test results: `junit.xml` and `test-results.json`
- Coverage reports: Generated in `coverage/` directory
- Security reports: `security-reports/` and `atlas-reports/`
- Semgrep CI reports: `reports/semgrep-results.json`
- Carbon tracking: `carbon-metrics/` (if enabled)

This architecture enables scalable, maintainable AI agent systems while enforcing clear boundaries and comprehensive quality gates.

## Agent Toolkit

Leverage `agent-toolkit/tools` for code search, codemods, diff review and validation. Typical commands: `just scout`, `just codemod`, `tools/run_validators.sh`.
