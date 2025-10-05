# NodeNext Toolchain Hardening Plan

**Author:** Codex (on behalf of brAInwav engineering)  
**Date:** 2025-10-05  
**Status:** Ready for execution (needs Migration Lead assignment)

## 1. Context & Problem Statement

Recent attempts to refresh coverage baselines (`pnpm baseline:refresh`) revealed a
widespread TypeScript configuration mismatch across many packages. Specifically,
several packages declare `module: "ESNext"` (or omit `module`) while
`moduleResolution` is set to `"NodeNext"`.

TypeScript 5.9+ enforces a correct pairing between `module` and
`moduleResolution`. This enforcement has caused multiple CI build tasks to fail
(e.g., `@cortex-os/mcp-core:build`, `asbr:build`). Additionally, the compiler
option `ignoreDeprecations: "6.0"` is no longer supported and must be
corrected or removed.

These issues block baseline refreshes, slow CI feedback, and can hide
downstream regressions in agent and MCP tooling.

## 2. Objectives

1. brAInwav Compliance: Align `module` and `moduleResolution` across TypeScript
   projects to match TypeScript 5.9+ expectations. If `ignoreDeprecations` is
   present, set it to a supported value (for example `"5.0"`) or remove it.
2. Stability: Apply minimal, reversible changes so Nx builds and Vitest suites
   run without TypeScript compiler errors for affected projects.
3. Baselines: Recover baseline artifacts (coverage, ops readiness, security
   reports) and make them reproducible via CI pipelines.
4. Traceability & Audit: Produce per-domain commits and validation logs and add
   an automated CI guard so the migration is auditable.

## 3. Scope

- **In:** All TypeScript configuration files under `apps/`, `packages/`,
  `libs/`, `services/`, `simple-tests/`, `tests/`, and `tools/`, plus any
  `tsconfig*.json` files at the repository root.
- **Out:** Non-TypeScript projects (for example, Python and Rust), feature work
  unrelated to TypeScript config, and unrelated dependency upgrades.

## 4. Key Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Hidden build assumptions on `ESNext` semantics | Runtime regressions | Audit changed packages and run targeted smoke tests (`pnpm dev <app>`). |
| Toolchain drift due to ad-hoc overrides | Re-emergence of mismatch | Add a validator script and CI check (section 5.5). |
| Large diff surface | Review fatigue | Batch changes by domain (core libs → services → apps). Use small PRs. |
| Out-of-date coverage artifacts | Quality gates fail | Refresh baselines immediately after successful builds. |

## 5. Workstreams & Tasks

### 5.1 Inventory & Planning (Day 0)

- Run discovery: `rg '"moduleResolution"\s*:\s*"NodeNext"' -g 'tsconfig*.json' -n`.
- Save results: `just scout '"moduleResolution": "NodeNext"' tsconfig` →
  `reports/planning/node-next-tsconfigs.txt`.
- Map affected files to Nx projects (use `pnpm nx graph --focus=<project>`) and
  identify package owners and a safe build order.

### 5.2 Config Migration (Days 1–2)

- For each matched `tsconfig*.json` where `moduleResolution` is `NodeNext`:
  - Add or update `"module": "NodeNext"` in the inheriting config. Prefer
    package-level or project-level edits over a repo-wide root change unless a
    domain-wide policy is required.
  - Replace `"ignoreDeprecations": "6.0"` with `"5.0"`, or remove the
    setting when a package does not require it.
  - For layered `tsconfig`s (those that `extends` another file), prefer
    updating the highest-level `tsconfig.base.json` that expresses domain
    policy. Only use per-package overrides when package semantics differ.
  - Preserve code style: use Biome (tabs, trailing commas) and run
    `pnpm biome format --write` after edits.

Implementation notes:

- Make small, per-domain commits so reviewers can validate behavior and files.
- Where a package requires a typing or ambient fix, add an inline
  `// brAInwav: migration-note` comment with a short rationale and the PR or
  task ID.

### 5.3 Build & Test Alignment (Days 2–3)

- Validate the environment: `pnpm install --frozen-lockfile` (expect only known
  optional-binary warnings).
- Build in domain order (start with core infra):
  1. `pnpm nx run-many --target=build --projects=@cortex-os/mcp-core,@cortex-os/protocol --nx-bail`
  2. Expand to the next groups of packages, using `--nx-parallel` only where
     CI runner memory permits.
- Run affected tests with coverage enabled: `pnpm nx affected --target=test --coverage --parallel=2`.
- Capture build and test logs to `reports/logs/migration/` for auditing.
- Address package-level compilation issues with minimal fixes and unit tests
  where relevant. Document these fixes with `// brAInwav:` comments linking to
  PRs or tasks.

### 5.4 Baseline Refresh & Validation (Day 4)

- Run baseline and validation commands:
  - `pnpm baseline:collect`
  - `pnpm baseline:refresh`
  - `pnpm test:smart -- --coverage`
  - `pnpm lint:smart` and `pnpm typecheck:smart`
