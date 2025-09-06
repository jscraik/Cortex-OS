# Cortex-OS AI Contributor Playbook

Concise, actionable rules for AI coding agents. Follow exactly; optimize for safe, small, well‑tested increments.

## 1. Authority & Precedence
1. `.cortex/rules/RULES_OF_AI.md`
2. `AGENTS.md`
3. This file
4. `.github/instructions/*`
5. Package READMEs / docs. Never contradict higher sources; escalate ambiguity via a clarifying comment in PR description.

## 2. Architecture Snapshot (Do Not Violate)
- Runtime orchestrator: `apps/cortex-os/` mounts feature packages via DI.
- Feature packages live ONLY under `apps/cortex-os/packages/` (no cross-imports between siblings).
- Shared services live in `packages/` (e.g. `a2a`, `mcp`, `memories`, `orchestration`, `rag`, `simlab`).
- Contracts & schemas: `libs/typescript/contracts`; utilities: `libs/typescript/utils`.
- Communication: A2A events (`packages/a2a`) or MCP tools (`packages/mcp`). No ad‑hoc import reach‑through.
- Enforce contract-first: define/update Zod schema + types before implementation changes that cross a boundary.

## 3. Core Patterns (Examples)
- Cross-feature message: create CloudEvents envelope (`packages/a2a`), publish via bus. DO NOT import another feature's internal module.
- External system/tooling: add/extend MCP capability in `packages/mcp` rather than embedding API logic inside a feature.
- Persistent / recall memory: use service interface exposed by `packages/memories`; never new a DB client in a feature package.
- Orchestrating multi-step agent flow: emit domain events; let `packages/orchestration` subscribe & coordinate.

## 3A. New Feature Package vs Extend Existing
Create a NEW package under `apps/cortex-os/packages/` ONLY if:
- Boundary: New domain language / ubiquitous terms not present elsewhere.
- Lifecycle: Independent versioning or can be replaced without touching existing packages.
- Integration: Primarily communicates by events/contracts, not requiring deep internal calls.
- Size Pressure: Adding to existing package would push it past ~500–800 LoC core logic or blur responsibility.
Otherwise EXTEND an existing package—prefer evolution over proliferation.

Heuristics (reject new package if any apply): Adds <3 files, only one consumer, or just a thin façade around an existing service.

## 3B. Recommended Internal Layout (Feature Package)
```
apps/cortex-os/packages/<feature>/
  src/
    domain/        # Entities, value objects, pure logic (no IO)
    app/           # Use-cases / service layer orchestrating domain + infra
    infra/         # Adapters (bus bindings, persistence impl, MCP tool wrappers)
    index.ts       # Public exports (keep tight)
  __tests__/       # Co-located tests (mirror domain/app/infra folders)
  README.md        # Purpose + contract references
```
Rules:
- Domain layer must not import from `infra/`.
- `app/` may depend on domain + infra through interfaces.
- Re-exports in `index.ts` only; no deep consumer imports.

## 4. Change Workflow (Micro-Commit Discipline)
1. Write/adjust failing test (Vitest; add to nearest `__tests__` or existing suite) BEFORE code.
2. Implement minimal passing change.
3. Refactor (only with tests green).
4. Keep each commit single-purpose (feature, fix, chore) + Conventional Commit (e.g. `feat(a2a): add trace sampling`).

## 5. Commands You Will Use
Install: `pnpm install` | Dev: `pnpm dev` | Build: `pnpm build`
Tests: `pnpm test`, integration: `pnpm test:integration`, coverage gate: `pnpm test:coverage`
Playwright accessibility: `pnpm pw:test`
Governance parity: `pnpm ci:governance`
Security / Semgrep diff: `pnpm security:scan:diff`
Structure rules: `pnpm structure:validate`
Python tests (where applicable): `uv sync && uv run pytest`

## 5A. Additional Helpful Commands
- Readiness / env sanity: `pnpm readiness:check`
- Full lint (all packages): `pnpm lint:all`
- Security scan (focused): `pnpm security:scan` | all profiles: `pnpm security:scan:all`
- Dependency graph (impact planning): `pnpm nx graph`
- Structure governance: `pnpm structure:validate`
- Coverage threshold enforcement: `pnpm test:coverage`
- Baseline Semgrep (rare / controlled): `pnpm security:scan:baseline`

## 6. Contracts & Schemas
- When adding an event: update AsyncAPI / CloudEvents schema in `contracts/` and matching Zod schema in `libs/typescript/contracts`.
- Add validation test in `contracts/tests/` proving backward compatibility (no breaking field removals without version bump).
- Reference contracts from features; never duplicate structural types inline.

