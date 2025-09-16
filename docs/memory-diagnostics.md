# Memory Diagnostics & Guarding

This document explains the memory safety tooling introduced to prevent runaway Node/Vitest processes (2GB+ RSS) from freezing development machines.

## Overview

| Component | Purpose |
|-----------|---------|
| `scripts/vitest-safe.mjs` | Enforces strict single-thread, low-memory Vitest execution with watchdog. |
| `scripts/prebuild-graph.mjs` | Fast pre-build affected graph + optional typecheck pre-warm and hygiene check. |
| `scripts/memory-snapshot-runner.mjs` | Wraps any command, capturing periodic RSS samples & heap snapshots. |
| `scripts/memory-regression-guard.mjs` | Compares latest run peak RSS against baseline / policy to detect regressions. |
| `tests/memory/memory-regression-guard.test.ts` | Unit test for JSONL parsing logic used in regression guard. |

## Quick Start

Run a memory-safe Vitest execution with snapshot + logging:

```bash
pnpm memory:snapshot:test
```

Bootstrap a memory baseline (first run creates baseline):
```bash
pnpm memory:baseline
```

Subsequent gating run (fails on regression):
```bash
pnpm memory:regression
```

Preview affected build graph (dry run):
```bash
pnpm prebuild:graph -- --dry-run
```

## Scripts Added

- `prebuild:graph` – summarizes affected projects (build target) and pre-warms via `typecheck`.
- `memory:snapshot:test` – runs `vitest-safe` under snapshot/monitor; outputs JSONL and summary.
- `memory:regression` – enforces memory policy; fails CI on regressions.
- `memory:baseline` – initializes or refreshes baseline (non-failing).

## Artifact Locations

| Path | Description |
|------|-------------|
| `.memory/logs/*.jsonl` | Streaming RSS samples (`{ t, rssKB }`). |
| `.memory/snapshots/*.heapsnapshot` | Heap snapshots (auto/manual placeholders). |
| `reports/memory-snapshot-summary.json` | Last snapshot run summary. |
| `reports/memory-baseline.json` | Baseline peak RSS (MB). |
| `reports/memory-regression-last.json` | Last guard evaluation summary. |

## Environment Variables / Policy

| Variable | Meaning | Default |
|----------|---------|---------|
| `MEMORY_GUARD_MAX_MB` | Hard fail if peak exceeds this absolute MB. | unset |
| `MEMORY_GUARD_ALLOWED_PCT` | Allowed % increase vs baseline. | 25 |
| `MEMORY_GUARD_ALLOWED_DELTA_MB` | Allowed absolute MB delta vs baseline. | unset |
| `CORTEX_SMART_FOCUS` | Focus list for prebuild graph filtering. | unset |

## Typical CI Flow

1. Run `pnpm prebuild:graph -- --json` (optional analytics ingestion).
2. Run `pnpm memory:snapshot:test` around a representative test batch.
3. Run `pnpm memory:regression` to gate.
4. (Optional) If intentional increase and acceptable, update baseline:
   ```bash
   cp reports/memory-regression-last.json reports/memory-baseline.json
   ```

### Integrated Governance Pipeline

The `ci:governance` script now inlines the memory guard steps (can be skipped by exporting `CI_SKIP_MEMORY_GUARD=1`):

Order inside governance:
- (Conditional) `prebuild:graph` (quiet) – warms graph
- `memory:snapshot:test` – captures RSS & metrics
- `memory:regression` – enforces policy (hard fail on regression)
- Remaining quality gates (format, lint, security tests, structure, license, mcp path)

Skips are explicit and logged; failures surface with `[MEM-GUARD]` lines.

### Auto Baseline Refresh

`scripts/memory-baseline-auto.mjs` implements conservative baseline rotation:

Usage examples:
```bash
pnpm node scripts/memory-baseline-auto.mjs --max-age-days 10
pnpm node scripts/memory-baseline-auto.mjs --force # override policy
```
Policy:
- Only refresh when existing baseline age > N days (default 14)
- Last regression evaluation status must be `pass`
- Reject refresh if increase > 50% (configurable via `--max-allowed-pct`)
- Force mode bypasses age & pct checks (use sparingly; justify in PR)

### Prometheus Metrics Export

`memory-snapshot-runner.mjs` optionally emits Prometheus gauge/counter metrics:

Enable via flag or env:
```bash
pnpm node scripts/memory-snapshot-runner.mjs --prom --label vitest -- -- node scripts/vitest-safe.mjs run --reporter=dot
# or
MEMORY_PROM_METRICS=1 pnpm memory:snapshot:test
```
Output: `.memory/metrics/<label>.prom`

