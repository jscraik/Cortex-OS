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
