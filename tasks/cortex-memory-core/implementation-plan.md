# Cortex Memory Core — Implementation Plan

- **Slug:** `cortex-memory-core`
- **Created:** 2025-10-18 (Europe/London)
- **Author:** GPT-5-Codex (assistant) for brAInwav Cortex-OS
- **Scope:** Ship `/v1/memory/snapshots` and `/v1/memory/search` across the Cortex-OS monorepo with idempotent persistence, signature verification, policy enforcement (OPA/Rego), hybrid search (tsvector + pgvector, MMR-ready), observability hooks, accessibility CI gates, and CI evidence aligned with the brAInwav Constitution and CODESTYLE.
- **Standards:** Tests-first workflow, named exports only, WCAG 2.2 AA for any UI work, ≥90% aspirational coverage, Conventional Commits.

## 0. Bootstrap & Directories
- Created task workspace at `tasks/cortex-memory-core/` with governance-aligned structure.
- Initial evidence directories recorded (empty directories tracked via `.gitkeep`):
  - `logs/` — `research/`, `wikidata/`, `arxiv/`, `vibe-check/`
  - `verification/`, `validation/`, `test-logs/`
- Logged connectors health status at `logs/research/connectors-health.log` (`2025-10-18T00:00:00Z not applicable - MCP connectors out of scope`).
- Freshness guard satisfied with ISO-8601 timestamps.

## 1. File Tree Impact (Repo + Task Artifacts)
```
apps/memory-core/src/app.ts                     (NEW)
apps/memory-core/src/rest/snapshots.controller.ts (NEW)
apps/memory-core/src/rest/search.controller.ts    (NEW)
apps/memory-core/src/rest/openapi.ts              (NEW)
apps/memory-core/src/services/signature.verify.ts (NEW)
apps/memory-core/src/services/policy.ts           (NEW)
apps/memory-core/src/services/index.ts            (NEW)
apps/memory-core/src/domain/snapshot.ts           (NEW)
apps/memory-core/src/sql/migrations/*             (NEW)
apps/memory-core/test/**/*.test.ts                (NEW)
packages/asbr-schemas/src/memory/snapshot.schema.ts (UPDATE)
apps/cortex-os/packages/mcp-bridge/src/tools/snapshot.ts (NEW)
apps/cortex-os/packages/mcp-bridge/src/util/sign.ts     (NEW)
policies/mem_snapshot.rego                        (NEW)
scripts/a11y-ci.ts                                (NEW)
```
Task artifacts produced in this workspace:
```
implementation-plan.md
implementation-checklist.md
tdd-plan.md
json/concurrency-report.json
json/baton.v1.json
logs/* (see §0)
SUMMARY.md
```

## 2. Bite-Sized Tasks (Revertible)
1. **Task 1 — DB migrations & models**  
   Create `memories`, `memory_facets`, and `mem_graph` tables with `tsvector` and `pgvector` indexes, uniqueness on `payload_hash`, and tenant RLS. Validate with `pnpm db:migrate` and `pnpm db:test-seed`.  
   _Backout:_ revert migration pair.  
   _Commit:_ `feat(memory-core): init tables, indexes, RLS and uniqueness on payload_hash`.
2. **Task 2 — HTTP service skeleton + OpenAPI**  
   Bootstrap Fastify app, register `/v1/memory/snapshots` and `/v1/memory/search`, wire OpenAPI 3.0.3 validators, parse optional `Idempotency-Key`. Health check response: `[brAInwav] healthy`.  
   _Backout:_ remove app bootstrap files.  
   _Commit:_ `feat(memory-core): bootstrap app and OpenAPI schemas`. (Parallel with Task 1.)
3. **Task 3 — Signature verify, policies, snapshot persistence**  
   Implement Ed25519 and Sigstore verification, a11y + classification policies (OPA/Rego + `scripts/a11y-ci.ts`), and `saveSnapshot` with idempotency + dedupe. Wire controller flow `verifySig → enforcePolicies → saveSnapshot → indexSnapshot`.  
   _Backout:_ revert service/domain changes.  
   _Commit:_ `feat(memory-core): add signature verify, policy gates, idempotent persistence`.
4. **Task 4 — Indexers & Search (Hybrid + MMR-ready)**  
   Build keyword (`ts_rank_cd`) and vector scoring, unify candidates, apply α/β/γ/δ weighting with freshness decay, and greedy MMR diversification. Respect pending vector facets.  
   _Commit:_ `feat(memory-core): hybrid search and indexing with freshness/importance decay`. (Runs after Task 1; parallel-safe otherwise.)
