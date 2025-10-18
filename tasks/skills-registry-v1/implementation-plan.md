# skills-registry-v1 — Implementation Plan

**Slug**: `skills-registry-v1`
**Prepared for**: brAInwav Cortex-OS Skills Program
**Prepared by**: repo automation agent
**Date**: 2025-10-18 (ISO 8601)
**Governance Alignment**: Constitution, CODESTYLE, Agentic Coding Workflow

---

## 0. PrefLight & Governance Notes

- **Time Freshness Guard**: Repository context did not include `/.cortex/rules/_time-freshness.md`. Waiver recorded in this plan; all dates use explicit ISO-8601 stamps.
- **Connectors Health**: Pending — curl checks to be executed during implementation; results will be stored under `logs/research/` with brAInwav branding. Capture waiver if network access fails.
- **Oversight Vibe Check**: Schedule `pnpm oversight:vibe-check --goal "skills-registry-v1: draft plan" --plan "repo→memory→wikidata→arxiv→finalize" --session <id>` and persist output to `logs/vibe-check/initial.json`. Repeat for final review.
- **Baton Updates (to perform after plan approval)**:
  - `planner.plan_paths`: map to `implementation-plan.md`, `tdd-plan.md`, `implementation-checklist.md`, `summary.md` inside the task directory.
  - `planner.file_tree`: include paths enumerated in §1.
  - `planner.commands`: `{ install: "pnpm i", lint: "pnpm lint:smart", typecheck: "pnpm typecheck:smart", test: "pnpm test:smart -- --coverage" }`.
  - `planner.coverage_target`: "≥ repo threshold".
  - `planner.conventional_commits`: `true`.
  - `parallel.concurrency_report`: `json/concurrency-report.json`.
  - Evidence bundle: connectors health logs, repo notes, memory findings, Wikidata / arXiv research summaries, citations for governance references.

---

## 1. File & Package Impact

### New Directories & Packages
- `packages/skills-schema/`
  - `src/index.ts`
  - `src/registry.ts`
  - `src/fs-loader.ts`
  - `__tests__/` fixtures & unit tests
- `packages/skills-observability/`
  - `src/audit.ts`
- `packages/skills-lints/`
  - `rules/skills-frontmatter.schema.json`
  - `bin/skills-lint.mjs`
- `apps/cli/src/commands/skills.ts`
- `apps/api/src/routes/skills.ts`
- `docs/adr/ADR-00xx-skills-registry-v1.md`
- `skills/README.md` (major revision with schema guidance)
- `skills/examples/SendEmail.md`
- `project-documentation/skills-catalog/` (generated artifacts)
- `tasks/skills-registry-v1/**` (this task’s artifacts)

### Updates to Existing Files
- `packages/orchestrator/src/invoke.ts`
- `packages/agent-toolkit/**`
- `.github/workflows/ci.yml`
- Existing skills governance docs reference to new registry (skills directory status docs).

### Feature Flag
- `CORTEX_SKILLS_REGISTRY_V1` will gate orchestrator enforcement until rollout is complete.

---

## 2. Implementation Breakdown (TDD-first)

### Task 1 — Architecture Decision Record (ADR)
- Author `docs/adr/ADR-00xx-skills-registry-v1.md` documenting motivation, options, final decision, and consequences.
- Cite Constitution, CODESTYLE, Skills governance.
- Commit: `docs: adr for skills registry v1`.

### Task 2 — `skills-schema` Package (Zod Contract)
- Create `SkillMetadata` schema with required fields: `name`, `version` (semver), `category`, `description`, `impl`, `inputs`, `outputs`, `preconditions`, `sideEffects`, `estimatedCost`, optional deprecation metadata, `calls`, `requiresContext`, `providesContext`, `monitoring`, optional `i18n`.
- Author tests first (`__tests__/schema.test.ts`), covering invalid front-matter, semver enforcement, schema round-trips, deprecation parsing.
- Commit: `feat(skills-schema): add SkillMetadata zod schema with tests`.

### Task 3 — Loader & Registry
- Implement filesystem loader `loadSkills({ root = "skills" })` parsing Markdown front-matter using YAML/gray-matter.
- Build in-memory `SkillRegistry` with `list`, `get`, `has`, `validateInputs` helpers and deterministic ordering.
- Tests: fixtures for valid/invalid skills, deprecation, localization; ensure branded errors.
- Commit: `feat(skills-schema): fs loader and in-memory registry with validation`.

