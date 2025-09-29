<!-- markdownlint-disable MD013 MD022 MD031 MD032 MD040 MD009 -->
# CLAUDE.md

## 🏛️ GOVERNANCE: brAInwav Project Structure Standards

**CRITICAL**: This repository follows strict governance standards for file placement and architectural integrity. Only approved files belong at the repository root to maintain brAInwav development standards.

### Root-Level File Policy
- **Model Documentation**: Comprehensive, authoritative agent instruction files (AGENTS.md, CLAUDE.md, QWEN.md, GEMINI.md) at root
- **Foundation Standards**: Core project documents (CODESTYLE.md, README.md, CHANGELOG.md) belong at root level
- **Governance Validation**: Structure Guard enforces root entries against approved `allowedRootEntries` list
- **brAInwav Identity**: All root documentation must reflect brAInwav branding and company standards

**Claude Agent Responsibility**: When creating or relocating files, ensure compliance with governance standards. Specialized rules, configurations, and partial documents belong in appropriate subdirectories (`.cortex/rules/`, `config/`, package-specific locations).

---

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 CRITICAL: brAInwav Production Standards

**ABSOLUTE PROHIBITION**: NEVER claim any code is "production-ready", "complete", "operational", or "fully implemented" if it contains:
- `Math.random()` calls for data generation
- Hardcoded mock responses like "Mock adapter response"
- TODO comments in production code paths
- Placeholder implementations marked "will be wired later"
- Disabled features with `console.warn("not implemented")`
- Fake metrics or system data generation

**brAInwav Truthfulness Requirement**: All status claims must be verified against actual code. Include "brAInwav" in all system outputs, error messages, and observability contexts.

**Reference**: See `/Users/jamiecraik/.Cortex-OS/.cortex/rules/RULES_OF_AI.md` for complete standards.

## 🚨 CRITICAL: CODESTYLE.md ENFORCEMENT

**MANDATORY COMPLIANCE** with [CODESTYLE.md](../CODESTYLE.md) requirements:

### Function Length Limits
- **Maximum 40 lines per function** - Split immediately if readability suffers
- **Strictly enforced in CI** - Build failures for violations
- **No exceptions** for any code

### Export Requirements
- **Named exports only** - `export const functionName = ...`
- **Default exports forbidden** - `export default` will cause build failures
- **Required for tree-shaking and debugging**

### Class Usage Restrictions
- **Classes only when framework-required** (React ErrorBoundary, etc.)
- **Prefer functional composition** over OOP patterns
- **Justification required in code review for any class usage**

### Async/Await Requirements
- **Use async/await exclusively** - Never use `.then()` chains
- **Promise chains are forbidden** and caught by linters
- **Violations will block PR merges**

### Project References
- **All packages must set `composite: true`** in tsconfig.json
- **Required for Nx task graph optimization**
- **Missing configuration will cause build failures**

## 🔄 Agentic Coding Workflow

All Claude Code sessions working on brAInwav Cortex-OS must follow this structured 4-phase workflow:

### 0. Tasks

- **Operate on a task basis** - Each feature/bugfix/enhancement is a discrete task
- **Store intermediate context** in Markdown files in the `~/tasks` folder  
- **Store all context** in the local memory MCP and/or REST API for persistence
- **Use semantic task ID slugs** - descriptive identifiers like `rag-query-optimization` or `mcp-bridge-enhancement`

### 1. Research

- **Utilize semantic search** to identify existing patterns within this codebase
- **Use Web-Search** to access the internet for the most relevant and up-to-date information
- **Begin with follow-up questions** to establish the direction of the research
- **Report findings** in `[feature].research.md` within the tasks folder

**brAInwav Research Standards:**
- Include brAInwav-specific architectural patterns
- Document existing MCP and A2A integration points
- Reference Cortex-OS governance and quality gates
- Note any security or accessibility requirements

### 2. Planning

- **Read the research file** `[feature].research.md` from tasks folder
- **Develop a TDD plan** based on software engineering principles:
  - **Reuse existing patterns** - leverage Cortex-OS architectural patterns
  - **Separation of concerns** - follow domain/app/infra layering
  - **Single Responsibility Principle (SRP)** - ≤ 40 lines per function
  - **Don't Repeat Yourself (DRY)** - use shared utilities in `libs/`
  - **Keep it Simple, Stupid (KISS)** - avoid unnecessary complexity
  - **You Aren't Gonna Need It (YAGNI)** - implement only requirements
  - **Encapsulation** - proper TypeScript module boundaries
  - **Modularity** - event-driven communication via A2A
  - **Open/Closed Principle** - extend through contracts/interfaces
  - **Testability** - design for Vitest with 90%+ coverage
  - **Principle of Least Astonishment (POLA)** - follow existing patterns
  - **Fail Fast** - Zod validation at API boundaries
  - **High Cohesion, Low Coupling** - respect package boundaries
