# Baseline Metrics Workflow

brAInwav Phase 0.2 requires a repeatable snapshot of coverage, code structure, dependency risk, and flake rate. The new `baseline-metrics` tooling provides a single command for aggregating these signals and materialising JSON artefacts in `reports/baseline/`.

## Generating The Baseline

```bash
# Run the automated pipeline (coverage + codemap + mutation + audit + flake stats)
pnpm baseline:prepare

# Aggregate everything into reports/baseline/
pnpm baseline:collect
```

`baseline:prepare` executes [`scripts/ci/prepare-baseline.ts`](../../scripts/ci/prepare-baseline.ts), which orchestrates Vitest coverage, Stryker mutation tests, codemap generation, and `pnpm audit` before writing normalized artefacts to `out/`. The follow-up `baseline:collect` script invokes [`scripts/ci/generate-baseline.ts`](../../scripts/ci/generate-baseline.ts), which consumes [`scripts/ci/baseline-metrics.ts`](../../scripts/ci/baseline-metrics.ts). All commands accept optional `--metrics-dir`, `--output-dir`, `--codemap`, `--package-audit`, and `--flake-stats` flags for non-standard layouts.

## Expected Inputs

| Metric        | Default Path         | Source of Record                                   |
| ------------- | -------------------- | -------------------------------------------------- |
| Coverage      | `out/coverage-summary.json` | `pnpm test:smart --coverage` (Vitest JSON summary)    |
| Mutation      | `out/mutation.json`  | `pnpm mutation:smart` (Stryker report)             |
| Codemap       | `out/codemap.json`   | `pnpm codemap`                                     |
| Package Audit | `out/package-audit.json` | `pnpm security:scan` or `pnpm audit --json` wrapper |
| Flake Stats   | `out/flake-metrics.json` | Smart Nx flake detector (future CI pipeline)        |

If an input is missing the baseline marks that section as `available: false` so the pipeline never blocks on missing prerequisites.

## Artefacts

Running `pnpm baseline:collect` writes the following files:

- `reports/baseline/coverage.json` – consolidated line/branch/mutation metrics and provenance
- `reports/baseline/codemap.json` – aggregate node/edge/file counts from the workspace codemap
- `reports/baseline/package-audit.json` – vulnerability totals (critical/high/moderate/low)
- `reports/baseline/flakes.json` – flake rate, average test duration, and run count
- `reports/baseline/summary.json` – single document combining all signals with timestamps

Attach these artefacts to your Phase 0.2 evidence bundle alongside the raw generator logs.

## Maintaining Coverage Ratchets

The Vitest quality gate (`tests/quality-gates/gate-enforcement.test.ts`) enforces both the static thresholds in `.eng/quality_gate.json` and the ratchet baseline stored at `reports/baseline/coverage.json`. Keep that file synchronized with current coverage before shipping:

```bash
# 1. Regenerate coverage with the smart test runner
pnpm test:smart -- --coverage

# 2. Refresh baseline artefacts (updates reports/baseline/coverage.json)
pnpm baseline:collect

# 3. Verify the gate continues to pass and the ratchet did not regress
pnpm vitest --config vitest.basic.config.ts run tests/quality-gates/gate-enforcement.test.ts
```

Or run everything with a single helper:

```bash
pnpm baseline:refresh
```

When coverage legitimately improves, commit the updated `reports/baseline/coverage.json` alongside the evidence (coverage summary, gate logs). If coverage drops intentionally, update `.eng/quality_gate.json` via ADR and archive the decision; never loosen the ratchet ad hoc.

## TDD Coach Preflight & Validation

The repository now ships a lightweight Vitest bootstrap (`tests/tdd-setup.ts`) and a harnessed integration suite (`tests/tdd-coach/integration.test.ts`) that exercise TDD Coach without invoking `pnpm exec`. To run the local workflow:

```bash
# Run the Vitest harness (no CLI build required)
pnpm vitest --config vitest.basic.config.ts run tests/tdd-coach/integration.test.ts

# Validate staged files during pre-commit (requires the CLI to be built once)
FILES="$(git diff --name-only --cached)" make tdd-validate  # uses --non-blocking to surface coaching without failing the shell

# Continuous watch mode for the CLI
pnpm run tdd:watch
```

- `tests/tdd-setup.ts` executes a preflight status check through the harness so every suite emits brAInwav-branded telemetry.
- `make tdd-validate` still shells out to the real CLI; ensure `pnpm --filter @cortex-os/tdd-coach build` has been run after cloning.
- The Vitest tests mock CLI output, allowing CI to exercise the interface even when the binary is absent.

Document the results of these commands in your Day 5 baseline notes (`reports/baseline/notes-2025-10-02.md`) so the audit trail covers both the metrics capture and the enforcement hooks.