5. **Task 5 — Tests (TDD, security gates)**  
   Execute red-green-refactor loop covering unit/integration/e2e/security cases, hitting coverage ≥ repo threshold and targeting ≥90%. Include Semgrep + Gitleaks hooks and mutation scaffolding.  
   _Commit:_ `test(memory-core): unit, integration, e2e, security tests; coverage thresholds`.
6. **Task 6 — MCP bridge tool + signing utility**  
   Implement `signSnapshot` (Ed25519-first, env-configurable) and MCP tool `cortex.snapshot.save` using deterministic idempotency keys. Validate via e2e harness.  
   _Commit:_ `feat(mcp): cortex.snapshot.save tool + signSnapshot util`.

## 3. Concurrency & Scheduling
- Parallelizable: Tasks 1, 2, 4, 6.  
- Serial: Tasks 3, 5.  
- Suggested order: 1 → 2 → 3 → 4 → 5 → 6.  
- Limit max 2 jobs in parallel to reduce migration contention.  
- Relevant labels: `pgvector`, `opa`, `fastify`.

## 4. Technical Rationale
- **Idempotency via content hash** prevents duplicate snapshots on retries and feeds unique index constraints.  
- **Hybrid ranking** combines lexical precision (`tsvector`) with semantic recall (`pgvector`) and MMR diversification to avoid redundant responses.  
- **RLS** enforces tenant isolation with `current_setting('app.tenant_id')`.  
- **A11y gating** ensures WCAG 2.2 AA compliance at ingest rather than downstream review.  
- **Sigstore-ready verification** future-proofs attestations beyond Ed25519 keys.  
- **Tests-first** reduces regressions; mutation testing focuses on high-risk paths.  
- **Observability hooks** ensure brAInwav branding and traceability in logs/metrics.

## 5. Dependencies & Config
- **External:** PostgreSQL with `pgvector`, optional OPA (HTTP), Sigstore libraries.  
- **Internal:** `@asbr-schemas` updates for snapshot schema parity, MCP bridge integration.  
- **Environment:** `SNAPSHOT_SIG_ALG`, `SNAPSHOT_ED25519_KEY_PEM`, `APP_TENANT_ID`, `MEMORY_CORE_URL`, `MEMORY_CORE_TOKEN`.  
- **Tooling:** `pnpm` (frozen lockfile), Fastify, OpenAPI tooling, Semgrep, Gitleaks.

## 6. Risks & Mitigations
- **Vector latency** → mark `facets.pending=["vector"]` and schedule async backfills.  
- **Policy false positives** → return `422 A11Y_FAIL` with detailed messages; allow audited override only.  
- **Idempotency races** → rely on unique `payload_hash` and retry on conflict.  
- **Cross-tenant leakage** → strict RLS plus namespace-aware key IDs.  
- **Signature spoofing** → constant-time comparisons, rotate keys, support Sigstore bundles.  
- **Ranking regressions** → maintain snapshot tests for top-k order.

## 7. Testing & Validation Strategy
- **Commands:** `pnpm test:smart -- --coverage`, `pnpm security:scan`, `pnpm security:scan:gitleaks`, `pnpm mcore:e2e`.  
- **Coverage:** ≥ repo thresholds, aspire to ≥90% statements/branches/functions/lines; mutation ≥75%.  
- **Fixtures:** deterministic clock, stubbed embedder vectors, JWKS/KMS mocks, OPA decision stubs.  
- **Case matrix:** happy path ingestion, missing alt text rejection, classification enforcement, idempotent duplicates, freshness boundary, concurrent inserts.

## 8. Rollout / Migration Plan
- Gate by `MEM_CORE_ENABLE=true`.  
- Launch with keyword search; enable vectors post-backfill.  
- Backfill embeddings in batches.  
- Rollback by disabling flag and reverting writes; search remains off.  
- Post-stability tighten vector thresholds and prune near duplicates.

## 9. Oversight & Governance
- **Oversight vibe_check:** waived until repository CLI exists; waiver recorded here (Waiver ID `VIBE-2025-10-18-01`, rule `AGENTS-PRV-002`, approver pending maintainer confirmation).  
- Evidence map maintained in `SUMMARY.md`.  
- No additional waivers requested.

## 10. Completion Criteria
- Implementation, TDD plan, checklist, concurrency report, and baton artifacts committed.  
- Tests & coverage passing per CODESTYLE.  
- `SUMMARY.md` references evidence & waivers.  
- Governance hooks satisfied: OpenAPI published, accessibility gates enforced, observability includes `brAInwav` branding.