- **Ask clarifying questions** if needed for scope clarity
- **Write comprehensive plan** to `[feature]-tdd-plan.md` with implementation context

**brAInwav Planning Requirements:**
- Include brAInwav branding in all outputs and error messages
- Plan for MCP tool integration where applicable
- Consider A2A event emission for cross-feature communication
- Include accessibility (WCAG 2.2 AA) considerations
- Plan security scanning and validation steps

### 3. Implementation

- **Read the TDD plan** `[feature]-tdd-plan.md` and create a to-do list
- **Execute the plan** systematically with TDD approach (red-green-refactor)
- **Go for as long as possible** - group ambiguous questions for the end
- **Implementation must be 100% deployable** unless explicitly stated otherwise
- **Follow brAInwav coding standards** and CODESTYLE.md requirements
- **Use named exports only** - no default exports
- **Keep functions ≤ 40 lines** - split immediately if longer
- **Use async/await exclusively** - no `.then()` chains
- **Include brAInwav branding** in all system outputs

### 4. Verification

- **Verify requirements** are met and implementation is bug-free
- **Run quality gates**: `pnpm lint && pnpm test && pnpm security:scan`
- **Validate structure**: `pnpm structure:validate` for governance compliance
- **Check coverage**: Ensure 90%+ test coverage maintained
- **Test accessibility**: Include a11y validation where applicable
- **Return to implementation** if issues arise and make necessary adjustments
- **Update task status** to **"verified"** once complete
- **Store lessons learned** in local memory for future sessions
- **MANDATORY: Update change documentation**:
  - **CHANGELOG.md**: Add entry documenting what was completed, files changed, and impact
  - **README.md**: Update relevant sections if new features or significant changes were made
  - **Website documentation**: Update `/Users/jamiecraik/.Cortex-OS/website/README.md` for user-facing changes

### Task Context Storage

```typescript
// Store task context in local memory
await memory.store({
  content: 'Implemented auth validation with brAInwav error messaging',
  importance: 8,
  tags: ['task-complete', 'auth', 'validation', 'brainwav'],
  domain: 'feature-implementation',
  metadata: {
    taskId: 'auth-login-validation',
    phase: 'verified',
    coverageAchieved: '95%',
    securityValidated: true
  }
});
```

## Local Memory

Proactively use local-memory MCP to store, retrieve, update, and analyze memories to maintain context and build expertise over time.
Store key insights including lessons learned, architectural decisions, development strategies, and project outcomes. Use semantic search
and relationship mapping to find relevant memories across all projects and sessions. This enables persistent knowledge across development
sessions and enhances decision-making through historical context.

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

Use Local Memory to persist agent context across runs. Dual mode (MCP + REST API) is auto-selected when `LOCAL_MEMORY_BASE_URL` is set, or explicitly via `MEMORIES_ADAPTER=local` (alias: `MEMORY_STORE=local`).

Environment variables:
- `LOCAL_MEMORY_BASE_URL` (default: `http://localhost:3028/api/v1`)
- `LOCAL_MEMORY_API_KEY` (optional)
- `LOCAL_MEMORY_NAMESPACE` (optional namespace tag)
- `MEMORIES_ADAPTER` or `MEMORY_STORE` = `local | sqlite | prisma | memory`
- `LOCAL_MEMORY_MODE` = `dual` ensures REST API + MCP stay active together

Quick health check (server):
```bash
curl -sS http://localhost:3028/api/v1/health | jq .
```

Quick code usage (Node):
```ts
import { createStoreFromEnv } from '@cortex-os/memories';

process.env.LOCAL_MEMORY_BASE_URL = process.env.LOCAL_MEMORY_BASE_URL || 'http://localhost:3028/api/v1';
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

## Development Patterns to Avoid

### NEVER Continue These Anti-Patterns
1. **Default exports** - `export default class/Function` → Always use named exports
2. **Function length > 40 lines** → Immediately split into smaller functions
3. **`.then()` chains** → Use `async/await` exclusively
4. **Classes without framework requirement** → Use functional composition
5. **Missing `composite: true`** → All packages require this setting
6. **Direct sibling package imports** → Use events/contracts instead
7. **Bypassing local memory** → Store all development insights persistently

### Required Local Memory Usage Patterns
```typescript
// Store architectural decisions
await memory.store({
  content: 'Event-driven architecture prevents tight coupling between features',
  importance: 9,
  tags: ['architecture', 'decision', 'a2a'],
  domain: 'software-design'
});

