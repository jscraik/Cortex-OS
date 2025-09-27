# coverage-tuning.research.md

## Research Objective

Align Cortex-OS coverage enforcement with current quality gates while respecting memory
constraints and brAInwav production rules.

## Repository Signals

- Root `vitest.config.ts` enforces global thresholds at 90% for statements, branches, functions,
  and lines. Env overrides (`COVERAGE_THRESHOLD_GLOBAL`, `COVERAGE_THRESHOLD_LINES`) are defined in
  the same file.
- `vitest.basic.config.ts` (simple-tests) scopes a small include list with lower thresholds
  (80% statements/lines/functions, 70% branches).
- Many package-level `vitest.config.ts` files lean on root defaults and omit explicit thresholds.
- `package.json` scripts:
  - `test:coverage` executes Vitest with coverage reporters.
  - `test:coverage:threshold` hard-codes 90% across all metrics, mirroring root config.
  - Additional scripts (`coverage:gate`, `coverage:branches:*`) consume `coverage-summary.json`.
- Documentation (`README.md`, `CLAUDE.md`, `.github/prompts/enforcer.prompt.md`) reiterates a 90%+
  target; several docs call for 95% minimum on lines or readiness checks.
- `.github/workflows/readiness.yml` references per-package coverage ≥ 95% (needs alignment with
  config).

## Constraints & Considerations

- brAInwav standards require ≥ 90% coverage; some artifacts push lines to ≥ 95%.
- Memory guard configuration in `vitest.config.ts` is critical; adjustments must preserve existing
  resource ceilings.
- Any new automation must keep logs branded with brAInwav context.
- Prefer env-driven overrides rather than weakening enforcement locally.

## Opportunities / Questions

1. Align env variables (`COVERAGE_THRESHOLD_GLOBAL`, `COVERAGE_THRESHOLD_LINES`) with
   `thresholds.global` (currently 90/90 while the env suggests 95 for lines).
2. Centralize threshold constants to eliminate script drift and support richer targets (for example,
   raising lines/branches to 92–95%).
3. Decide whether per-package configs should declare explicit overrides when deviating (e.g.,
   `vitest.basic.config.ts`).
4. Ensure `coverage:gate` fails whenever the summary falls under the selected thresholds.

## Next Steps

- Propose tuned thresholds (possibly 92–93% for lines while retaining 90% elsewhere, unless policy
  dictates 95%).
- Update `vitest.config.ts`, accompanying scripts, and env defaults for consistency.
- Refresh documentation (README, CHANGELOG) with new targets and rationale.
- Validate via `pnpm test:coverage` to confirm instrumentation stays within memory limits.
