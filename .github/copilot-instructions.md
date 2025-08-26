# GitHub Copilot instructions - Cortex-OS

Read this first. Keep guidance short, specific, and aligned with how this repo actually works.

## Authority order

1. .cortex/rules/RULES_OF_AI.md -> 2) AGENTS.md -> 3) this file -> 4) .github/instructions/\* -> 5) package READMEs. CI enforces .cortex policies and import boundaries.

## Big picture (how components interact)

- Agents talk via A2A (packages/a2a). External tools via MCP (packages/mcp). Long-term state via Memories (packages/memories). Orchestration coordinates flows (packages/orchestration). Apps wire these together (apps/\*).
- Domain separation: no direct cross-domain imports; communicate via defined contracts (Zod/JSON schemas). See AGENTS.md and libs/typescript/\*.

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

- A2A messaging: packages/a2a provides broker, discovery, retries, circuit breaker, and load-balancing. Use broker.sendMessage(...) for cross-agent ops; do not import other agents directly.
- MCP: packages/mcp centralizes Model Context Protocol clients and the Universal MCP Manager. Use pnpm mcp:\* scripts to run/smoke.
- Memories: packages/memories exposes a MemoryService via ports/adapters; bind from apps and expose HTTP routes as needed.
- Orchestration: packages/orchestration coordinates multi-agent workflows; TS <-> Python bridge is used when enabled by the package.

## Where to look

- Contracts and shared types: libs/typescript/{contracts,types,utils}
- Agent rules and governance: .cortex/\*\* and AGENTS.md
- Tests: tests/\*\* and package-local tests; vitest workspace at vitest.workspace.ts
- Pipelines: turbo.json; workspace layout in pnpm-workspace.yaml

## Running the right tests

- Unit/integration (TS): pnpm test, pnpm test:integration, pnpm test:launch (launch gates)
- Coverage gate (TS): pnpm test:coverage or :threshold
- Accessibility (Playwright): pnpm pw:test; reports in test-results/\*\*
- Python: uv run pytest (targets in pyproject.toml)

## PR expectations and guardrails

- Before PR: pnpm format && pnpm lint && pnpm test; update README/docs for behavior changes. Attach a brief test plan/logs for UX/CLI.
- Do not modify CI workflows, secrets, or repo-wide deps. Keep changes scoped. Respect import boundaries and agent contracts.

## Quick example (cross-agent call)

- Use A2A broker with discovery instead of importing another agent's code. Place message contracts in libs/typescript/contracts and validate with Zod.

If any section is unclear (e.g., exact service wiring in apps/cortex-os), say so and we will refine this document.
