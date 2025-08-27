# Review Gaps

## Pros

- Single command. Deterministic CI. Standards-aligned rubrics. Security and A11y included.

## Cons

- Aggregator scoring is heuristic until wired to real test coverage and axe output.
- A11y only for UI packages.
- OSV may miss 0-days.

## Improvements

- Ingest Jest/Vitest coverage JSON into score.
- Wire axe CLI to Storybook builds.
- Add OSSF Scorecard Action and SARIF uploads.

## Missed opportunities

- No runtime perf budgets. Add size-limit or packemon for library bundles.
- No SBOM export yet.

## Moving forward

- Land this in a small PR.
- Run on main.
- Triage `.artifacts/review.report.json`.
- Create issues per package from findings.
