---
mode: agent
---
<!--
file_path: ".github/prompts/enforce-areas-of-improvement.md"
description: "Strict CI enforcement prompt for Areas of Improvement and quality gates"
maintainer: "@jamiescottcraik"
last_updated: "2025-08-12"
version: "1.0.0"
status: "active"
-->

# Strict Enforcement: Areas of Improvement

This prompt defines mandatory CI quality gates and the enforcement stance for Areas of Improvement.
It is designed for pnpm + Turborepo monorepo projects within Cortex OS.

## Purpose

- Enforce high signal fixes and prevent regressions.
- Create auditable, repeatable gates across `apps/*` and `packages/*`.
- Keep external vendor code out of gates to reduce noise while still tracking risk.

## Scope and Strictness

- Mode: strict (no baselining, no auto-approve of existing issues).
- Target: `apps/**`, `packages/**`.
- Temporary exclusion: `external/**`, `vendor/**` (read-only monitoring allowed).
- PRs must satisfy all gates before merge; no bypass flags or skip hooks.

## Required CI Gates

1. Tests and Coverage (Vitest orchestrator)

- Must run successfully across workspace.
- Coverage reporters enabled: text-summary, json-summary.
- Thresholds: global lines ≥ 90%, changed lines ≥ 95% (ratchet-only upward).

1. Linting and Formatting

- ESLint + Prettier for TS/JS; Ruff for Python (where present).
- markdownlint for Markdown.

1. Security and Secrets

- SAST: Semgrep only (blocking) until GHAS/CodeQL is enabled.
- Secrets: gitleaks (blocking).
- OSV scan for dependencies (non-blocking report during initial rollout).

1. Accessibility (where applicable)

- Playwright a11y or jest-axe: zero critical violations on changed components and pages.

4. Accessibility (where applicable)

- Playwright a11y or jest-axe: zero critical violations on changed components and pages.

5. License/Policy Checks

- SPDX/SBOM present for releases; license policy violations block.

## Temporary Exclusions

- `external/**` and `vendor/**` excluded from blocking gates.
- Still permissible to run read-only scans and publish reports for awareness.

## Failure Handling

- Never bypass with `--no-verify`, `HUSKY_SKIP_HOOKS`, or similar.
- Fix root cause, re-run gates locally, then commit normally.
- If noisy/faulty rules are encountered, file a follow-up to adjust rules, not to disable gates.

## Rollout Notes

- Current thresholds: 90% global and 95% changed; ratchet up based on stable signal.
- Prefer small PRs; if a PR exceeds ~400 changed non-generated LOC, request a split.

## Success Criteria

- All checks pass on PRs to main.
- No regressions introduced; changed-line coverage ≥ 95%.
- Semgrep and gitleaks produce clean results for in-scope paths.

## References

- Code Review Standards: `.github/instructions/copilot-codeReview.instructions.md`
- Test Generation Standards: `.github/instructions/copilot-testGeneration.instructions.md`
- Markdown Standards: `.github/instructions/copilot-markdown.instructions.md`
- Quality Gate Rules: `.github/instructions/copilot-qualityGates.instructions.md`

## Enforcement: Areas of Improvement (Strict)

## Objective

- Implement and enforce Areas of Improvement across the repo.
- Detect gaps, scaffold missing controls, wire CI gates, and block merges on violations.

## Inputs

- REPO_URL: <https://github.com/jamiescottcraik/cortex-os>
- TARGETS: ["apps/*","packages/*"]
- EXCLUDES: ["external/**"] # temporary vendor exclusion
- PACKAGE_TYPES: cli|lib|ui|service (auto-detect via package.json["cortex:type"])
- NODE_VERSION: ">=20.11"
- COVERAGE_GLOBAL: 90
- COVERAGE_CHANGED: 95
- SEVERITIES_BLOCK: { "semgrep":"ERROR", "codeql":"DISABLED", "osv":"DISABLED", "gitleaks":"ANY" }
- A11Y_LEVEL: "WCAG 2.2 AA"
- TIMEOUT_BUDGET_MS: 5000
- SIZE_BUDGET_KB: 3500

Note:

- Source of truth for coverage thresholds is COVERAGE_GLOBAL and COVERAGE_CHANGED above. Vitest configuration and CI jobs must enforce these values to avoid drift.

## Scope

- Modify only infra, CI, scaffolds, and required per-package files. No business features.
- Add missing configs, tests, and docs; do not remove code unless a check prescribes it.
- Strict rollout from day one. No baselining or temporary coverage downgrades.

## Assumptions

- CI: GitHub Actions.
- GHAS/CodeQL: not enabled yet; Semgrep Code (blocking) used until GHAS is available.
- pnpm workspace + turbo present; tests use Vitest with v8 coverage.
- Playwright and/or jest-axe available for a11y tests.

## Enforcement Domains

1. Supply chain and provenance
   - SBOM per package (Syft) → sbom/syft-<pkg>.spdx.json
   - SLSA provenance attestation per build (Cosign/gha-provenance) → build/provenance.json
   - Lockfile integrity; corepack-pinned pnpm; Node pinned via .tool-versions and .nvmrc

