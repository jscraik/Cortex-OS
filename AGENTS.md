# AGENTS

# Agent Instructions for brAInwav Cortex-OS

These instructions apply to all developers and AI agents working in this repository.

## 🚨 CRITICAL: brAInwav Production Standards

**ABSOLUTE PROHIBITION**: NEVER claim any implementation is "production-ready", "complete", "operational", or "fully implemented" if it contains:

- `Math.random()` calls for generating fake data
- Hardcoded mock responses like "Mock adapter response - adapters not yet implemented"
- TODO comments in production code paths
- Placeholder implementations with notes like "will be wired to MarketplaceMcpService in next step"
- Disabled features with `console.warn("not implemented")`
- Fake system metrics or thermal data

**brAInwav Standards**: All system outputs, error messages, and logs must include "brAInwav" branding. Status claims must be verified against actual code implementation.

**Reference**: See `/Users/jamiecraik/.Cortex-OS/.cortex/rules/RULES_OF_AI.md` for complete production standards.

## 🔄 Agentic Coding Workflow

All agents working on brAInwav Cortex-OS must follow this structured 5-phase workflow:

### 0. Tasks

- **Operate on a task basis** - Each feature/bugfix/enhancement is a discrete task
- **Store intermediate context** in Markdown files in the `~/tasks` folder
- **Store all context** in the local memory MCP and/or REST API for persistence
- **Use semantic task ID slugs** - descriptive identifiers like `auth-login-validation` or `rag-query-optimization`

### 1. Research

- **Utilize semantic search** to identify existing patterns within this codebase
- **Use Web-Search** to access the internet for the most relevant and up-to-date information
- **Begin with follow-up questions** to establish the direction of the research
- **Report findings** in `[feature].research.md` within the tasks folder

**Example Structure:**

```markdown
# auth-login-validation.research.md

## Research Objective
Implement secure login validation following brAInwav standards

## Existing Patterns Found
- Current auth implementation in `packages/auth/`
- Security validation patterns in `packages/security/`
- MCP integration patterns in `packages/mcp/`

## External Research
- OWASP authentication best practices
- JWT security considerations
- Rate limiting strategies

## Recommendations
[Detailed findings and recommendations]
```

### 2. Planning

- **Read the research file** `[feature].research.md` from tasks folder
- **Develop a TDD plan** based on software engineering principles:
  - **Reuse existing patterns** and components where possible
  - **Separation of concerns** - clear domain/app/infra boundaries
  - **Single Responsibility Principle (SRP)** - one purpose per function/class
  - **Don't Repeat Yourself (DRY)** - eliminate code duplication
  - **Keep it Simple, Stupid (KISS)** - avoid unnecessary complexity
  - **You Aren't Gonna Need It (YAGNI)** - implement only what's needed
  - **Encapsulation** - hide implementation details
  - **Modularity** - loosely coupled, highly cohesive components
  - **Open/Closed Principle** - open for extension, closed for modification
  - **Testability** - design for easy testing
  - **Principle of Least Astonishment (POLA)** - behave as expected
  - **Fail Fast** - detect and report errors early
  - **High Cohesion, Low Coupling** - related code together, minimal dependencies
- **Ask clarifying questions** if needed to ensure clear understanding
- **Write comprehensive plan** to `[feature]-tdd-plan.md` with all context required for implementation
- **Create implementation checklist**: Break down the TDD plan into specific, trackable checklist items to guide Phase 3 execution

**Example Structure:**

```markdown
# auth-login-validation-tdd-plan.md

## Implementation Plan

### Phase 1: Test Setup
1. Create failing tests for login validation
2. Test invalid credentials rejection
3. Test rate limiting enforcement

### Phase 2: Core Implementation
1. Implement validation logic
2. Add brAInwav error messaging
3. Integrate with existing auth system

### Phase 3: Integration
1. MCP tool integration
2. Event emission for A2A communication
3. Memory persistence integration

### Technical Decisions
- Use Zod for input validation
- Follow existing auth patterns in packages/auth/
- Emit brAInwav-branded error messages
```

### 3. Implementation

- **Read the TDD plan** `[feature]-tdd-plan.md` and create a to-do list
- **Execute the plan** systematically with TDD approach
- **Go for as long as possible** - group ambiguous questions for the end
- **Implementation must be 100% deployable** unless explicitly stated otherwise
- **Follow brAInwav coding standards** and architectural patterns
- **Update implementation checklist**: Mark completed tasks as you progress through implementation

### 4. Verification

