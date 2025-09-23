# Agent Toolkit Integration Guide

This guide explains how to use `@cortex-os/agent-toolkit` consistently across the monorepo, how CI validates usage, and how Local Memory is enforced as the first memory layer.

## What the Toolkit Provides

- Contract-driven wrappers around search, codemod, and validation tools
- A thin CLI (`scripts/agent-toolkit.mjs`) that standardizes execution and output
- MCP tools for model integrations
- Diagnostics helpers for MCP health

## Quick Usage Patterns

- Multi-tool search in a path:
  - `pnpm at:multi` → `node scripts/agent-toolkit.mjs multi-search <pattern> <path>`
- Codemod via Comby:
  - `pnpm at:codemod` → `node scripts/agent-toolkit.mjs codemod <find> <replace> <path>`
- Validate a project:
  - `pnpm at:validate:project` → `node scripts/agent-toolkit.mjs validate:project "**/*.{ts,tsx,js,jsx,py,rs}"`

Prefer the CLI wrapper over direct tool invocation. It enforces contracts and keeps outputs deterministic for agents and CI.

## Where to Use It

- `apps/cortex-os` and `apps/cortex-code`:
  - Surface search/validate commands in dev UX (e.g., add Make/Just recipes or Rust CLI hooks)
  - Emit A2A events (e.g., `tool.execution.started/completed`) when run in workflows
- `packages/agents` and `packages/orchestration`:
  - Use MCP tools exposed by the toolkit to run searches/codemods inside agent steps
  - Persist task context via `packages/memories` (see Local Memory Enforcement below)
- `packages/kernel` and `packages/prp-runner`:
  - Adopt toolkit multi-search for context-building phases before planning/execute
- `packages/rag` and `packages/memories`:
  - Use search to collect sources and validate diffs before indexing

## CI & PNPM Integration

Two new CI hooks have been added:

- `pnpm ci:agent-toolkit:validate` — runs project-wide validation through the toolkit
- `pnpm ci:memory:enforce` — fails CI if Local Memory is not configured as the first layer

These are wired into `.github/workflows/tdd-enforcement.yml`. You can include them in other workflows as needed.

## Enforcing Local Memory First Layer

The guard script (`tools/validators/enforce-local-memory.mjs`) checks the following (aligned with `local-memory-mcp@1.1.0` dual MCP/REST mode):

- Local Memory is the short-term store (any of):
  - `MEMORIES_SHORT_STORE=local` (preferred)
  - `MEMORIES_ADAPTER=local` or `MEMORY_STORE=local` (legacy)
- REST endpoint is configured (dual-mode supported):
  - `LOCAL_MEMORY_BASE_URL=http://localhost:3002/api/v1`

Optional but recommended:

- `LOCAL_MEMORY_NAMESPACE=<namespace>`
- `LOCAL_MEMORY_API_KEY=<key>`

Strict mode (optional):

- `LOCAL_MEMORY_ENFORCE_STRICT=1` (or `CI_LOCAL_MEMORY_STRICT=1`) will:
  - Probe REST health at `BASE/health` and `BASE/api/v1/health`
  - Verify the local binary exists: `LOCAL_MEMORY_BIN` or `~/.local/bin/local-memory` or `which local-memory`

Temporary CI bypasses:

- `CI_SKIP_LOCAL_MEMORY_ENFORCE=1` or `CI_SKIP_MEMORY_ENFORCE=1`

## Recommended Additions

- Pre-commit: run `pnpm at:validate:changed` and `pnpm ci:memory:enforce`
- Required status checks: add a CI job that runs both the project validation and memory enforcement
- A2A Observability: emit `tool.execution.*` events around toolkit operations for correlation

## Next Steps (Roadmap)

- Session-aware context and pruning (40k token envelope) inside the toolkit
- Tree-sitter-backed semantic chunking and intelligent discovery cache
- Resilient executors (circuit breaker, rate limiting) around shell tools
- Multi-MCP registration (Claude, OpenAI, Gemini) from a single registry

See `packages/agent-toolkit/agent-toolkit-tdd-plan.md` for detailed TDD milestones.
