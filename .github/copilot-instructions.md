# GitHub Copilot instructions - Cortex-OS

Read this first. Keep guidance short, specific, and aligned with how this repo actually works.

## Authority order

1. .cortex/rules/RULES_OF_AI.md -> 2) AGENTS.md -> 3) this file -> 4) .github/instructions/\* -> 5) package READMEs. CI enforces .cortex policies and import boundaries.

## Big picture (how components interact)

- **ASBR Runtime** (`apps/cortex-os/`) coordinates feature packages and provides CLI/HTTP/UI interfaces
- **Feature Packages** (`apps/cortex-os/packages/`) contain domain-specific logic (agents, asbr, mvp, etc.)
- **Shared Services**: A2A bus (`packages/a2a`), MCP tools (`packages/mcp`), Memories (`packages/memories`), Orchestration (`packages/orchestration`)
- **Communication**: No direct cross-feature imports; use A2A events, service interfaces via DI, or MCP tools
- Domain separation: communicate via defined contracts (Zod/JSON schemas). See AGENTS.md and libs/typescript/\*.

## Daily workflow (repo root)

- Install: pnpm install
- Dev/build: pnpm dev | pnpm build (turbo)
- Tests: pnpm test | pnpm test:integration | pnpm test:coverage | pnpm pw:test (a11y)
- Lint/format: pnpm lint | pnpm format
- Governance (CI parity): pnpm ci:governance
- Python (uv): uv sync; uv run pytest (see pyproject.toml)

## What good looks like here

- Validate inputs/outputs with Zod; deterministic seeds and resource caps for agents (see AGENTS.md Inputs/Outputs).
- Keep modules ESM, small, and boundary-safe. Reference contracts from libs/typescript/contracts and utils from libs/typescript/utils.
- Prefer message contracts over imports across domains. Use A2A broker for cross-agent calls; use MCP manager for external servers.

## Key integration patterns

- **A2A messaging**: packages/a2a provides event bus for async feature communication. Use broker.publish/subscribe; avoid direct feature imports.
- **MCP integration**: packages/mcp manages external tools and capabilities. Use MCP manager for external systems integration.
- **Memory service**: packages/memories provides persistent state. Access via service interfaces, not direct imports.
- **Orchestration**: packages/orchestration coordinates multi-agent workflows using A2A events and service contracts.
- **Feature mounting**: ASBR runtime (`apps/cortex-os/`) mounts feature packages (`apps/cortex-os/packages/`) via dependency injection.

## Where to look

- **ASBR Runtime**: apps/cortex-os/ (main application, coordination, DI container)
- **Feature packages**: apps/cortex-os/packages/ (agents, asbr, mvp components)
- **Shared services**: packages/ (a2a, mcp, memories, orchestration, rag, simlab)
- **Contracts and types**: libs/typescript/{contracts,types,utils}
- **Tests**: tests/ and package-local tests; vitest workspace at vitest.workspace.ts
- **Configuration**: turbo.json, pnpm-workspace.yaml, tsconfig.json

## Running the right tests

- Unit/integration (TS): pnpm test, pnpm test:integration, pnpm test:launch (launch gates)
- Coverage gate (TS): pnpm test:coverage or :threshold
- Accessibility (Playwright): pnpm pw:test; reports in test-results/\*\*
- Python: uv run pytest (targets in pyproject.toml)

## PR expectations and guardrails

- Before PR: pnpm format && pnpm lint && pnpm test; update README/docs for behavior changes. Attach a brief test plan/logs for UX/CLI.
- Do not modify CI workflows, secrets, or repo-wide deps. Keep changes scoped. Respect import boundaries and agent contracts.

## Quick example (cross-feature communication)

- Use A2A broker for async events: `packages/a2a` provides publish/subscribe
- Use service interfaces for sync calls: contracts in `libs/typescript/contracts`, implementations wired by ASBR
- Use MCP tools for external systems: `packages/mcp` manages external integrations
- **Never directly import between feature packages** (`apps/cortex-os/packages/`)

If any section is unclear about ASBR architecture or feature mounting, say so and we will refine this document.
