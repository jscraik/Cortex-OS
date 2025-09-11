<!-- markdownlint-disable MD013 MD022 MD031 MD032 MD040 MD009 -->
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cortex-OS is a production-ready **Autonomous Software Behavior Reasoning (ASBR) Runtime** that enables AI agents to collaborate through event-driven architecture and Model Context Protocol (MCP) integrations. This is a governed monorepo with strict architectural boundaries and comprehensive quality gates.

## Architecture

### High-Level Structure
- **Runtime orchestrator**: `apps/cortex-os/` mounts feature packages via dependency injection
- **Feature packages**: Live under `apps/cortex-os/packages/` (no cross-imports between siblings) 
- **Shared services**: Located in `packages/` (e.g., `a2a`, `mcp`, `memories`, `orchestration`, `rag`, `simlab`)
- **Contracts & schemas**: `libs/typescript/contracts` for type-safe communication
- **Utilities**: `libs/typescript/utils` for shared functionality

### Communication Patterns
- **Cross-feature messaging**: Use A2A events (`packages/a2a`) with CloudEvents envelopes
- **External systems/tooling**: Extend MCP capabilities in `packages/mcp`
- **Persistent memory**: Use service interfaces from `packages/memories`
- **Multi-step agent flows**: Emit domain events, let `packages/orchestration` coordinate

### Language Support
- **TypeScript/JavaScript**: Primary development language with strict typing
- **Rust**: Performance-critical components in `apps/cortex-codex/` (Cargo workspace)
- **Python**: ML/AI workflows in `apps/cortex-py/` with uv dependency management

## Development Commands

### Environment Setup
```bash
# Automated setup (recommended)
./scripts/dev-setup.sh

# Minimal setup (lightweight)
./scripts/dev-setup.sh --minimal

# Verify environment readiness
pnpm readiness:check
```

### Core Development
```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Build all packages
pnpm build
mise run build  # Alternative via mise

# Run tests
pnpm test
pnpm test:coverage  # With 90% coverage threshold
pnpm test:safe      # Memory-safe test runner
```

### Quality & Security
```bash
# Linting and formatting
pnpm lint           # ESLint + security rules
pnpm lint:all       # Full lint suite
pnpm format         # Biome formatter
pnpm biome:staged   # Format staged files only

# Security scanning
pnpm security:scan       # Focused OWASP Semgrep scan
pnpm security:scan:all   # Comprehensive profiles
pnpm security:scan:diff  # New issues vs baseline only
pnpm security:audit     # Dependency vulnerability scan

# Structure validation
pnpm structure:validate  # Governance/import boundary checks
pnpm nx graph           # Visualize dependency graph
```

### Rust Development (Cortex-Codex)
```bash
# Run Rust tests
pnpm codex:test
pnpm codex:test:unit        # Unit tests only
pnpm codex:test:integration # Integration tests only
pnpm codex:coverage:xtask   # Generate coverage report

# TUI development
pnpm tui:dev         # Watch mode with plain theme
pnpm tui:dev:rich    # Watch mode with rich theme
```

### Python Development
```bash
# Dependency management (uv)
pnpm python:sync      # Install/sync dependencies
pnpm python:add       # Add new dependency
pnpm python:format    # Ruff formatting
pnpm python:lint      # Ruff linting
```

### Testing Strategies
```bash
# Specialized test suites
pnpm test:integration          # Integration tests
pnpm test:integration:security # Security validation
pnpm test:integration:e2e      # End-to-end scenarios
pnpm test:security:all         # All security tests

# NX-based parallel testing
pnpm nx:test:core     # Core packages
pnpm nx:test:a2a      # A2A communication tests
pnpm nx:test:services # Service layer tests
```

### Documentation & Compliance
```bash
# Documentation
pnpm docs:lint        # Markdown linting
pnpm docs:build       # MkDocs build
pnpm docs:serve       # Local documentation server

# Compliance & licensing
pnpm license:validate # License compliance check
pnpm sbom:generate    # Generate SBOM
pnpm compliance:all   # Full compliance suite
```

## Architecture Rules & Patterns

### Boundary Enforcement
1. **No cross-imports** between sibling feature packages under `apps/cortex-os/packages/`
2. **Contract-first development**: Define/update Zod schemas in `libs/typescript/contracts` before implementation
3. **Event-driven communication**: Use A2A events for cross-feature messaging
4. **MCP integration**: Add external tool capabilities via `packages/mcp` rather than direct API calls

### Package Structure (Recommended)
```
apps/cortex-os/packages/<feature>/
  src/
    domain/        # Pure business logic (no IO dependencies)
    app/           # Use cases orchestrating domain + infrastructure  
    infra/         # Adapters (bus bindings, persistence, MCP tools)
    index.ts       # Public exports only
  __tests__/       # Co-located tests mirroring src structure
  README.md        # Purpose and contract documentation
```

### Quality Gates
- **Coverage**: 90% minimum threshold enforced
- **Security**: Semgrep OWASP compliance required
- **Structure**: Import boundaries validated via custom rules
- **Tests**: TDD approach with failing tests before implementation

