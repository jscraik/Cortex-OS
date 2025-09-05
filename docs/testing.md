# Testing in Cortex-OS

<!-- markdownlint-disable MD013 MD031 -->

This repo includes a safe, resource-capped test runner to prevent Vitest from hogging CPU or memory on developer machines.

## Quick start

- Run tests safely:
  - `pnpm test:safe`
- Watch mode:
  - `pnpm test:safe:watch`
- With external memory monitor:
  - `pnpm test:safe:monitored`
- Pass additional Vitest flags:
  - `pnpm test:safe -- --passWithNoTests -t "pattern"`

## What the safe runner enforces

The script `scripts/test-safe.sh` coordinates conservative Vitest settings and Node memory limits. It drives Vitest using `vitest.basic.config.ts` for a slim, predictable environment.

Caps:

- Concurrency
  - `maxWorkers: 1`
  - `fileParallelism: false`
  - `pool: 'forks'` with a single fork (`singleFork: true`, `maxForks: 1`, `minForks: 1`)
- Memory per process
  - Adds `--max-old-space-size` to Node (default 1536 MB)

These settings are also reflected in the root `vitest.config.ts` and/or `vitest.basic.config.ts` so that the defaults are safe.

## Tuning knobs (opt-in)

You can tweak limits without changing code by exporting environment variables before running the script:

- `MAX_WORKERS`: Number of Vitest workers (default: `1`)
- `NODE_MAX_OLD_SPACE_SIZE_MB`: Node V8 old-space limit in MB (default: `1536`)

Examples:

```bash
# Increase memory cap to 2 GB
NODE_MAX_OLD_SPACE_SIZE_MB=2048 pnpm test:safe

# Still single worker, but pass a Vitest filter
pnpm test:safe -- -t "AgentOrchestrator"

# Use watch mode with a higher memory cap
NODE_MAX_OLD_SPACE_SIZE_MB=2048 pnpm test:safe:watch
```

## Why tests may still fail

The safe runner only limits resources; it does not alter test logic or dependencies. If tests fail, it’s due to functional or environment issues, not the runner itself. A few common examples seen in integration/E2E suites:

- ASBR config required

  - Some tests load ASBR server configuration from `ASBR_CONFIG_PATH` (or a default in `~/.config/cortex/asbr/config.yaml`). Missing required fields (like `events.max_task_events` and `events.max_global_events`) will fail validation.
  - For test runs, point `ASBR_CONFIG_PATH` to a minimal config file that includes required keys. Example YAML:

    ```yaml
    events:
      max_task_events: 1000
      max_global_events: 10000
    ```

- MCP integration interfaces

  - If MCP server interfaces change, mocks and adapters used by tests must be updated (e.g., `initialize`, `callTool`).

- Tool availability assumptions
  - Tests that assume Semgrep, ESLint, Lighthouse, etc., are “available” should either mock those tools or expect fallback behavior when they’re not installed.

## Advanced

- The safe runner uses `vitest.basic.config.ts` by default. If you need a different config, pass it via CLI:
  - `pnpm test:safe -- -c vitest.config.ts`
- You can forward any Vitest CLI args after `--`.

### Performance Metrics & Baselines (@perf)

Performance‑oriented tests live under `packages/asbr/tests/performance` and are tagged with `@perf` in their file comments. They can emit structured metrics and compare against a JSON baseline.

Run only perf tests with metrics collection:

```bash
pnpm --filter asbr test:perf
# or with explicit flags
PERF_METRICS=1 pnpm --filter asbr vitest run tests/performance
```

Environment flags:

- `PERF_METRICS=1` – Enable metric capture (writes `tests/performance-current.json`).
- `PERF_BASELINE=path` – Override baseline location (default: `tests/performance-baseline.json`).
- `PERF_OUTPUT=path` – Where to write current run metrics file.
- `PERF_BUDGET_PCT=NN` – Allowed p95 regression percentage (default: `20`).
- `PERF_ENFORCE=1` – Fail the run if regression over budget is detected.

Metrics captured per logical operation (e.g., `task.create`, `health.check`) include: `min`, `max`, `mean`, `p50`, `p90`, `p95`, `p99`, plus raw samples.

Updating baseline after an intentional improvement/regression:

```bash
PERF_METRICS=1 pnpm --filter asbr test:perf
cp packages/asbr/tests/performance-current.json packages/asbr/tests/performance-baseline.json
```

Recommendation: enforce in CI with a separate job using `PERF_ENFORCE=1 PERF_BUDGET_PCT=15` (stricter) to catch drifts early.

### Shared Server Fixture (Test Startup Optimization)

Integration/E2E suites that repeatedly stand up the ASBR server can optionally reuse a single instance to reduce startup overhead.

Enable reuse:

```bash
ASBR_TEST_SHARED_SERVER=1 pnpm --filter asbr test:perf
```

Behavior:

- When `ASBR_TEST_SHARED_SERVER` is set, tests that imported `../fixtures/shared-server` will call `getSharedServer()` instead of creating a new server.
- Ports: shared server defaults to `127.0.0.1:7450` (performance test still uses its own fixed port today; can be unified later).
- Individual tests skip `server.stop()` in teardown when reuse is active.

Only enable for perf or exploratory runs; keep isolated startup (default) for most CI paths to ensure realistic lifecycles and avoid state bleed.

### Adding New Perf Metrics

1. Import `recordMetric` from `tests/utils/perf-metrics`.
2. Wrap the measured region:
   ```ts
   const start = performance.now();
   // operation
   recordMetric('my.operation', performance.now() - start);
   ```
3. Re-run with `PERF_METRICS=1` and, if desired, update baseline.

### Interpreting Regressions

If `PERF_ENFORCE=1` and regressions exceed `PERF_BUDGET_PCT`, the job fails with a summary listing each metric whose p95 exceeded the allowed budget. Investigate:

- Recent dependency upgrades (HTTP, crypto, zod validation changes)
- Increased default payload size or schema validation depth
- Additional warm-up tasks in setup hooks

Mitigation strategies: lazy‑initialize heavy modules, batch I/O, or cache derived schemas.

## Troubleshooting

- Tests take longer than expected
  - That’s by design: serialized execution and a single fork reduce resource usage. Temporarily raise `MAX_WORKERS` and/or memory if needed, but keep values conservative.
- Out-of-memory errors persist
  - Increase `NODE_MAX_OLD_SPACE_SIZE_MB` gradually (e.g., 2048 → 2560). If OOM continues, look for runaway allocations in specific suites.
