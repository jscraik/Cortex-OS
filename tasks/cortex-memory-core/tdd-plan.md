# Cortex Memory Core — TDD Plan

- **Slug:** `cortex-memory-core`
- **Created:** 2025-10-18 (Europe/London)
- **Mandate:** Follow brAInwav CODESTYLE tests-first flow with Red → Green → Refactor cycles for every capability delivered under `/v1/memory/snapshots` and `/v1/memory/search`.

## 1. Targets & Coverage
- Target ≥90% statements/branches/functions/lines across touched packages; meet repo minimums in CI.
- Mutation coverage goal ≥75% for high-risk modules (`signature.verify`, `policy`, `index`, `snapshot` domain). Integrate with existing mutation testing harness per CODESTYLE.
- Enforce deterministic clocks, seeds, and mock responses to avoid flaky behaviour.

## 2. Test Suites
### Unit Tests
- `verifySig` rejects modified payloads (`400 BAD_SIGNATURE`) and unsupported `signature_alg`.
- `enforcePolicies` rejects:
  - `retention.ttl_days` missing or >365.
  - `image/*` artifacts without meaningful `alt` text.
  - Diagram/chart artifacts missing `sr_note`.
  - `classification === "restricted"` without `retention.encrypted` truthy.
- `saveSnapshot` returns existing `memory_id` when presented with the same `Idempotency-Key` or `payload_hash`.

### Integration Tests
- Database snapshot insert populates `memories`, `memory_facets`, and `mem_graph` rows with generated `tsv` and optional vector embedding (or flags pending vector work).
- Concurrent duplicate inserts collide on the unique `payload_hash` without creating extra rows.
- `/v1/memory/search` returns results filtered by `tenant_id` and respects keyword (`plainto_tsquery`) and thread boosting.

### E2E Tests
- MCP bridge tool `cortex.snapshot.save` signs payload, POSTs snapshot, and retrieves it through `/v1/memory/search`.
- Health endpoint responds with `[brAInwav] healthy` once services are wired.

### Security & Accessibility Gates
- Run `pnpm security:scan` and `pnpm security:scan:gitleaks` as part of CI matrix; failures block merges.
- A11y CI lint (`scripts/a11y-ci.ts`) exercised via tests ensuring errors/warnings propagate.
- Semgrep rule verifying no unsafe base64 decoding inside memory ingestion.

## 3. Tooling & Commands
- `pnpm test:smart -- --coverage`
- `pnpm test:smart --filter memory-core -- --runInBand` (for deterministic DB runs)
- `pnpm security:scan`
- `pnpm security:scan:gitleaks`
- `pnpm mcore:e2e`

## 4. Evidence & Reporting
- Store coverage reports under `tasks/cortex-memory-core/test-logs/`.
- Archive failing snapshots (if any) under `validation/` and final verification artefacts in `verification/`.
- Update `SUMMARY.md` with links to coverage, security scans, and waivers (if required).

## 5. Exit Criteria
- All planned tests exist and pass locally and in CI.
- Coverage/Mutation thresholds achieved (evidence captured in `test-logs/`).
- Regression watch list created for hybrid ranking order (snapshot test).  
- Any deviations documented with waivers referencing Constitution rule IDs.

