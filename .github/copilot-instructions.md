# Cortex-OS AI Contributor Playbook

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

## 🔧 Agent Toolkit (MANDATORY)

The `packages/agent-toolkit` provides a **unified, contract-driven interface** for all development
operations. This toolkit is **REQUIRED** for maintaining monorepo uniformity and code quality.

## Local Memory

Proactively use local-memory MCP to store, retrieve, update, and analyze memories to maintain context and build expertise over time. Store key insights including lessons learned, architectural decisions, development strategies, and project outcomes. Use semantic search and relationship mapping to find relevant memories across all projects and sessions. This enables persistent knowledge across development sessions and enhances decision-making through historical context.

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

---

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
- External API/tool: extend MCP (`packages/cortex-mcp`).
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
Mnemonic: "Test → Code → Green → Clean → Tag (commit)".
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

<details><summary><strong>10A. Security Red Flags (Run Extra Scans)</strong></summary>
Trigger `pnpm security:scan:diff` + consider manual review when:
1. Network surface change (new fetch/http client, widened CORS, added socket/WS endpoint).
2. Dynamic code or shell execution introduced (`eval`, `Function`, child process spawning, template execution).
3. Persistence schema or serialization logic modified (possible injection / deserialization risk).
4. Secrets or credential handling touched (token parsing, auth headers, key rotation logic).
5. External API integration added/updated without existing Zod validation layer.
If ≥2 occur in one PR, add a short SECURITY NOTES block in description.
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
7. Version + backward-compat test if schema changed (see Section 15.3 Contract Versioning Rules)
Anti-pattern: big-bang rename.
</details>

<details><summary><strong>15. Minimal Event Checklist</strong></summary>
Name (past-tense / lifecycle); envelope core fields; lean data shape; add schema (AsyncAPI + Zod); round-trip + handler tests; optional new fields; propagate `traceparent`; add `correlation_id` if workflow; link in README.
</details>

<details><summary><strong>15.1 New Event JSON Template</strong></summary>
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

<details><summary><strong>15.2 Contract Test Scaffold (Example)</strong></summary>
```ts
// contracts/tests/task-created.contract.test.ts
import { z } from 'zod';
import { taskCreatedSchema } from '../../libs/typescript/contracts/tasks/events';
import { createEnvelope } from '@cortex-os/a2a-contracts/envelope';

describe('contract: task.created', () => {
  it('validates round-trip envelope', () => {
    const envelope = createEnvelope({
      type: 'task.created',
      source: 'urn:cortex:tasks',
      data: { taskId: 'task-123', priority: 'high' },
      traceparent: '00-11111111111111111111111111111111-2222222222222222-01'
    });

    // Validate envelope data against schema
    const parsed = taskCreatedSchema.parse(envelope.data);
    expect(parsed.taskId).toBe('task-123');
  });

  it('rejects missing required field', () => {
    const bad = { taskId: undefined } as any;
    expect(() => taskCreatedSchema.parse(bad)).toThrow();
  });
});
```
Notes:
- Keep schemas imported from central contracts.
- Negative test asserts strictness.
- Trace context included when part of workflow.
</details>

<details><summary><strong>15.3 Contract Versioning Rules</strong></summary>
Version (new major or explicit version tag) when:
- Removing a required field or changing its semantic meaning.
- Changing data type of an existing field (string -> object, enum narrowing, etc.).
- Splitting one event into multiple with different guarantees.
- Tightening validation (e.g., widening -> narrowing acceptable values) that could reject existing producers.
Do NOT version for:
- Adding optional fields (keep optional in schema).
- Documentation-only clarifications.
- Internal reordering or code refactors with identical schema.
Process:
1. Introduce new versioned schema alongside old (e.g., `task.created.v2`).
2. Mark old schema deprecated (comment + README note) but keep tests until zero consumers.
3. Add dual-parse compatibility test ensuring old still passes until removal milestone.
4. Communicate upgrade path (what changed + migration snippet).
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

<details><summary><strong>19. First PR (External Contributor) Quick Path</strong></summary>
1. Fork & clone; run `./scripts/dev-setup.sh` (or `--minimal`).
2. Pick a small issue (docs, test gap, minor fix). Avoid cross-boundary refactors initially.
3. Create branch: `feat/<short-descriptor>` (Conventional Commit style for first commit later).
4. Add/adjust failing test FIRST; confirm it fails.
5. Implement minimal fix/feature; keep changes < ~200 lines diff.
6. Run: `pnpm lint && pnpm test && pnpm structure:validate && pnpm security:scan:diff`.
7. Update README or relevant package docs if behavior changed.
8. Commit with Conventional Commit: `feat(xyz): short summary` (one focused commit preferred).
9. Open PR including: purpose, test plan (commands + outcome), risk notes, any follow-up TODOs.
10. Respond to review by amending new commits (avoid force push unless instructed).
Signal quality: green tests, no boundary violations, clear test plan, smallest viable change.
</details>

---
If any rule conflicts upward authority, defer & document in PR description.

<details><summary><strong>20. Glossary</strong></summary>

<strong>A2A</strong>: Application-to-Application event bus layer (`packages/a2a`) handling CloudEvent envelopes for decoupled feature communication.