- **Verify requirements** are met and implementation is bug-free
- **Run tests** and validate all tool calls work correctly
- **Check output** matches expected behavior
- **Return to implementation** if issues arise and make necessary adjustments
- **Update task status** to **"verified"** once complete
- **Store lessons learned** in local memory for future reference

### 5. Archive

- **Archive completed TDD plan**: Move `[feature]-tdd-plan.md` to appropriate documentation location:
  - Package documentation: `apps/[app-name]/docs/` or `packages/[package-name]/docs/`
  - System documentation: root `docs/` or `project-documentation/`
  - Architecture decisions: `project-documentation/`
- **Update all documentation**: Ensure reports, implementation notes, and architectural decisions are properly documented and placed
- **Complete checklist archival**: Mark all final checklist items as complete and store in local memory
- **Comprehensive knowledge storage**: Archive complete task summary including technical decisions, brAInwav integration points, and lessons learned for future development sessions

## 🚨 CRITICAL: CODESTYLE.md ENFORCEMENT

**MANDATORY COMPLIANCE** with [CODESTYLE.md](../CODESTYLE.md) requirements:

### Function Length Limits

- **Maximum 40 lines per function** - Split immediately if readability suffers
- **No exceptions** - This is strictly enforced in CI and will cause build failures

### Export Requirements

- **Named exports only** - `export const functionName = ...`
- **NEVER use default exports** - `export default` is forbidden
- **Violations will cause build failures**

### Class Usage Restrictions

- **Classes only when absolutely required** by framework (React ErrorBoundary, etc.)
- **Prefer functional composition** and pure functions
- **No classes without clear justification** in code review comments

### Async/Await Requirements

- **Use async/await exclusively** - Never use `.then()` chains
- **Promise chains are forbidden** and will be caught by linters

### Project References

- **All packages must set `composite: true`** in tsconfig.json
- **Required for Nx task graph optimization**
- **Missing configuration will cause build failures**

## Local Memory

Proactively use local-memory MCP to store, retrieve, update, and analyze memories to maintain context and build expertise over time.
Store key insights including lessons learned, architectural decisions, development strategies, and project outcomes. Use semantic search
and relationship mapping to find relevant memories across all projects and sessions. This enables persistent knowledge across development
sessions and enhances decision-making through historical context.

## Workflow

- Practice strict Test-Driven Development (TDD).
  - Start with a failing test that defines each requirement.
  - Implement the minimal code to make the test pass.
  - Refactor while keeping tests green.
- Break work into micro-tasks.
  - Limit each commit to a single focused change.
  - Include tests and implementation in the same commit.

## Commit Policy

- Use Conventional Commits with clear scopes (e.g., `feat(auth): add login validation`).
- Reference related issue or task identifiers when available.
- Keep history linear; avoid amend or force-push operations.

## Validation

Run the following checks before submitting a commit (Husky hooks run automatically on commit):

```bash
# Quick local checks
pnpm biome:staged   # format + lint staged files
pnpm lint
pnpm test
# For documentation-only changes
pnpm docs:lint

# Emergency bypass (use sparingly)
# HUSKY=0 git commit -m "..."
```

## Persistent Agent Memory (Local Memory)

Enable persistent context across runs using Local Memory in dual mode (MCP + REST API).

Setup:

- Start the Local Memory daemon (default base URL `http://localhost:3028/api/v1`).
- Export envs:
  - `LOCAL_MEMORY_BASE_URL` (e.g., `http://localhost:3028/api/v1`)
  - `LOCAL_MEMORY_API_KEY` (if configured)
  - `LOCAL_MEMORY_NAMESPACE` (optional)
  - `MEMORIES_ADAPTER` or `MEMORY_STORE` = `local | sqlite | prisma | memory`
  - `LOCAL_MEMORY_MODE=dual` to keep REST API + MCP active together

Quick verify:

```bash
curl -sS http://localhost:3028/api/v1/health | jq .
```

Code path:

- Use `createStoreFromEnv()` from `@cortex-os/memories` to auto-select Local Memory when `LOCAL_MEMORY_BASE_URL` is present.
- Falls back to SQLite or in-memory based on envs.

Privacy note: follow `.cortex/rules/RULES_OF_AI.md` — avoid storing secrets or personal data without consent; prefer encryption where applicable.

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
  content: 'Chose event-driven architecture over direct imports for decoupling',
  importance: 8,
  tags: ['architecture', 'decision', 'a2a'],
  domain: 'software-design'
});

