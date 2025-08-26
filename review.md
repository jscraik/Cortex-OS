# Codex Web Review

## Run
- `pnpm review` → writes `.artifacts/review.report.json`.

## Grade
- Weighted rubric in tools/review/index.ts.
- A(≥4.5) B(4.0–4.49) C(3.5–3.99) D(3.0–3.49) F(<3.0).

## Outputs
- ESLint/TS/dep graphs, cycles, unused, OSV results.
- Open issues per package with gaps.