## 7. Boundaries & Anti-Patterns (Reject PR If Seen)
- Direct sibling feature import (`apps/cortex-os/packages/* -> */otherFeature/*`).
- Bypassing bus: calling another feature's internal class/function directly.
- Runtime side-effects at import time (initialize inside factory / DI layer instead).
- Unvalidated external responses (wrap with Zod parse before use).
- Adding secret values to tracked `.env` (keep sanitized / minimal; real secrets via runtime environment only).

## 8. Testing Requirements
- New logic => add at least one positive + one edge/negative test.
- Cross-boundary change => include contract test AND feature test.
- Maintain ≥ existing coverage; prefer adapting existing suite over creating redundant harnesses.
- Use deterministic seeds for stochastic components (see `AGENTS.md`).

## 9. Performance & Resource Discipline
- Long-running / blocking operations must be async and cancellable.
- Stream model output using established streaming modes (see `docs/streaming-modes.md`); respect flag precedence (CLI flag > env > config).
- Avoid unbounded in-memory accumulation; prefer event streaming or chunked processing.

## 9B. Streaming Modes (Quick Matrix)
| CLI Flag / Mode | Effect | Overrides | Typical Use |
|-----------------|--------|-----------|-------------|
| (default) token streaming | Emit token deltas to stdout | Falls back if no higher precedence | Interactive CLI feedback |
| `--aggregate` | Suppress deltas; emit final aggregated output | Overrides default/env/config | Deterministic logs / scripting |
| `--no-aggregate` | Force token streaming even if aggregate configured | Overrides `--aggregate` in config | Force live progress |
| `--json` / `--stream-json` | Emit structured JSON events (`delta`, `item`, `completed`) | Highest for format | Programmatic pipelines |
Precedence: CLI flag > `CORTEX_STREAM_MODE` env > config file > internal default. Validate downstream consumers when changing event shapes.

## 10. Security & Governance Hooks
- Run before commit (locally) when modifying code: `pnpm lint && pnpm test`.
- For risk surfaces (network, file IO, auth): run `pnpm security:scan:diff` before push.
- On import boundary refactors: run `pnpm structure:validate` + optionally `nx graph` to visualize impact.

## 11. PR Expectations
- Include brief test plan (what new/changed tests assert) in description.
- No edits to CI workflows, global configs, or license files unless the task explicitly requires.
- Keep diff size lean; if large, chunk into sequential PRs (foundation -> feature -> cleanup).

## 12. Quick Cross-Feature Example
Publish event (feature A):
```ts
await bus.publish(createEnvelope({
  type: 'task.created',
  source: 'urn:cortex:feature-a',
  data: { taskId, priority: 'high' }
}));
```
Handle in orchestrator:
```ts
bus.bind([{ type: 'task.created', handle: onTaskCreated }]);
```
No direct import from Feature A inside orchestrator implementation.

## 13. When Unsure
Prefer adding a TODO with context + create smallest safe abstraction. Do NOT guess cross-boundary contracts—locate or define them formally first.

## 9A. Multi-Language (Rust/Python) Interplay
- Rust (`codex-rs/`) used for performance / analysis tooling; expose functionality via CLI or generated artifacts—do NOT import Rust internals directly into TS.
- Python (`apps/cortex-py/`) integrates model/instructor workflows; invoke via defined MCP tools or CLI bridges—avoid ad-hoc `child_process` without contract.
- Cross-language data exchange: JSON (validated via Zod schemas) or well-defined file artifacts in `data/`.
- When adding new Rust/Python capability: 1) define contract schema, 2) add thin adapter (MCP tool / bus handler), 3) add round‑trip test (TS -> Rust/Py -> TS).

## 14. Refactor Playbook (Boundary Reshaping)
1. Identify target boundary & consumers: run `pnpm nx graph` and list importing packages.
2. Add characterization tests (capture current observable behavior & contracts).
3. Introduce new abstraction/path in parallel (do NOT delete old yet); wire via feature DI.
4. Migrate one consumer at a time; keep commit diff minimal.
5. Run `pnpm structure:validate` + `pnpm security:scan:diff` (catch sneaky boundary leaks & new risks).
6. Remove deprecated path only after zero runtime references (grep + type errors clean).
7. If contract shape changed: version schema + add backward‑compat validation test in `contracts/tests/`.
Anti-pattern: Big-bang rename removing old symbols before test suite passes.

---
If any rule here conflicts with higher authority files, defer upward and document the conflict in your PR description.
