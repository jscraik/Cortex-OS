# skills-registry-v1 — TDD Plan

**Slug**: `skills-registry-v1`
**Date**: 2025-10-18
**Testing Philosophy**: Red → Green → Refactor, coverage ≥ repo threshold, mutation ≥ baseline.

---

## 1. Scope of Testing

- `packages/skills-schema`: Zod schema validation, type inferences.
- `packages/skills-schema` loader & registry utilities.
- `packages/skills-lints`: CLI validation logic (unit) + smoke tests with fixtures.
- `packages/skills-observability`: MCP audit emission contract.
- CLI command and API endpoints (integration tests via Vitest + supertest).
- Orchestrator validation path (unit + integration style tests using registry doubles).

---

## 2. Red Stage (Write Failing Tests)

1. **Schema Contract**
   - Invalid semver versions should throw descriptive error (`AGENTS` branded message).
   - Missing required fields (e.g., `impl`, `inputs`) cause failure.
   - Deprecation metadata requires `sunsetDate` ≥ `deprecatedSince` (use fixed clock injection).
   - Inputs/outputs JSON schema round-trip preserved.

2. **Loader & Registry**
   - Loading directory with mixed valid/invalid skills rejects invalid file with path info.
   - Ordering is deterministic (alpha by name + version).
   - `validateInputs` fails when provided payload mismatches schema.
   - Registry resolves version ranges (e.g., `^1.2.0`).

3. **Lint CLI**
   - CLI exits `1` when encountering malformed front-matter.
   - Outputs JSON report when `--json` flag used.

4. **CLI Command (`cortex skills`)**
   - `list` prints table with all registered skills; snapshot structural JSON.
   - `describe` returns full metadata for `SendEmail` example.
   - `validate` fails when registry contains invalid skill.

5. **API Routes**
   - `GET /skills` returns paginated list with ETag header.
   - `GET /skills/:name` returns 404 for unknown skill.

6. **Orchestrator Integration**
   - Invoking deprecated skill emits warning & audit event.
   - Invalid inputs block invocation prior to execution.
   - Feature flag off bypasses registry (test ensures fallback path).

7. **Generated Catalogue Script**
   - Generates Markdown for each skill; includes last updated timestamp.

---

## 3. Green Stage (Implement Minimal Code)

- Implement schema, loader, CLI, API, orchestrator logic to satisfy failing tests.
- Ensure functions remain ≤40 lines; extract helpers as needed.
- Use dependency injection for clock/audit publisher to keep tests deterministic.

---

## 4. Refactor Stage

- Consolidate shared validation helpers.
- Improve error messages with brAInwav branding.
- Ensure types exported via `index.ts` for tree-shaking compatibility.
- Run formatting & linting.

---

## 5. Test Data & Fixtures

- Place Markdown fixtures under `packages/skills-schema/__tests__/fixtures/`.
- Provide canonical `SendEmail.md` plus invalid variants (missing fields, bad semver, deprecation mismatches).
- Use snapshots carefully; prefer JSON assertions for deterministic outputs.

---

## 6. Tooling & Commands

- `pnpm lint:smart`
- `pnpm typecheck:smart`
- `pnpm test:smart -- --coverage`
- Mutation testing per repo policy (check existing script; add new package filter if required).
- Security scans remain unchanged (`pnpm security:scan*`).

---

## 7. Evidence Capture

- Store red/green test outputs under `test-logs/` (timestamped filenames).
- Keep verification artifacts (coverage reports, lint results) under `verification/`.
- Link evidence paths in PR checklist.