// Store lessons learned
await memory.store({
  content: 'Function length limit of 40 lines prevents cognitive overload',
  importance: 9,
  tags: ['lesson', 'codestyle', 'maintainability'],
  domain: 'development-patterns'
});

// Store development strategies
await memory.store({
  content: 'Always use named exports to enable tree-shaking and better debugging',
  importance: 7,
  tags: ['strategy', 'exports', 'optimization'],
  domain: 'typescript'
});
```

## 🔧 Agent Toolkit (MANDATORY)

The `packages/agent-toolkit` provides a **unified, contract-driven interface** for all development  
operations. This toolkit is **REQUIRED** for maintaining monorepo uniformity and code quality.

### Core Integration Pattern

```typescript
import { createAgentToolkit } from '@cortex-os/agent-toolkit';

const toolkit = createAgentToolkit();
// Use TypeScript interface for programmatic access
await toolkit.multiSearch('pattern', './src');
await toolkit.validateProject(['*.ts', '*.py', '*.rs']);
```

### Shell Interface (Just Recipes)

- `just scout "pattern" path` - Multi-tool search (ripgrep + semgrep + ast-grep)
- `just codemod 'find(:[x])' 'replace(:[x])' path` - Structural modifications
- `just verify changed.txt` - Auto-validation based on file types

### When Agents MUST Use Agent-Toolkit

1. **Code Search Operations** - Instead of raw grep/rg commands
2. **Structural Modifications** - For any refactoring or codemod operations  
3. **Quality Validation** - Before commits, PRs, or code changes
4. **Cross-Language Tasks** - Unified interface for TypeScript/Python/Rust
5. **Pre-Commit Workflows** - Automated validation pipelines

### Architecture Compliance

Agent-toolkit follows Cortex-OS principles:

- **Contract-first**: Zod schemas ensure type safety
- **Event-driven**: A2A integration ready
- **MCP compatible**: Tool exposure for agent consumption
- **Layered design**: Clean domain/app/infra separation

**Legacy Note**: Agents should leverage scripts in `agent-toolkit/tools` for code search, structural  
rewrites, diff review and validation. Use `just` recipes (`just scout`, `just codemod`, `just verify`)  
or call the wrappers directly. Run standard checks (`pnpm biome:staged`, `pnpm lint`, `pnpm test`,  
`pnpm docs:lint`) alongside these tools.

## 🚀 Smart Nx Execution (Affected-Only)

All agents MUST prefer the smart wrapper for build/test/lint/typecheck operations:

```bash
pnpm build:smart       # node scripts/nx-smart.mjs build
pnpm test:smart        # node scripts/nx-smart.mjs test
pnpm lint:smart        # node scripts/nx-smart.mjs lint
pnpm typecheck:smart   # node scripts/nx-smart.mjs typecheck

# Dry-run mode (preview affected projects without execution)
node scripts/nx-smart.mjs build --dry-run
```

Behavior:

- Auto-detects `base`/`head` via environment (`NX_BASE`, `NX_HEAD`) or falls back to the previous commit.
- Runs `nx print-affected` first (fast fail + transparency) then executes `nx affected -t <target>`.
- Falls back to full `run-many` only if diff detection fails (rare – logs a warning banner).
- Emits a concise strategy line: `strategy=affected|all changed=<count>` for observability.
- Supports `--dry-run` to preview affected projects without execution (useful for PR preflight).

Rationale: Prevents wasteful monorepo-wide execution and reduces memory churn + CI wall time.

### Focused Runs (Selective Affected Subset)

When you only care about a narrow slice of the affected graph (e.g., iterating on a
single package), you can constrain execution with a focus filter:

```bash
# Limit to a couple of projects (intersection with affected set)
node scripts/nx-smart.mjs test --focus @cortex-os/agent-toolkit,@cortex-os/telemetry

# Environment variable form (preferred for CI matrix or aliases)
CORTEX_SMART_FOCUS=@cortex-os/agent-toolkit pnpm test:smart

