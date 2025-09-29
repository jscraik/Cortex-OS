# coverage-tuning-tdd-plan.md

## Goal

Tighten and align Cortex-OS code coverage enforcement so global thresholds match brAInwav policy
(≥90% overall, ≥95% lines) while keeping configuration centrally adjustable.

## Assumptions

- Existing suites currently meet 95% line coverage; if not, remediation will follow as a separate
  task.
- Environment variables remain the preferred override mechanism for local/CI tuning.

## Test Plan (Red)

1. Add `tests/config/coverage-thresholds.test.ts` with scenarios that import
   `resolveCoverageThresholds` from `vitest.config`:
   - Default case returns { statements: 90, branches: 90, functions: 90, lines: 95 }.
   - Custom env inputs (e.g., `COVERAGE_THRESHOLD_STATEMENTS=92`, `COVERAGE_THRESHOLD_LINES=96`)
     override the defaults without mutating process-wide values.
   - Global fallback via `COVERAGE_THRESHOLD_GLOBAL` applies when per-metric env values are absent.
2. Ensure test failures highlight any mismatch between config logic and expectations.

## Implementation Plan (Green)

1. Refactor `vitest.config.ts`:
   - Introduce and export `resolveCoverageThresholds(env = process.env)` helper.
   - Use helper to populate `coverage.thresholds.global` values.
   - Update `test.env` defaults to expose explicit per-metric values (90/90/90/95).
2. Simplify `package.json` script `test:coverage:threshold` to rely on config-driven thresholds by
   removing explicit `--coverage.thresholds.*` flags.
3. Refresh documentation (README + CHANGELOG) noting the tuned line coverage requirement and helper
   availability.

## Refactor / Polish (Optional)

- Audit per-package Vitest configs; ensure any explicit thresholds reference policy or document the
  rationale when deviating.

## Implementation Checklist

- [x] Tests covering default and custom threshold resolution.
- [x] Helper exported and used within `vitest.config.ts`.
- [x] `test:coverage:threshold` script relies on shared configuration.
- [x] Documentation updated (README + CHANGELOG entry).
- [x] Coverage command (`pnpm test:coverage`) executed (mirrored via `pnpm dlx vitest@3.2.4 run --coverage`) to confirm
      threshold resolution under the memory guard; existing `simple-tests` failures persist upstream.