<strong>MCP</strong>: Model Context Protocol; extension surface for exposing external tools/capabilities to the runtime. Add new external integrations by extending MCP rather than direct cross-feature calls.

<strong>Envelope</strong>: Standard CloudEvent wrapper produced via helper (e.g., `createEnvelope`) containing metadata (`type`, `source`, `id`, `time`, optional `traceparent`, `correlation_id`) plus validated `data` payload.

<strong>Contract</strong>: Canonical Zod schema + (optionally) AsyncAPI / JSON schema definition living in `libs/typescript/contracts` that defines stable cross-boundary data shapes (events, tool IO). Contract-first governs changes (see Section 15.3).

<strong>Feature Package</strong>: A cohesive domain capability mounted under `apps/cortex-os/packages/<feature>` following domain/app/infra layering; communicates outward only via events (A2A) or MCP tools.

<strong>Bus</strong>: Publish/subscribe abstraction in `packages/a2a` for emitting and handling CloudEvents; the sole mechanism for cross-feature domain communication (no direct imports across feature directories).

<strong>Handler</strong>: Function bound to one or more event types (via bus binding) executing a use-case in response to an event; should validate inputs and remain side-effect predictable.

<strong>Schema</strong>: Zod validator representing the runtime & compile-time contract for an event or tool payload; imported (never re-declared) by producers & consumers.

<strong>traceparent</strong>: W3C trace context header value propagated through events to correlate spans across async boundaries; include if part of a workflow or request chain.

<strong>correlation_id</strong>: Explicit workflow/request correlation token placed in the envelope when multi-step orchestration or request/response semantics require deterministic trace grouping beyond tracing infrastructure.

<strong>Versioned Event</strong>: A contract variant (e.g., `task.created.v2`) introduced when a breaking schema change occurs; old version retained until all consumers migrate (see Section 15.3).

<strong>Reach-Through Import</strong>: An import that violates layering or boundaries (e.g., feature A importing feature B's infra layer directly); replaced with event contract usage.

<strong>Streaming Mode</strong>: Output strategy controlling token emission vs aggregation (`--aggregate`, `--no-aggregate`, `--json`, etc.); resolved by precedence chain (CLI > env > config > internal).

<strong>Minimal Event Checklist</strong>: Governance list ensuring a new event is lean, validated, documented, and tested (see Section 15).

<strong>Playbook Consistency Check</strong>: Script (added separately) enforcing repository boundary rules (e.g., forbidding reach-through imports) to keep architecture sound.

</details>

## Local Memory (Persistent Context) Quickstart

Enable persistent agent memory using Local Memory. Auto-selected when `LOCAL_MEMORY_BASE_URL` is set, or explicitly via `MEMORIES_ADAPTER=local` (alias: `MEMORY_STORE=local`).

Env vars:

- `LOCAL_MEMORY_BASE_URL` (default `http://localhost:3002/api/v1`)
- `LOCAL_MEMORY_API_KEY` (optional)
- `LOCAL_MEMORY_NAMESPACE` (optional)
- `MEMORIES_ADAPTER` or `MEMORY_STORE` = `local | sqlite | prisma | memory`

Verify the service:

```bash
curl -sS http://localhost:3002/api/v1/health | jq .
```

Use in code:

```ts
import { createStoreFromEnv } from '@cortex-os/memories';

process.env.MEMORIES_ADAPTER = 'local';
process.env.LOCAL_MEMORY_BASE_URL = 'http://localhost:3002/api/v1';

const store = await createStoreFromEnv();
await store.upsert({
  id: 'demo-local',
  kind: 'note',
  text: 'Persistent memory via Local Memory',
  tags: ['demo'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  provenance: { source: 'system' },
});
```

## Development Patterns to Avoid

### NEVER Continue These Anti-Patterns:
1. **Default exports** - `export default class/Function` → Always use named exports
2. **Function length > 40 lines** → Immediately split into smaller functions
3. **`.then()` chains** → Use `async/await` exclusively
4. **Classes without framework requirement** → Use functional composition
5. **Missing `composite: true`** → All packages require this setting
6. **Direct sibling package imports** → Use events/contracts instead
7. **Bypassing local memory** → Store all development insights persistently

### Required Local Memory Usage Patterns:
```typescript
// Store architectural decisions
await memory.store({
  content: 'Event-driven architecture over direct imports for decoupling',
  importance: 9,
  tags: ['architecture', 'decision', 'a2a'],
  domain: 'software-design'
});

// Store development lessons
await memory.store({
  content: '40-line function limit improves code maintainability and readability',
  importance: 8,
  tags: ['lesson', 'codestyle', 'maintainability'],
  domain: 'development-patterns'
});

// Store technical strategies
await memory.store({
  content: 'Named exports enable better debugging and tree-shaking optimization',
  importance: 7,
  tags: ['typescript', 'exports', 'optimization'],
  domain: 'frontend-architecture'
});
```

### Mandatory Local Memory for Development:
- **Store all architectural decisions** with reasoning and context
- **Document lessons learned** from code reviews and refactoring
- **Track effective development strategies** for future reference
- **Maintain persistent context** across development sessions
- **Use semantic search** to find relevant past decisions

## Agent Toolkit

Utilize `agent-toolkit/tools` for searches, codemods, diff review and validations. Run `just scout` and `tools/run_validators.sh` before commits.