- Store artifacts under `reports/baseline/`:
  - `coverage.json`
  - `ops-readiness.json`
  - any `reports/evals/*` produced during validation.
- Update the TDD record `tasks/cortex-os-&-cortex-py-tdd-plan.md` with phase
  status and links to validation logs.

### 5.5 Regression Guardrails (Day 5)

- Add a small validator script at `scripts/ci/validate-tsconfig.mjs` (Node ESM)
  that:
  - Scans the repository for `tsconfig*.json`.
  - Parses each file and asserts that when `moduleResolution` is `NodeNext`,
    `module` is also `NodeNext`.
  - Exits non-zero with a brAInwav-branded failure message and writes a
    concise report to `reports/logs/tsconfig-validator.txt`.
- Add a lightweight Vitest test at
  `packages/tooling/__tests__/tsconfig-validator.spec.ts` that mirrors the
  validator behavior for local verification.
- Add a CI job for the validator in the tooling pipeline: initially soft-fail
  (report-only) for 48 hours, then flip to strict-fail once teams have adapted.
- Document the policy and validator usage in `docs/development/tooling-guidelines.md`.

## 6. Validation Checklist (TDD-style)

- [ ] `pnpm install --frozen-lockfile` completes without TypeScript compilation
      errors for affected projects.
- [ ] `pnpm nx affected --target=build --all` (or scoped run-many sequence)
      completes for the changed domains without new TypeScript errors.
- [ ] `pnpm baseline:refresh` writes updated artifacts to `reports/baseline/`.
- [ ] Coverage meets the CODESTYLE.md minimum: >= 90% (line/branch) as shown
      in `reports/baseline/coverage.json`.
- [ ] `tasks/cortex-os-&-cortex-py-tdd-plan.md` Phase 0.2 updated with file
      references and validation evidence.
- [ ] PR(s) include per-domain validation logs, a brief brAInwav-branded
      summary, and a link to this plan.

## 7. Ownership & Roles

| Role | Responsibility |
| --- | --- |
| Migration Lead (to assign) | Coordinate batch updates, track blockers, and run final baseline refresh. |
| Package Owners | Resolve package-specific build/test regressions flagged during migration. |
| Tooling Engineer | Implement and maintain the CI validator; support rollouts. |
| QA / Verification | Spot-check key apps (Cortex-OS, MCP) post-migration. |

## 8. Timeline (Indicative)

- **Day 0 (Inventory):** Discovery, mapping to Nx projects, and owner assignment.
- **Days 1–2 (Migration):** Apply batched config edits per domain and open PRs.
- **Days 2–3 (Stabilization):** Resolve compilation issues and finalize tests.
- **Day 4 (Baseline):** Refresh baselines and collect artifacts.
- **Day 5 (Guardrails):** Merge validator and enable CI job (soft-fail then strict).

## 9. Dependencies & Pre-Requisites

- Access to Nx Cloud (or local caching) for efficient rebuilds.
- Coordination with teams that have long-running branches to avoid merge
  conflicts.
- Awareness of concurrent feature work that might also modify `tsconfig` files.

## 10. Communication Plan

- Kickoff: Post a brAInwav-branded kickoff note to `#brAInwav-engineering` with
  the plan link and assigned Migration Lead.
- Daily updates: Short status posts with the batch name, MR links, and
  blockers. Maintain an append-only timeline at
  `reports/planning/migration-updates.md`.
- Completion: Final brAInwav-branded summary with merged PR links, baseline
  artifacts, and validator script location. Include a rollback playbook for
  regressions detected within 48 hours.

---

### Implementation Checklist (atomic tasks)

- [ ] Run discovery: `rg '"moduleResolution"\s*:\s*"NodeNext"' -g 'tsconfig*.json' -n`
      and save results to `reports/planning/node-next-tsconfigs.txt`.
- [ ] Create migration branch: `feat(tooling): node-next tsconfig hardening`
      following brAInwav branch naming conventions.
- [ ] Update top-level and domain `tsconfig` files as described in section 5.2
      (batched commits per domain).
- [ ] Add `// brAInwav: migration-note` comments where package-specific ambient
      typing changes are applied.
- [ ] Add `packages/tooling/__tests__/tsconfig-validator.spec.ts` (Vitest) and
      `scripts/ci/validate-tsconfig.mjs` (Node ESM).
- [ ] Run domain builds and tests; collect logs into `reports/logs/migration/`.
- [ ] Refresh baselines and store artifacts in `reports/baseline/`.
- [ ] Merge validator script and add CI job (soft-fail first, strict after the
      adaptation window).
- [ ] Publish an announcement in `#brAInwav-engineering` and update
      `docs/development/tooling-guidelines.md`.

Note: Do NOT claim the migration is "production-ready" within PR descriptions
until a QA verification pass is completed and the brAInwav Migration Lead marks
this plan as verified.

This TDD-style plan follows brAInwav governance, includes the minimal required
automation and tests, and prescribes a low-friction rollout to prevent large
merge conflicts and regressions.