2. Security scanning
   - Semgrep Code (blocking at ERROR) as primary SAST
   - OSV scanner (report-only during initial rollout), gitleaks (block ANY)
   - scripts/ci/no-secrets.sh denylist complementing gitleaks

3. Releases and versions
   - Changesets required for user-facing changes
   - Conventional Commits + commitlint gate

4. Docs and decisions
   - markdownlint + link-checker
   - ADRs under docs/adr/; seed template; PRs altering architecture must include an ADR

5. Accessibility and i18n
   - docs/ACCESSIBILITY.md per CLI/UI package
   - Automated CLI/TUI a11y tests: no color-only signaling; standard keyboard hints
   - locales/ scaffold with ICU message lint

6. Performance and artifacts
   - size-limit on CLI bundles; startup time test vs TIMEOUT_BUDGET_MS
   - Dist validator forbids stray binaries > 5 MB

7. Boundaries and config
   - dependency-cruiser + eslint-plugin-boundaries
   - Zod schemas for config/env with precedence tests; .env.example required

8. Logging and privacy
   - PII redaction helper; golden log snapshots; per-service log policy doc

9. Renovation and hygiene
   - Renovate config (weekly); CODEOWNERS; PR template with required checkboxes

10. Template drift
    - Hash manifest for scaffolds; CI fails on drift

## Workflow

1. Inventory and gap analysis
   - Scan TARGETS excluding EXCLUDES. For each package, detect missing domain items.
   - Emit enforcement.plan.json mapping gaps → actions.

2. Apply scaffolds
   - Seed required files/configs. Reuse if compliant. Preserve authorship.

3. Wire CI
   - Add/merge .github/workflows/ci.yml with jobs:
     - setup (Node corepack pin, pnpm)
     - lint, unit tests + coverage (Vitest reporters: text-summary,json-summary; thresholds 90/95)
     - a11y (Playwright/jest-axe)
     - sbom, osv, semgrep (blocking), gitleaks (blocking)
     - provenance, size-limit, distro-check, docs-check, boundaries, template-drift

4. Add tests
   - TDD guardrails: global coverage ≥ 90, changed lines ≥ 95 (block PR)
   - a11y checks at WCAG 2.2 AA
   - CLI startup time and bundle size tests
   - Config precedence and env schema tests

5. Configure releases
   - Changesets + commitlint gates; release scripts
   - CI blocks if changeset missing for applicable changes

6. Self-check
   - Run all jobs locally (dry-run). Ensure green. Produce enforcement.results.json.

## Deliverables

- New/updated files:
  - .github/workflows/ci.yml
  - .changeset/config.json, .changeset/README.md
  - .commitlintrc.json (or .cjs) + scripts/ci/commitlint.sh
  - renovate.json
  - scripts/ci/{sbom.sh,provenance.sh,no-secrets.sh,osv.sh,size-limit.sh,a11y.sh}
  - docs/adr/0001-record-architecture-decisions.md (template)
  - docs/ACCESSIBILITY.md per CLI/UI package
  - config/config.schema.ts + tests per service/cli
  - sbom/ artifacts and build/provenance.json (emitted in CI)
  - .tool-versions, .nvmrc, .markdownlint.json, .github/pull_request_template.md
- Reports:
  - enforcement.plan.json, enforcement.results.json, a11y.report.json, sbom.index.json

## Run Commands (suggested)

- pnpm ci:all → full CI locally with caching
- pnpm ci:fast → lint, unit, boundaries, a11y quick
- pnpm sbom:all → regenerate SBOMs
- pnpm prov:emit → provenance dry-run
- pnpm perf:cli → startup time benchmark + size-limit

## Acceptance Criteria

- CI blocks merges on any ENFORCEMENT_DOMAINS violation
- Coverage ≥ 90% global and ≥ 95% changed lines (Vitest thresholds + reporters enforced)
- A11y tests pass at WCAG 2.2 AA; no color-only signaling
- SBOMs and provenance emitted for all buildable packages
- Changesets present when required; commit messages pass commitlint
- Boundary rules hold; config schemas validated; .env.example present
- Size-limit and startup-time within budgets
- Templates hash match; drift requires manifest update

## Output Spec

1. Patch diff for all added/modified files
2. enforcement.plan.json (per schema) with per-package actions
3. enforcement.results.json (per schema) summarizing job outcomes
4. Short README note: new gates and how to fix failures

## Schemas

- enforcement.plan.json
  - meta: { repo, commit, node, pnpm }
  - packages[]: { name, path, type, gaps[], actions[] }
- enforcement.results.json
  - jobs[]: { name, status: passed|failed, evidence[] }
  - summary: { passed, failed }

## Notes

- Deterministic runs; cache tool downloads; prefer OSS tools
- No bypass flags (e.g., HUSKY_SKIP_HOOKS, --no-verify)
- Branch protection must require CI success
- GHAS/CodeQL: add when enabled; keep Semgrep Code as blocking SAST until then
