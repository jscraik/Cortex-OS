# Agent Toolkit TDD & Integration Plan

> Version: 2025-09-23
> Status: Draft (Initial Inclusion of Recommended Consumer Locations)

## 1. Purpose

Establish a contract-first, test-driven implementation and consumption strategy for `packages/agent-toolkit` across runtime and auxiliary
packages (agents, kernel, prp-runner, cortex-sec, auth observers) while preserving architectural boundaries and ensuring maintainability
(function length < 40 lines, named exports only, event-driven decoupling).

## 2. Core Principles

1. Event-driven integration; no cross-feature reach-through imports.
2. Single toolkit initialization (kernel bootstrap) – all consumers access via accessor.
3. Contract-first schema evolution (Zod + tests) before code that emits or consumes new events.
4. Deterministic memory ID + tag conventions.
5. Functions < 40 lines; named exports only; async/await (no `.then` chains).
6. Observability (structured logs + optional spans) for each toolkit invocation.
7. Graceful degradation: toolkit failure never hard-crashes core auth or kernel startup unless explicitly gated.

## 3. Recommended Consumer Locations

| Concern | Best Location | Rationale |
|---------|---------------|-----------|
| User/session lifecycle enrichment | `apps/cortex-os/packages/<auth-observers>` (new feature) | Keeps domain events decoupled; can expand safely |
| Cross-feature orchestration / workflows | `packages/orchestration` | Central place for bus-bound handlers |
| MCP invocation / agent-side tools | `packages/agents` (MCP tool additions) | Already hosts agent-facing extensions |
| CI / validation automation | `scripts/` or Nx targets invoking toolkit | Keeps dev-time logic out of runtime |

### 3.1 Placement Notes

- Persistence adapters (e.g., `database-adapter.ts`) remain free of toolkit imports.
- Security scanning logic belongs in `cortex-sec` and uses toolkit search/context features rather than re-implementing heuristics.
- Pipelines (`prp-runner`) wrap toolkit calls for deterministic context snapshots.

## 4. Event Taxonomy (High-Level)

| Event Type | Producer | Key Fields (Data) | Core Consumers | Purpose |
|------------|----------|-------------------|----------------|---------|
| `user.created` | Auth service | `userId,email,name?` | auth-observers, agents | Trigger user profile context/memory enrichment |
| `session.created` | Auth service | `sessionId,userId,expires` | auth-observers, cortex-sec | Track session patterns / risk |
| `tool.run.completed` | agents | `toolName,durationMs,success,contextSummary?` | kernel (metrics), prp-runner, cortex-sec | Telemetry + context propagation |
| `context.enriched` (optional) | agents / prp-runner | `source,summary,budgetApplied` | analytics, memories | Decouple enrichment result from specific tool |
| `pipeline.run.requested` | kernel/orchestrator | `runId,pipelineName,params` | prp-runner | Start deterministic execution |
| `pipeline.run.completed` | prp-runner | `runId,status,contextDigest?,artifactRefs[]` | agents, cortex-sec | Traceability & downstream analyses |
| `security.scan.requested` | kernel / pipeline | `scanId,scope,reason` | cortex-sec | Begin scan workflow |
| `security.scan.completed` | cortex-sec | `scanId,status,findingCount,severityBreakdown,findingsDigest` | kernel, agents | Compliance gating & telemetry |
| `memory.upserted` (optional) | toolkit wrapper | `memoryId,tags[],kind` | analytics | Memory churn observability |

All new events require schema + positive & negative contract tests before producer merges.

## 5. Contract & Schema TDD Flow

1. Define Zod schema in `libs/typescript/contracts/<domain>/events.ts`.
2. Add contract tests (`contracts/tests/<event>.contract.test.ts`).
3. Add producing handler test (unit) with mocked bus.
4. Add E2E test (if cross-package impact) verifying envelope contents.
5. Only then implement runtime emission.

## 6. Initialization Strategy

```ts
// kernel/bootstrap/agent-toolkit.ts
import { createAgentToolkit } from '@cortex-os/agent-toolkit';
let singleton: ReturnType<typeof createAgentToolkit> | null = null;
export const getAgentToolkit = () => {
  if (!singleton) {
    singleton = createAgentToolkit({
      enableTreeSitter: process.env.TK_ENABLE_TS === '1',
      defaultTokenBudget: Number(process.env.TK_BUDGET ?? 3000),
    });
  }
  return singleton;
};
```

Consumers import only `getAgentToolkit`. Never instantiate ad hoc copies in production code.

## 7. Memory ID & Tag Conventions

| Purpose | ID Pattern | Required Tags |
|---------|------------|---------------|
| User profile | `user:<userId>:profile` | `auth,user,profile` |
| Run context | `run:<runId>:context` | `run,context` |
| Security scan | `security-scan:<scanId>` | `security,scan` |
| Tool result (optional) | `tool:<toolName>:<timestamp>` | `tool,telemetry` |
| Pipeline artifact index | `pipeline:<runId>:artifacts` | `pipeline,artifact` |

