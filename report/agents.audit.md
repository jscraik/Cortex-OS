# @cortex-os/agents Audit (Aug 2025)

## Architecture (20)
- **Strengths:** Hexagonal layout with ports/adapters keeps domain isolated.
- **Gaps:** Placeholder index exposes no public API, hindering integration. No formal dependency graph or boundary checks.
- **Findings:**
  - Minimal AgentError taxonomy, lacks categories or hierarchy【F:apps/cortex-os/packages/agents/src/errors.ts†L1-L6】
  - Timeout middleware has no cancellation or retry support【F:apps/cortex-os/packages/agents/src/service/Middleware.ts†L8-L18】

## Reliability (20)
- Single timeout middleware; no retries/backoff/cancellation.
- Executor does not guard against agent.act failures or partial plans【F:apps/cortex-os/packages/agents/src/service/executor.ts†L7-L33】
- No structured error codes beyond TIMEOUT/BUDGET_EXHAUSTED.

## Security (20)
- Policy layer is stubbed (`allowAll`) with no enforcement【F:apps/cortex-os/packages/agents/src/domain/policies.ts†L1-L9】
- HttpTool forwards requests without auth, rate limiting, or input sanitisation【F:apps/cortex-os/packages/agents/src/adapters/tools/tool.http.ts†L3-L20】
- MemoriesTool executes arbitrary methods without schema validation【F:apps/cortex-os/packages/agents/src/adapters/tools/tool.memories.ts†L4-L17】

## Evaluation (20)
- Vitest tests exist but coverage run fails: `Cannot find package 'vitest'`
- No regression datasets or seeded evaluation harness.

## Data Handling (10)
- Task schema defines budgets but no PII redaction or telemetry schema【F:apps/cortex-os/packages/agents/src/schemas/task.zod.ts†L3-L16】
- No logging redaction or data retention policy.

## Code Style (10)
- ESM-only, types present, functions <40 lines.
- Reusable utilities not centralized under `src/lib/`.

## Documentation (10)
- README provides basic usage and scripts【F:apps/cortex-os/packages/agents/README.md†L1-L31】
- Missing ADR links, policy references, and examples for tool binding and safety rails.

## Accessibility (10)
- No CLI/UI outputs in package; test scripts rely on console logs without labels.
- Snapshot/golden outputs not encoded with a11y metadata.

## Current Readiness Score
| Area | Score |
|------|------|
| Architecture | 12/20 |
| Reliability | 6/20 |
| Security | 5/20 |
| Evaluation | 4/20 |
| Data | 2/10 |
| Code Style | 6/10 |
| Documentation | 4/10 |
| Accessibility | 2/10 |
| **Total** | **41/100** |

## TDD Remediation Plan
1. **Unit tests**
   - Decision policies reject unauthorised contexts.
   - Tool selection and fallback for missing tools.
2. **Integration tests**
   - Stubbed MemoryService and HTTP responses with deterministic seeds.
3. **Golden tests**
   - Snapshot agent prompts/templates with diffing.
4. **Contract tests**
   - Validate Agent, Tool, Planner interfaces under `libs/typescript/contracts`.
5. **Coverage Target**
   - >80% lines/branches via `pnpm test:coverage` once deps installed.

## Fix Plan (ordered)
1. **Public API & Error Taxonomy**
   - Expose explicit exports and enum error codes.
   - *Acceptance:* new `index.ts` re-exports domain/services; `AgentError` uses enum.
2. **Policy Enforcement Middleware**
   - Inject policy checks before executor.
   - *Acceptance:* failing policy yields `AUTHZ_DENIED`.
3. **HttpTool Hardening**
   - Add input validation, timeout, and auth header support.
   - *Acceptance:* unit tests simulate 429 & timeout paths.
4. **Retry/Backoff Utility**
   - Wrap tool calls with exponential backoff.
   - *Acceptance:* middleware retries up to 3 times with jitter.
5. **Telemetry & PII Redaction**
   - Central logger with redaction patterns.
   - *Acceptance:* logs omit task.input when `tags` contains `pii`.
6. **Eval Harness**
   - Add seeded regression dataset and reporting scripts.
   - *Acceptance:* `pnpm test:eval --seed 42` reproducibly scores agents.
7. **Docs & A11y**
   - Expand README with ADR links, usage examples, and screen-reader notes.
   - *Acceptance:* `axe` reports 0 serious issues on examples.

## Test Coverage Summary
Tests failed to run due to missing `vitest`; coverage unavailable

## Commands
- Install deps: `pnpm install`
- Lint: `pnpm lint`
- Tests w/ coverage: `pnpm test:coverage`

