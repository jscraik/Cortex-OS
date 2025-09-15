<!-- markdownlint-disable MD013 MD033 MD022 MD031 MD032 MD040 -->
# @cortex-os/agents — Development Plan (TDD)

This plan upgrades and operationalizes `packages/agents` to 100% readiness using strict TDD, micro-commits, and governance from `.cortex/`. It is actionable, references concrete files, and includes verification commands.

## Guiding Principles

1. TDD every change: write failing test → implement minimal code → refactor green.
2. Micro-commits: one focused change per commit with tests and docs.
3. Operational by design: security, observability, and reliability in scope.
4. Follow AGENTS.md commit/validation policy and CI gates.

## Quick Start (Package-scoped)

```bash
# From repo root
pnpm -F @cortex-os/agents build
pnpm -F @cortex-os/agents test
pnpm -F @cortex-os/agents test:coverage
pnpm -F @cortex-os/agents lint

# Run example audit workflow (LLamaGuard via MLX)
pnpm -F @cortex-os/agents security:audit
```

Key files to know:

- packages/agents/src/index.ts
- packages/agents/src/orchestration/agent-orchestrator.ts
- packages/agents/src/providers/fallback-chain.ts
- packages/agents/src/providers/mlx-provider/index.ts
- packages/agents/src/lib/event-bus.ts
- packages/agents/src/integrations/outbox.ts
- packages/agents/tests (unit, integration, contract, golden)

## Env & Integration (Local Memory, MLX)

Required for examples and outbox persistence:

- LOCAL_MEMORY_BASE_URL or use SQLite store path in examples
- MLX_MODEL or MLX_LLAMAGUARD_MODEL for security example
- Optional: MODEL_GATEWAY_URL for MLX HTTP gateway

```bash
export MLX_MODEL="~/.cache/huggingface/hub/models--mlx-community--Llama-3.2-3B-Instruct-4bit"
export MEMORY_SQLITE_PATH="data/agents-memory.db"
```

## Milestones & Tasks (each task = one commit)

| Milestone | Scope | Tasks (Red → Green → Refactor) | Acceptance (tests/files) |
| --- | --- | --- | --- |
| 0. Baseline hardening | Contracts, timestamps, errors | 1) Extend failing samples for all events including optional fields.<br>2) Ensure ISO-8601 timestamps and errorCode/status propagated in failed events.<br>3) Refactor event types to match catalog. | packages/agents/tests/contract/events.contract.test.ts<br>packages/agents/tests/contract/events.datetime.contract.test.ts |
| 1. Fallback + Observability | Provider chain, audit events | 1) Add failing test asserting provider.fallback payload shape and routing.<br>2) Emit provider.success/fallback with full context.<br>3) Doc examples in README. | packages/agents/src/__tests__/fallback-chain.test.ts<br>packages/agents/tests/unit/providers/fallback-chain.test.ts |
| 2. Golden Regression | Stable outputs | 1) Capture new golden fixtures for key flows.<br>2) Add failing tests asserting snapshot stability.<br>3) Add tooling notes in README. | packages/agents/tests/golden/snapshots/*.json |
| 3. Outbox → Memory | Governed persistence | 1) Add failing tests for outbox wiring to MemoryStore with PII redaction, TTL, size guard.<br>2) Wire resolver to per-capability policies.<br>3) Provide SQLite demo path. | packages/agents/src/integrations/outbox.ts<br>packages/agents/examples/audit-security-workflow.ts |
| 4. Authorization | Workflow gate + audit trail | 1) Add failing unit test for authorize(workflow) deny path emitting security.workflow_unauthorized.<br>2) Implement and return failed result with error.<br>3) Doc in README. | packages/agents/tests/unit/orchestration/authorization.test.ts |
| 5. Streaming (nice-to-have) | Token streams | 1) Add failing test for streaming interface in provider abstraction (iterable chunks).<br>2) Implement streaming path in ModelProvider and plumb basic propagation.<br>3) Document usage. | `packages/agents/src/providers/*` — new tests under unit/providers |
| 6. Interactive corrections (nice-to-have) | CLI loop | 1) Add failing E2E test driving a simple correction loop surface (mock provider).<br>2) Provide minimal CLI in examples to apply corrections stepwise.<br>3) Document pattern. | `packages/agents/examples/*` — new; `tests/e2e/*` — new |
| 7. Docs & Readiness | README, thresholds | 1) Update README with env, examples, governance notes.<br>2) Raise coverage thresholds incrementally in readiness.yml.<br>3) Add ADR summary in docs if needed. | packages/agents/README.md<br>packages/agents/readiness.yml |

Notes:

- Items 5–6 are optional polish; prioritize 0–4 and 7 for “operational”.
- Keep golden snapshots deterministic; use `seed` where applicable.

## Concrete Test Pointers

- Contract events: packages/agents/tests/contract/events.contract.test.ts
- Full workflow integration: packages/agents/tests/integration/full-workflow.test.ts
- Golden outputs: packages/agents/tests/golden/snapshots/*.json
- MLX provider: packages/agents/src/__tests__/mlx-provider.test.ts and tests/unit/providers/mlx-provider.test.ts
- Fallback chain: packages/agents/src/__tests__/fallback-chain.test.ts

## Example Workflows & Smoke Tests

Run the audit workflow (persists outbox via SQLite):

```bash
pnpm -F @cortex-os/agents security:audit
```

File reference: packages/agents/examples/audit-security-workflow.ts

## Commit & Validation Policy

- Conventional commits, scoped: e.g., `feat(agents): add outbox PII redaction`.
- Always run before commit:
  - `pnpm biome:staged` (format + lint staged)
  - `pnpm -F @cortex-os/agents lint && pnpm -F @cortex-os/agents test`
  - For docs-only: `pnpm docs:lint`
- One logical change per commit (tests + code together).

## Release Readiness Checklist

- Security
  - Input validation on all agent boundaries (Zod schemas) — see packages/agents/src/lib/validate.ts
  - `security.workflow_unauthorized` emitted and persisted on deny

- Observability
  - Event bus emits: agent.started/agent.completed/agent.failed, provider.success/provider.fallback, workflow.started/completed/cancelled
  - Outbox wired to governed MemoryStore (PII redaction, TTL, size guard)

- Reliability
  - Fallback chain publishes events and recovers when primary fails
  - Workflows support sequential/parallel with dependency constraints

- Docs & Examples
  - README updated with env and examples
  - Example CLIs runnable (audit-security-workflow.ts)

- Coverage & Thresholds
  - Increase packages/agents/readiness.yml thresholds from 0 in staged steps
  - Keep CI green with `pnpm -F @cortex-os/agents test:coverage`

## Architecture Alignment

Reference: .cortex/docs/project-structure.md

- Package resides under packages/agents and exposes only public APIs via src/index.ts
- No direct filesystem writes; persistence via MemoryStore only
- Interop through A2A events and DI; no cross-feature direct imports

## Out of Scope (This Plan)

- Building marketplace UIs or external MCP servers (see MCP plans)
- Heavy benchmarking; track basic metrics first
- Production MLX deployment; local/dev model gateway is sufficient

---

Following this plan with strict TDD and commit hygiene will keep `@cortex-os/agents` fully operational, verifiable, and aligned with governance and architecture.
