# Cortex-OS AI Contributor Playbook

<details><summary><strong>1. Authority & Precedence</strong></summary>

1. `.cortex/rules/RULES_OF_AI.md`
2. `AGENTS.md`
3. This file
4. `.github/instructions/*`
5. Package READMEs / docs.

</details>

<details><summary><strong>2. Architecture Snapshot (Do Not Violate)</strong></summary>

- Runtime orchestrator: `apps/cortex-os/` mounts feature packages via DI.
- Feature packages under `apps/cortex-os/packages/` only (no sibling cross-imports).
- Shared services: `packages/` (`a2a`, `mcp`, `memories`, `orchestration`, `rag`, `simlab`).
- Contracts: `libs/typescript/contracts`; utilities: `libs/typescript/utils`.
- Communication: A2A events or MCP tools. No reach‑through imports.
- Contract-first before cross-boundary changes.

</details>

<details><summary><strong>3. Core Patterns & Package Rules</strong></summary>

- Cross-feature: publish CloudEvents via bus (`packages/a2a`).
- External API/tool: extend MCP (`packages/mcp`).
- Memory/state: use `packages/memories` service interface.
- Orchestration: events + handlers in `packages/orchestration`.

<strong>3A. New Package vs Extend</strong>
Create NEW only if: new domain language, independent lifecycle, event-centric integration, size pressure (>~800 LoC risk). Otherwise extend.
Reject if: <3 files, single consumer, thin façade.

<strong>3B. Feature Layout</strong>
```
apps/cortex-os/packages/<feature>/
  src/
    domain/  # Pure logic
    app/     # Use-cases
    infra/   # Adapters
    index.ts
  __tests__/
  README.md
```
Rules: domain !-> infra; `app` mediates; re-export only via `index.ts`.

</details>

<details><summary><strong>4. Change Workflow (Micro-Commit)</strong></summary>
1. Write failing test
2. Minimal code
3. Green -> refactor
4. Conventional Commit (`feat(a2a): ...`)
</details>

<details><summary><strong>5. Commands (+ Extra)</strong></summary>
Core: `pnpm install` | `pnpm dev` | `pnpm build` | `pnpm test` | `pnpm test:integration` | `pnpm test:coverage` | `pnpm pw:test`
Governance: `pnpm ci:governance` | `pnpm structure:validate` | `pnpm security:scan:diff`
Extra: `pnpm readiness:check` | `pnpm lint:all` | `pnpm security:scan` | `pnpm security:scan:all` | `pnpm nx graph` | `pnpm security:scan:baseline`
Python: `uv sync && uv run pytest`
</details>

<details><summary><strong>6. Contracts & Schemas</strong></summary>
Update AsyncAPI & Zod; add validation test (`contracts/tests/`); new fields optional unless version bump; never duplicate types.
</details>

<details><summary><strong>7. Boundaries & Anti-Patterns</strong></summary>
No sibling imports; no bus bypass; no import-time side-effects; validate external responses; no secrets in tracked `.env`.
</details>

<details><summary><strong>8. Testing Requirements</strong></summary>
Positive + edge test; cross-boundary => contract + feature test; maintain coverage; deterministic seeds.
</details>

<details><summary><strong>9. Performance & Streaming</strong></summary>
Async & cancellable; avoid unbounded memory; use streaming modes (see matrix below).

<strong>Streaming Modes Matrix</strong>
| Mode | Effect | Overrides | Use |
|------|--------|-----------|-----|
| default | token deltas | fallback | interactive |
| `--aggregate` | final only | default/env | logs/scripts |
| `--no-aggregate` | force deltas | aggregate | live progress |
| `--json` / `--stream-json` | structured events | all | programmatic |
Precedence: CLI > env (`CORTEX_STREAM_MODE`) > config > internal.
</details>

<details><summary><strong>10. Security & Governance Hooks</strong></summary>
`pnpm lint && pnpm test`; risk surfaces -> `pnpm security:scan:diff`; boundary refactor -> `pnpm structure:validate` + `pnpm nx graph`.
</details>

