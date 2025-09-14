# Quality Metrics & Badges

This document centralizes how Cortex-OS measures, enforces, and publishes code quality
signals (coverage, mutation score, and historical trends).

## Overview

| Metric              | Source Command                              | Storage Artifact                                   | Enforced? | Threshold |
|---------------------|----------------------------------------------|----------------------------------------------------|-----------|-----------|
| Branch Coverage     | `pnpm coverage:branches:record`              | `reports/branch-coverage-history.json`             | Gate via `coverage:branches:enforce` | Default 65% (raise incrementally) |
| Global Coverage     | `pnpm test:coverage`                         | `coverage/coverage-summary.json`                   | CI (explicit thresholds in scripts) | 90% lines/branches/functions |
| Mutation Score      | `pnpm mutation:enforce`                      | `reports/mutation/mutation.json`                   | Yes (`MUTATION_MIN`) | 75% |
| Mutation + Badges   | `pnpm mutation:badges`                       | `reports/badges/*.svg` + `reports/badges/metrics.json` | Yes (same) | 75% |
| Quality Gate Badge  | `pnpm badges:generate`                       | `reports/badges/quality-gate.svg`                     | Derived (branch >=65 & mutation >=75) | N/A |
| Branch Trend Sparkline | `pnpm badges:generate`                   | `reports/badges/branch-trend.svg`                     | No (visual) | N/A |
| Mutation History    | `pnpm badges:generate`                       | `reports/mutation-history.json`                       | Informational | N/A |

## Commands

```bash
# Run coverage and append branch % sample
pnpm coverage:branches:record

# Run mutation tests + enforce 75% minimum
pnpm mutation:enforce

# Generate (or refresh) badges from existing reports
pnpm badges:generate
```

## Artifacts

- `reports/branch-coverage-history.json` – Array of samples: `{ timestamp, branchesPct }`.
- `reports/mutation/mutation.json` – Stryker output including `mutationScore`.
- `reports/badges/branch-coverage.svg` – Branch coverage badge.
- `reports/badges/mutation-score.svg` – Mutation score badge.
- `reports/badges/quality-gate.svg` – Composite PASS/FAIL badge (branch & mutation thresholds).
- `reports/badges/branch-trend.svg` – Mini sparkline of recent branch coverage samples.
- `reports/mutation-history.json` – Rolling (max 200 entries) mutation score history.
- `reports/badges/metrics.json` – Machine‑readable consolidated JSON (now includes gate + sample counts):

```json
{
  "branchCoverage": 92.31,
  "mutationScore": 76.45,
  "qualityGate": { "pass": true, "branchMin": 65, "mutationMin": 75 },
  "branchSamples": 42,
  "mutationSamples": 42,
  "generatedAt": "2025-09-14T02:17:12.345Z"
}
```

## Scheduled Nightly Refresh

Workflow: `.github/workflows/badge-refresh.yml`

Nightly steps:
1. Run branch coverage + record sample
2. Run mutation tests (no enforcement – historical context only)
3. Generate badges & metrics JSON
4. Commit changes if badge or metrics drift
5. Publish GitHub Pages artifact (badges + `index.html` + `metrics.json`)

## GitHub Pages Endpoint

When Pages is enabled (Actions deployment), metrics are accessible at:

```text
https://<github-user>.github.io/Cortex-OS/metrics.json
```

Uses `no-store` fetch in the provided landing page to minimize stale reads.

## Raising Thresholds

Quality gates should ratchet upward only when flakiness risk is low:

1. Stabilize at current threshold for several PR cycles
2. Increase `MUTATION_MIN` environment variable in CI workflows (or rely on script default)
3. Optionally raise Stryker `thresholds.high` / `thresholds.break` in `stryker.conf.json`
4. Communicate in CHANGELOG or release notes if consumer expectations change

## Failure Modes & Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `mutation.json not found` | Stryker not run before `badges:generate` | Run `pnpm mutation:test` or `mutation:enforce` first |
| Mutation badge shows 0% | Stryker failed silently or score parse failed | Inspect `reports/mutation/mutation.json` & rerun with `--logLevel trace` |
| Branch badge stuck | History file grows but coverage run skipped | Ensure `coverage:branches:record` step executed |
| Pages not updating | Pages not enabled or artifact deploy failed | Check workflow logs & repository Pages settings |

## Implementation Notes

- Badge SVGs are handcrafted (no external badge service dependency).
- `metrics.json` enables external dashboards or tooling to consume quality signals without parsing SVG.
- The mutation enforcement script: `scripts/code-quality/enforce-mutation-threshold.mjs` (default 75%).
- Adjust runtime enforcement via `MUTATION_MIN` env override in workflows or local shell.

## Future Enhancements

- Persist branch & mutation trends to an external TSDB (Prometheus / Influx / SQLite aggregate).
- Add Webhook / Slack notification when quality gate flips from pass -> fail.
- Generate rolling mutation operator category breakdown report.
- Add flakiness detector (compare variance across last N runs).