Metrics exposed:
```
cortex_memory_peak_rss_bytes{label="<label>"}
cortex_memory_samples_total{label="<label>"}
cortex_memory_observation_window_ms{label="<label>"}
```

Scrape Strategy: point Prometheus file_sd (or sidecar) at `.memory/metrics` inside CI workspace, or upload artifacts for later ingestion.

### Pre-Commit Hook Integration

Pre-commit adds an opportunistic quick memory check (non-blocking by default):
1. Runs `pnpm memory:quick` (very small vitest-safe sample) if baseline exists
2. Executes `pnpm memory:regression` silently
3. Logs warning on regression; set `CORTEX_MEMORY_BLOCK=1` to block commits
4. Skip entirely with `CORTEX_SKIP_MEMORY_PRECOMMIT=1`

Rationale: surfaces early drift without slowing down every commit or blocking exploratory work.

### Quick Memory Script

`memory:quick` runs a trimmed snapshot (interval 1.5s, limited test subset) to approximate current peak trends between full CI runs. Non-failing; designed for interactive developer use.

### Tiered Regression Policy

Some code paths scale differently as the project grows; a single flat percentage can be either too strict early or too loose later. Tiered policy dynamically adjusts the allowed percent increase based on the current baseline band.

Enable:
```bash
MEMORY_GUARD_TIERED=1 pnpm memory:regression
# or
pnpm node scripts/memory-regression-guard.mjs --tiered
```

Default tiers (if none supplied):
```
800:15,1200:20,999999:25
```
Meaning:
- baseline <= 800MB  -> allow 15% increase
- baseline <= 1200MB -> allow 20% increase
- baseline <= 999999MB -> allow 25%

Custom tiers (ascending limit:pct):
```bash
MEMORY_GUARD_TIERS="700:12,900:15,1100:18,1400:20,999999:22" MEMORY_GUARD_TIERED=1 pnpm memory:regression
```

CLI override equivalent:
```bash
pnpm node scripts/memory-regression-guard.mjs --tiered --tiers "700:12,900:15,1100:18,1400:20,999999:22"
```

Summary output includes:
```
policy: {
   tiered: true,
   tierDecision: { limit, pct, tiers: [...] },
   allowedPct: <resolvedPct>
}
```

Fallback Behavior:
- If malformed tier spec, invalid entries are ignored (remaining valid tiers used)
- If no tier matches (should not happen with a final high ceiling) the last tier is applied

Recommended Strategy:
- Start conservative: keep early tiers low (10–15%) to force investigation
- Allow moderate growth in mid-band (18–22%) for legitimate cache expansions
- Keep top-tier ceiling modest (≤25%) to prevent baseline drift normalization

## Interpreting Failures

- `Peak XXXXMB exceeds hard max` – raise limit only with justification (avoid habitual increases).
- `Delta XMB exceeds allowed delta` – investigate recent changes adding memory pressure.
- `Increase Y% exceeds allowed` – profile using Chrome DevTools: `chrome://inspect` -> Load snapshot.

## Manual Heap Snapshot (Future Enhancement)
The current implementation provides an auto snapshot hook placeholder. Inspector automation can be added later to emit deterministic manual snapshots mid-run.

## Troubleshooting

| Symptom | Action |
|---------|--------|
| No `.jsonl` log produced | Ensure runner executed: `pnpm memory:snapshot:test`. Check permissions. |
| Regression guard always bootstraps | Ensure baseline exists: run `pnpm memory:baseline` once. |
| High RSS despite single-thread | Look for hidden watchers or stray `vitest --watch` processes: `pnpm watch:kill-all`. |
| Heap snapshot huge (>200MB) | Inspect large retained arrays or caches; consider streaming / lazy load. |

## Extending
- Add additional reporters by enhancing `memory-snapshot-runner.mjs` to emit Prometheus-compatible metrics.
- Integrate with existing governance pipeline (`ci:governance`) after burn-in.

Already Implemented Extensions:
- Governance integration (see above)
- Auto baseline refresh tool
- Prometheus metrics emission
- Pre-commit opportunistic guard

## Safety Principles
- Fail fast on memory hygiene violations (pre-build and test phases).
- Prefer additive observability before tightening thresholds.
- Keep baseline explicit (checked into artifacts, not ephemeral).

## Next Ideas
- Kill threshold for cumulative child process RSS.
- Differential heap snapshot analysis (baseline vs new) with object type histogram.
- Slack / webhook notification on regression failure.

---
Maintainer Note: Update this doc when changing thresholds, introducing new scripts, or modifying artifact paths.