<details><summary><strong>11. PR Expectations</strong></summary>
Include test plan; avoid CI/license/global config edits; keep diffs small/chunked.
</details>

<details><summary><strong>12. Cross-Feature Example</strong></summary>
```ts
await bus.publish(createEnvelope({
  type: 'task.created',
  source: 'urn:cortex:feature-a',
  data: { taskId, priority: 'high' }
}));

bus.bind([{ type: 'task.created', handle: onTaskCreated }]);
```
</details>

<details><summary><strong>13. When Unsure</strong></summary>
Add TODO + smallest safe abstraction; never guess a contract.
</details>

<details><summary><strong>14. Refactor Playbook</strong></summary>
1. Map consumers (`pnpm nx graph`)
2. Characterization tests
3. Add new path in parallel
4. Migrate one consumer at a time
5. `pnpm structure:validate` + `pnpm security:scan:diff`
6. Remove old after zero refs
7. Version + backward-compat test if schema changed
Anti-pattern: big-bang rename.
</details>

<details><summary><strong>15. Minimal Event Checklist</strong></summary>
Name (past-tense / lifecycle); envelope core fields; lean data shape; add schema (AsyncAPI + Zod); round-trip + handler tests; optional new fields; propagate `traceparent`; add `correlation_id` if workflow; link in README.
</details>

<details><summary><strong>15A. New Event JSON Template</strong></summary>
Minimal illustrative envelope (include only needed optional fields):

```jsonc
{
  "specversion": "1.0",
  "type": "task.created",          // lifecycle or domain event
  "source": "urn:cortex:tasks",    // producing feature URN
  "id": "uuid-v4-or-ulid",         // globally unique
  "time": "2025-09-06T12:34:56Z",  // RFC3339
  "traceparent": "00-<traceId>-<spanId>-01", // propagate if part of flow
  "correlation_id": "req-123",     // if request/response or workflow
  "data": {
    "taskId": "task-789",
    "priority": "high",
    "requestedBy": "user-42"
  }
}
```
Implementation Steps:
1. Add Zod schema in `libs/typescript/contracts/<domain>/events.ts`.
2. Register / extend AsyncAPI or CloudEvents schema under `contracts/`.
3. Add contract test: validate sample -> round trip via create/parse.
4. Add producing handler test + (if needed) consuming feature test.
5. Document in producing package README (Events section).
</details>

<details><summary><strong>16. Triaging Failing Test</strong></summary>
1. Narrow scope (`pnpm test --filter <pkg>`)
2. Inspect schemas in `libs/typescript/contracts`
3. Add `DEBUG=cortex:*` for trace
4. Log envelope diff temporarily
5. Create minimal reproduction test
6. Fix -> ensure green -> remove debug
Quick cmds:
```bash
pnpm test --filter a2a
pnpm test:coverage --filter orchestration
pnpm structure:validate
```
</details>

<details><summary><strong>17. Multi-Language (Rust/Python)</strong></summary>
Rust via CLI artifacts only; Python via MCP/CLI bridge; exchange JSON validated by Zod or file artifacts in `data/`; new capability: schema -> adapter -> round-trip test.
</details>

<details><summary><strong>18. Common Pitfalls & Avoidance</strong></summary>
- Deep Import Reach-Through: Importing `../otherFeature/infra/*` — use event or contract instead.
- Duplicate Schema Types: Re-declaring inline instead of importing from `libs/typescript/contracts`.
- Missing Optional Defaults: Adding optional field but not handling `undefined` in consumer (add safe fallback or default assignment).
- Premature Package Split: Creating new package for 1–2 files; extend existing until clear boundary emerges.
- Big-Bang Refactor: Deleting old path before consumer migration; follow Refactor Playbook.
- Unbounded Accumulation: Collecting full model output in array while also streaming; choose aggregate or stream pattern.
- Skipped Contract Test: Changing event shape without updating `contracts/tests/` -> hidden runtime break.
- Silent External API Drift: No Zod validation wrapper -> downstream handlers crash unpredictably.
</details>

---
If any rule conflicts upward authority, defer & document in PR description.
