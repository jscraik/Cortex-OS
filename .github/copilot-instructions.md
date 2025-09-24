# Cortex-OS AI contributor crib sheet

## Repo shape
- Nx 21.4.1 + pnpm 10; entrypoints under `apps/` (CLI, web, runtime). Feature packages live in `apps/cortex-os/packages/<feature>` with the `domain/app/infra` split.
- The runtime (`apps/cortex-os`) mounts features through DI; cross-feature collaboration flows through `@cortex-os/a2a` events or MCP tools—never reach into sibling `infra` directly.
- Shared schemas/types live in `libs/typescript/contracts`; update Zod schemas, re-export indexes, and contract tests before wiring new producers or consumers.

## Communication + orchestration
- Publish events with `createEnvelope(...)` from `@cortex-os/a2a-contracts`; include `traceparent` and `correlation_id` whenever part of a workflow.
- Multi-agent flows run on LangGraph via `@cortex-os/orchestration/createCerebrumGraph`; keep plans BVOO (bounded, validated, observable) and surface telemetry hooks.
- MCP tool changes belong beside runtime adapters (`packages/orchestration/src/...`, `packages/mcp/...`) with synced Zod schemas and `contracts/tests/*` coverage.

## Memory + persistence
- Wire memories through `@cortex-os/memories` factories; envs like `MEMORIES_SHORT_STORE`, `MEMORIES_EMBEDDER`, and `LOCAL_MEMORY_BASE_URL` select storage + embedder combos.
- Persist agent learnings with the memory service instead of ad-hoc state; respect namespace policies in `packages/memories/src/policies` (PII redaction, TTL, encryption).
- When adding decisions or lessons, use `createStoreFromEnv()` helpers so Local Memory stays in sync for other agents.

## Dev workflow
- Bootstrap with `./scripts/dev-setup.sh` then `pnpm readiness:check`; start the runtime via `pnpm dev`.
- Prefer smart wrappers: `pnpm build:smart | test:smart | lint:smart | typecheck:smart`; add `pnpm structure:validate` and `pnpm security:scan` before PRs.
- Tests run through the safe harness: `pnpm test:safe` (use `--watch` or `NODE_MAX_OLD_SPACE_SIZE_MB` for tuning); quality gates expect ≥90% coverage and mutation thresholds from `reports/badges`.
- Automation/search lives in `packages/agent-toolkit`: use `just scout`, `just codemod`, `just verify changed.txt`, or the TS API (`createAgentToolkit()`) instead of raw shell one-offs.

## Coding standards
- Functions ≤40 lines, named exports only, async/await everywhere—no `.then()` chains or unneeded classes (`CODESTYLE.md` + `AGENTS.md`).
- All logs, errors, and status text must include “brAInwav” branding; production paths cannot ship mock responses or TODO placeholders.
- New packages must set `composite: true` in `tsconfig`, follow the domain/app/infra layering, and add README + tests mirroring existing packages.

## Quality + observability
- Contract or event updates require a sample + negative test under `contracts/tests`, plus README notes for the producing package.
- Tooling integrations should emit audit events via the MCP audit publisher (`apps/cortex-os/src/services`) so `mcp.tool.audit.v1` stays accurate.
- Document architectural decisions and effective patterns in Local Memory to keep subsequent agent runs informed.