# Combine with dry-run to preview the trimmed set
node scripts/nx-smart.mjs lint --focus @cortex-os/agent-toolkit --dry-run
```

Behavior:

- The full affected list is computed first; focus then reduces it to the intersection.
- If no overlap exists, the original affected list is used (a notice is logged).
- Works with all targets (`build|test|lint|typecheck`) and supports `--json` + `--dry-run` modes.
- Use sparingly in CI to avoid hiding transitive breakages; ideal for fast local iteration.

Anti-patterns:

- Forcing focus in shared CI without a separate full coverage job.
- Using focus to bypass required dependent builds (e.g., skipping contracts when modifying a consumer).

Tip: Pair with `--dry-run` before committing to ensure you are not masking an expected dependency.

## 🤖 Non-Interactive Nx Mode

The wrapper enforces non-interactive execution by default:

- Sets `NX_INTERACTIVE=false` (and `CI=true` if unset) for deterministic, prompt-free runs.
- Passes `--no-interactive` ONLY to the top-level Nx CLI (not forwarded to underlying toolchains like `tsc`, `vitest`, or `tsup`).
- Override (rare) by exporting `CORTEX_NX_INTERACTIVE=1` before invoking a smart script.

Example override:

```bash
CORTEX_NX_INTERACTIVE=1 pnpm build:smart
```

Policy: Do **not** override in automation / CI pipelines. Interactive mode is only for local
diagnostic exploration when inspecting task graph decisions.

## 📊 Wrapper Diagnostics

Each invocation prints a header line:

```text
[nx-smart] target=test base=<sha> head=<sha> changed=<n> strategy=affected
```

Dry-run mode shows affected summary:

```text
📋 Affected Projects Summary:
Target: build
Base: origin/main  
Head: abc123
Changed files: 15
Affected projects: @cortex-os/agents, @cortex-os/mcp-core

💡 To execute: pnpm build:smart
```

If diff resolution fails, you will see:

```text
[nx-smart][warn] unable to resolve git diff – falling back to full run-many
```

Action for agents: investigate git environment (shallow clone? detached HEAD?) before re-running.

## 🧪 When Writing New Automation

- Use smart scripts inside composite commands (e.g., release gates) instead of raw `nx run-many`.
- Avoid chaining `pnpm build && pnpm test`; prefer targeted: `pnpm build:smart && pnpm test:smart`.
- For security / structure validations, run AFTER `build:smart` to leverage any generated artifacts.

## 🧹 Pending Deprecations

Legacy scripts using blanket `nx run-many` will be pruned; keep memory management scripts (`memory:*`)
intact. Prefer adding any new orchestration logic to the smart wrapper or agent-toolkit utilities.

## 🔍 Focus Validation & Dependency Safety

The smart wrapper can perform dependency graph validation when you supply `--focus` plus `--validate-focus`:

```bash
node scripts/nx-smart.mjs test --focus @cortex-os/telemetry --validate-focus --dry-run
```

Behavior:

- Builds the Nx project graph (`nx graph`) and traverses dependencies of each focused project.
- Warns if an affected dependency would be excluded by the chosen focus set.
- Still executes with the narrowed set; warnings help you decide if you should drop focus.
- Passes the narrowed list to Nx via `--projects=<list>` for faster task scheduling.

Disable validation simply by omitting `--validate-focus`.

## 📡 OpenTelemetry Instrumentation (Optional)

Set `NX_SMART_OTEL=1` to emit tracing + metrics via `@cortex-os/telemetry`:

Metrics exported:

- `nx_smart_duration_ms` (histogram) – wrapper wall-clock duration per run
- `nx_smart_runs_total` (counter) – total runs labeled by `target`

Span attributes:

- `nx.smart.target`, `nx.smart.strategy`, `nx.smart.duration_ms`, `nx.smart.skipped`

Example:

```bash
NX_SMART_OTEL=1 PROMETHEUS_PORT=9464 pnpm test:smart
curl -s localhost:9464/metrics | grep nx_smart_duration_ms
```

Telemetry shutdown is graceful (2s timeout). Failures do not abort builds.

## ⏱ Performance History & Auto-Tuning

After a successful run with metrics JSON output you can record performance history automatically.
`perf-check.mjs` now appends entries to `performance-history.json` (override path with `PERF_HISTORY_FILE`).

History entry shape:

```json
{ "target": "test", "durationMs": 123456, "timestamp": "2025-09-15T12:34:56Z", "gitSha": "..." }
```

Limit retained entries via `PERF_HISTORY_LIMIT` (default 200).

### Auto-Tune Baseline

Use the new script to update `performance-baseline.json` based on medians of recent history:

```bash
node scripts/perf-autotune.mjs performance-baseline.json performance-history.json --window 15 --headroom 30
```

Rules:

- Median of last `N` (window) samples per target.
- Applies configurable headroom percentage (default 25%).
- Only updates if change >5% or baseline missing.

Integrate into CI (post-success) to keep gates realistic while catching regressions.
