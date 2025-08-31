# Cortex-OS Evals and Validation Gates

Overview of the evaluation flywheel and the gate used in CI/CD.

- Unit tests cover agents, RAG library, router, and contracts.
- Automated evals run as a deterministic gate and emit machine-readable JSON.
- Default suites:
  - `rag`: retrieval metrics (ndcg/recall/precision) over a golden dataset.
  - `router`: deterministic check that model routing/fallback compiles and returns non-empty results using stubs.

Run locally:

```
pnpm test # full tests
pnpm eval:gate # JSON summary across suites
```

Config: `.cortex/eval.config.json`

- `dataset`: path to a RAG golden dataset (JSON).
- `suites[]`: list of enabled suites with optional thresholds and options.

Outputs:

- Default: pretty text via CLI
- `--json`: GateResult JSON with ISO-8601 timestamps and per-suite metrics

Extending:

- Add new suite in `packages/evals/src/suites/`, expose it via `src/index.ts` switch, and register in config.
- Each suite validates its input with Zod and must return a single-pass boolean and numeric metrics.