// Store code quality lessons
await memory.store({
  content: '40-line function limit significantly improves code maintainability',
  importance: 8,
  tags: ['lesson', 'codestyle', 'maintainability'],
  domain: 'development-patterns'
});

// Store technical decisions
await memory.store({
  content: 'Named exports enable better debugging and tree-shaking',
  importance: 7,
  tags: ['typescript', 'exports', 'optimization'],
  domain: 'frontend-architecture'
});
```

### Mandatory Local Memory for Development Context
- **Store all architectural decisions** with clear reasoning
- **Document lessons learned** from code reviews and refactoring
- **Track development strategies** that prove effective
- **Maintain persistent context** across development sessions
- **Use semantic search** to find relevant past decisions

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

## Time Freshness Rules

See `.cortex/rules/_time-freshness.md` for timezone and date handling rules that all agents must follow.

## Agent Toolkit

Use `agent-toolkit` wrappers for code search, structural rewrites, diff review and validation. Commands include `just scout` and `just codemod`; validate with `tools/run_validators.sh` before committing.

## 🔧 Agent Toolkit Integration

The `packages/agent-toolkit` provides a unified interface for development tools essential for maintaining monorepo uniformity and code quality. This toolkit is **mandatory** for agents performing code analysis, modification, or validation tasks.

### When to Use Agent-Toolkit

**REQUIRED for:**
- Code search operations (pattern matching, AST queries)
- Structural code modifications (refactoring, codemods)
- Code quality validation (linting, type checking)
- Pre-commit validation workflows
- Cross-language development tasks

**Key Operations:**
```typescript
import { createAgentToolkit } from '@cortex-os/agent-toolkit';

const toolkit = createAgentToolkit();
// Multi-tool search for comprehensive coverage
await toolkit.multiSearch('pattern', './src');
// Structural code modifications
await toolkit.codemod('find(:[x])', 'replace(:[x])', './src');
// Project-wide validation
await toolkit.validateProject(['*.ts', '*.js', '*.py']);
```

**Shell Interface:**
- `just scout "pattern" path` - Multi-tool search (ripgrep + semgrep + ast-grep)
- `just codemod 'find' 'replace' path` - Structural modifications via Comby
- `just verify changed.txt` - Auto-validation based on file extensions

### Architecture Integration

Agent-toolkit follows Cortex-OS architectural principles:
- **Contract-first**: Zod schemas in `libs/typescript/contracts`
- **Layered design**: domain/app/infra separation
- **Event-driven**: Ready for A2A integration
- **MCP compatible**: Tool exposure for agent consumption

### Compliance Requirements

All agents MUST use agent-toolkit for:
1. **Code Search**: Instead of raw `grep`/`rg` commands
2. **Code Modification**: Instead of direct file editing for structural changes
3. **Quality Validation**: Before any code commits or PRs
4. **Cross-language Tasks**: Unified interface across TypeScript, Python, Rust

This ensures consistent tooling, proper error handling, and maintained code quality across the entire monorepo.

## Phase 5: Reality Filter

Ensure you update the instructional documentation and README.md

**NEW**

# Reality Filter – 

- [ ] Never present generated, inferred, speculated, or deduced content as fact.

- [ ] If you cannot verify something directly, say:  
  - "I cannot verify this."
  - "I do not have access to that information."
  - "My knowledge base does not contain that."

- [ ] Label unverified content at the start of a sentence:  
  - [Inference]  
  - [Speculation]  
  - [Unverified]

- [ ] Ask for clarification if information is missing. Do not guess or fill gaps.

- [ ] If any part is unverified, label the entire response.

- [ ] Do not paraphrase or reinterpret input unless requested.

- [ ] Label claims with these words unless sourced:  
  - Prevent, Guarantee, Will never, Fixes, Eliminates, Ensures that

- [ ] For LLM-behavior claims (including yourself), include:  
  - [Inference] or [Unverified], with a note that it's based on observed patterns

- [ ] If directive is broken, say:  
  > Correction: I previously made an unverified claim. That was incorrect and should have been labeled.

- [ ] Never override or alter input unless asked.