### Task 4 — Authoring Guide & Canonical Example
- Revise `skills/README.md` with schema-aligned guidance and refer to registry validation.
- Add `skills/examples/SendEmail.md` with sample front-matter + body.
- Commit: `docs(skills): authoring guide and canonical example`.

### Task 5 — Lint & CI Enforcement
- Mirror schema via JSON Schema definition in `packages/skills-lints` and implement CLI `skills-lint.mjs`.
- Update `.github/workflows/ci.yml` to run lint prior to tests and enforce mutation/coverage thresholds.
- Commit: `ci(skills): add front-matter linter and schema checks to CI`.

### Task 6 — CLI Enhancements
- Add `cortex skills {list, describe, validate}` command under `apps/cli`.
- Provide branded output, JSON option for automation, exit non-zero on validation failure.
- Unit tests for CLI utilities.
- Commit: `feat(cli): add cortex skills {list,describe,validate}`.

### Task 7 — API Endpoints
- Expose `GET /skills` and `GET /skills/:name` routes in `apps/api`.
- Include ETag, rate-limiting, OpenAPI documentation.
- Commit: `feat(api): skills read-only endpoints`.

### Task 8 — Orchestrator Integration & Observability (serial)
- Wrap `invokeSkill` to consult registry, validate inputs, respect `CORTEX_SKILLS_REGISTRY_V1` feature flag.
- Emit MCP audit events via new `skills-observability` package.
- Tests verifying validation failures, deprecation warnings, audit emission.
- Commit: `feat(orchestrator): registry-backed invocation + MCP audit`.

### Task 9 — Generated Skills Catalogue
- Author script to render Markdown/JSON catalogue under `project-documentation/skills-catalog/`.
- Document script usage; ensure CI treat artifacts as generated docs (non-blocking).
- Commit: `docs(skills): generated skills catalogue (read-only)`.

### Task 10 — CI Gates & Coverage (serial)
- Ensure `.github/workflows/ci.yml` orchestrates lint → build → typecheck → test (with coverage badge) → mutation → security scans.
- Confirm skills packages participate in coverage thresholds.
- Commit: `ci: wire skills jobs into pipeline`.

---

## 3. Concurrency Strategy
- Parallel tasks: {1,2,3,4,5,6,7,9}
- Serial tasks: {8,10}
- Suggested order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 9 → 8 → 10
- Limit concurrency to 4 jobs to respect CI resource allocation.
- Tag tasks with capabilities: `ts`, `node`, `docs`, `api`, `cli`.

---

## 4. Risks & Mitigations
- **Schema drift**: Enforce via orchestrator validation + CI lint (`skills-lint`).
- **Loader performance**: Cache parsed metadata; schedule optimization story if registry grows past 1k skills.
- **Deprecation confusion**: Provide CLI warnings and `supersededBy` guidance.
- **Observability gaps**: Audit publisher is mandatory in invoke path; tests assert emission.

---

## 5. Testing & Validation Gates
- Automated commands: `pnpm lint:smart`, `pnpm typecheck:smart`, `pnpm test:smart -- --coverage`, `pnpm security:scan`, `pnpm security:scan:gitleaks`, `pnpm test:security`.
- Mutation threshold: adhere to repo standard; prefer ≥90% for new packages.
- Manual QA: run `pnpm --filter cortex-cli exec -- cortex skills list`, `curl http://localhost:<port>/skills`, observe branded output.
- Capture test logs under `test-logs/`, verification artifacts under `verification/`.

---

## 6. Rollout Plan
- Implement behind `CORTEX_SKILLS_REGISTRY_V1` flag.
- Enable flag in staging after Tasks 1–7 & 9 complete; monitor audit logs.
- Address non-conforming skills; enable flag in production post validation.
- Update `.github/instructions/memories.instructions.md` and memory MCP entries with final decisions.

---

## 7. Completion Criteria
- Task directory contains: `implementation-plan.md`, `tdd-plan.md`, `implementation-checklist.md`, `summary.md`, `json/concurrency-report.json`, evidence logs.
- ADR merged; CI passing with new gates.
- Registry-backed orchestrator live with feature flag default `on` in staging.
- Skills catalogue generated and documented.
- All waivers documented under `/.cortex/waivers/` if required.