### Anti-Patterns (Will Cause Build Failures)
- Direct sibling feature imports (`apps/cortex-os/packages/*/otherFeature/*`)
- Bypassing event bus for cross-feature communication
- Runtime side effects at import time
- Unvalidated external API responses (always use Zod parsing)
- Adding secrets to tracked `.env` files

## Streaming Modes

The system supports multiple output streaming modes with strict precedence:

| Mode | CLI Flag | Effect | Use Case |
|------|----------|---------|----------|
| Token streaming | (default) | Emit token deltas to stdout | Interactive CLI |
| Aggregated | `--aggregate` | Suppress deltas, final output only | Scripting/logs |
| Force streaming | `--no-aggregate` | Override aggregate config | Force live progress |
| JSON events | `--json`/`--stream-json` | Structured event stream | Programmatic APIs |

**Precedence**: CLI flag > `CORTEX_STREAM_MODE` env > config file > default

## Git Workflow & Commit Standards

### Commit Format
- Use **Conventional Commits**: `feat(scope): description`
- Keep commits **atomic** and **focused**
- Include tests and implementation in same commit
- Run quality gates before committing:
  ```bash
  pnpm lint && pnpm test
  pnpm security:scan:diff  # For risky changes
  ```

### Pre-commit Hooks
The repository uses layered quality enforcement:
- **Pre-commit (fast)**: Staged file formatting, minimal linting
- **Pre-push (comprehensive)**: Full typecheck, testing, security scans
- **CI/CD**: SARIF upload, governance validation, structure checks

## Cross-Language Integration

### TypeScript ↔ Rust
- Rust components expose functionality via **CLI interfaces** or **generated artifacts**
- **No direct imports** of Rust internals into TypeScript
- Data exchange via **JSON schemas** (validated with Zod)

### TypeScript ↔ Python  
- Python workflows invoked via **MCP tools** or **CLI bridges**
- Avoid ad-hoc `child_process` calls without contracts
- Use **structured data exchange** in `data/` directory

## Memory Management & Performance

### Resource Discipline
- Long-running operations must be **async** and **cancellable**
- Use **streaming** for model outputs (respect streaming mode precedence)
- Avoid **unbounded in-memory accumulation**
- Enable garbage collection in test environments

### Memory-Safe Testing
```bash
pnpm test:safe          # Memory-monitored test execution
pnpm memory:clean       # Aggressive cleanup
pnpm memory:monitor     # Active memory monitoring
```

## Troubleshooting

### Common Issues
- **Memory exhaustion**: Use `pnpm memory:clean:gentle` or `pnpm test:safe`
- **Import boundary violations**: Run `pnpm structure:validate` 
- **Security scan failures**: Check `pnpm security:scan:diff` for new issues
- **Coverage drops**: Ensure new code includes comprehensive tests

### Environment Validation
```bash
pnpm readiness:check    # Verify all tools and dependencies
pnpm codex:doctor      # Rust-specific environment check
```

## Local Memory (Persistent Agent Context)

Use Local Memory to persist agent context across runs. It is auto-selected when `LOCAL_MEMORY_BASE_URL` is set, or explicitly via `MEMORIES_ADAPTER=local` (alias: `MEMORY_STORE=local`).

Environment variables:
- `LOCAL_MEMORY_BASE_URL` (default: `http://localhost:3002/api/v1`)
- `LOCAL_MEMORY_API_KEY` (optional)
- `LOCAL_MEMORY_NAMESPACE` (optional namespace tag)
- `MEMORIES_ADAPTER` or `MEMORY_STORE` = `local | sqlite | prisma | memory`

Quick health check (server):
```bash
curl -sS http://localhost:3002/api/v1/health | jq .
```

Quick code usage (Node):
```ts
import { createStoreFromEnv } from '@cortex-os/memories';

process.env.LOCAL_MEMORY_BASE_URL = process.env.LOCAL_MEMORY_BASE_URL || 'http://localhost:3002/api/v1';
process.env.MEMORIES_ADAPTER = 'local'; // optional, auto-detected if BASE_URL is set

const store = await createStoreFromEnv();
await store.upsert({
  id: 'demo-1',
  kind: 'note',
  text: 'Hello Local Memory',
  tags: ['demo'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  provenance: { source: 'system' },
});
const got = await store.get('demo-1');
console.log(got?.text);
```

Notes:
- Selecting stores programmatically is available via `createStoreFromEnv` exported by `@cortex-os/memories`.
- Fallback behavior: with no envs, an in-memory store is used (non-persistent, test/dev).

### Getting Help
- Check existing **documentation** in `docs/` directory
- Review **architecture guide**: `docs/architecture.md`
- Consult **package READMEs** for specific functionality
- Run `pnpm nx graph` to understand dependency relationships

## Authority Hierarchy

When conflicts arise, follow this precedence order:
1. `.cortex/rules/RULES_OF_AI.md` - AI behavior governance
2. `AGENTS.md` - Developer workflow rules  
3. This `CLAUDE.md` file
4. `.github/copilot-instructions.md` - AI contributor guidelines
5. Individual package documentation

Always escalate ambiguities via PR description comments rather than making assumptions.