## 8. Testing Strategy Matrix

| Layer | Example Test | Goal |
|-------|--------------|------|
| Unit | `buildUserNote` returns deterministic string | Determinism |
| Contract | `tool.run.completed` missing field rejects | Schema gating |
| Integration | `user.created -> memory upsert` | Cross-component wiring |
| E2E | Pipeline run includes digest | Realistic flow |
| Security | Insecure snippet triggers finding | Rule efficacy |
| Performance | Large repo respects token budget | Resource control |

## 9. Failure Handling Guidelines

| Failure | Strategy |
|---------|----------|
| Toolkit init error | Log + retry once; mark feature flag disabled |
| Memory write error | Retry (exponential, capped); drop after N with warning |
| Search timeout | Abort controller + partial result summary |
| Event duplication | Idempotent memory IDs; optional hash comparison |
| Scan overload | Truncate findings, store digest, emit aggregated severity |

## 10. Observability & Telemetry

- Structured logs: `component=toolkit action=init`, `event=tool.run.completed`.
- Optional OpenTelemetry spans: `toolkit.context.build` (attributes: `budget.tokens`, `summary.length`).
- Metrics (future): counters for `tool_runs_total`, histogram for `tool_run_duration_ms`.

## 11. Phased Adoption Roadmap

| Phase | Scope | Exit Criterion |
|-------|-------|----------------|
| 1 | Toolkit init + user.created observer | Memory entry present, tests green |
| 2 | MCP tool wrappers + `tool.run.completed` events | Contract + integration tests pass |
| 3 | Pipeline context digest (prp-runner) | `pipeline.run.completed` includes digest |
| 4 | Security scan events + findings memory | Severity breakdown accurate |
| 5 | CI governance script (`toolkit:validate`) | Fails build on violations |
| 6 | Optimization (Tree-sitter, budgets) | 95% contexts under budget threshold |

## 12. Anti-Pattern Guardrails

| Anti-Pattern | Detection | Mitigation |
|--------------|----------|-----------|
| Multiple toolkit instances | Grep / runtime diagnostic log | Enforce accessor use in code review |
| Handler > 40 lines | CI codestyle check | Refactor into helpers |
| Direct `src/` deep import of toolkit internals | ESLint rule / custom script | Replace with public entrypoint |
| Untagged memory upserts | Add runtime assertion wrapper | Throw (dev) / log (prod) |
| Missing contract test for new event | PR checklist + CI | Block merge |

## 13. Example Observer Handler (User Profile)

```ts
import type { Envelope } from '@cortex-os/a2a-contracts';
import { getAgentToolkit } from '../../kernel/bootstrap/agent-toolkit';
export const onUserCreated = async (evt: Envelope<'user.created'>) => {
  const tk = getAgentToolkit();
  const text = `User onboarded: ${evt.data.userId} email=${evt.data.email}${evt.data.name ? ` name=${evt.data.name}` : ''}`;
  await tk.memories.upsert({
    id: `user:${evt.data.userId}:profile`,
    kind: 'profile',
    text,
    tags: ['auth','user','profile'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    provenance: { source: 'auth-observers' },
  });
};
```

## 14. Governance Scripts (Illustrative)

```jsonc
// package.json (root)
{
  "scripts": {
    "toolkit:validate": "node scripts/run-toolkit-validate.mjs"
  }
}
```

```js
// scripts/run-toolkit-validate.mjs
import { createAgentToolkit } from '@cortex-os/agent-toolkit';
const tk = createAgentToolkit();
const result = await tk.validateProject(['apps/**','packages/**']);
if (result.errors.length) {
  console.error('Toolkit validation failures:', result.errors);
  process.exit(1);
}
```

## 15. Success Criteria

| Category | Metric | Target |
|----------|--------|--------|
| Reliability | Toolkit init success rate | > 99% |
| Performance | Context build avg (mid-size repo) | < 1.5s |
| Memory Hygiene | Duplicate memory write rate | < 2% events |
| Security | Mean scan duration (scoped) | < 30s |
| Governance | Drift detection lead time | < 1 PR cycle |

## 16. Open Questions (Future Enhancements)

- Should `context.enriched` be always emitted or only when > threshold change? (Pending usage data)
- Introduce memory compaction / TTL? (Future performance concern)
- Add streaming context build for very large repositories? (Research needed)

## 17. Implementation Order (Actionable List)

1. Add contracts for new events.
2. Implement kernel accessor.
3. Add auth observer handler + tests.
4. Add MCP wrappers & emit `tool.run.completed`.
5. Integrate pipeline digest in prp-runner.
6. Add security scan wrapper and events.
7. Wire governance validation script.
8. Optimize & measure (Tree-sitter, budget metrics).

---
This document will evolve; update version/date header on any substantive change.
