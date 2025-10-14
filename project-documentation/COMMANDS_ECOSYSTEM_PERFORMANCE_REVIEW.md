# Commands Ecosystem Performance Review (2025-10-13)

## Scope & Methodology
- Package: `@cortex-os/commands`
- Focus: command discovery, builtin execution adapters, template rendering, and logging surfaces that affect interactive latency and throughput.
- Inputs: Source review (`packages/commands/src`), package README, and prior workspace governance budgets (p95 ≤ 250 ms, cold start ≤ 800 ms).

## Current Architecture Snapshot
- **Slash session execution**: `runSlash` builds a fresh command map on every invocation by loading disk-scoped markdown commands and merging built-ins before dispatching to `runCommand`.【F:packages/commands/src/runSlash.ts†L23-L67】
- **Command loading**: `loadCommands` performs serial globbing and file reads for both user and project scopes, parsing each markdown file with Gray Matter before returning a `Map` keyed by normalized names.【F:packages/commands/src/loader.ts†L11-L60】
- **Execution adapters**: Built-in commands rely on shelling out to `pnpm` subcommands for tests, linting, and formatting, each through a promisified `execFile` call. Model and agent helpers proxy through lazily imported services with a per-process in-memory cache.【F:packages/commands/src/adapters.ts†L1-L121】
- **Template expansion**: `runCommand` renders templates by performing argument substitution, executing any embedded bash snippets via the injected `runBashSafe`, and inlining file references with per-call byte accounting but no content cache.【F:packages/commands/src/runner.ts†L31-L125】

## Observed Performance Bottlenecks
1. **Repeated cold disk scans per slash command**
   - `runSlash` re-loads the full command set when callers do not provide a pre-populated `commands` map, triggering two glob passes and N sequential file reads and parses for every user input.【F:packages/commands/src/runSlash.ts†L32-L61】【F:packages/commands/src/loader.ts†L19-L43】
   - Impact: On a workspace with dozens of markdown commands, interactive latency balloons, particularly in cold-start shells where filesystem caches are empty.

2. **Serial parsing and lack of concurrency safeguards**
   - Command files are processed strictly sequentially—each `parseCommandSafe` await chain blocks the next parse—preventing utilization of available I/O parallelism.【F:packages/commands/src/loader.ts†L19-L43】
   - Any slow or malformed file (e.g., large manifest) stalls the entire load, exacerbating the repeated reload behaviour above.

3. **Heavyweight subprocess invocations for built-ins**
   - `/test`, `/format`, and `/lint` commands always spawn a new `pnpm` process (and, for `lint --changed`, two) without reuse or warm pooling.【F:packages/commands/src/adapters.ts†L63-L111】
   - These operations routinely exceed the 250 ms latency budget and introduce CPU contention on shared runners.

4. **Template expansion hot path lacks memoization and instrumentation**
   - `renderTemplate` recomputes argument substitution, shell expansions, and file inclusions with no caching between invocations and no sampling of per-step duration.【F:packages/commands/src/runner.ts†L47-L125】
   - High-volume commands that reuse identical templates (e.g., repetitive `/status`) still pay the full parse/expand cost each time.

5. **Minimal structured telemetry**
   - `runCommand` emits start/success/error logs via the observability logger but does not publish histograms, counters, or trace spans needed to enforce the package-level latency and cold-start budgets.【F:packages/commands/src/runner.ts†L20-L93】

## Recommended Optimizations
1. **Introduce session-scoped command cache with incremental refresh**
   - Maintain a `Map` keyed by project+user scope in memory, reusing it across `runSlash` calls and invalidating via fs watchers or TTL.
   - Expected gains: eliminates redundant globbing and markdown parsing, aligning steady-state latency with in-memory lookups.

2. **Parallelize command parsing with bounded concurrency**
   - Replace the serial `for` loops with `Promise.allSettled` over a small worker pool (e.g., p=4) so slow files no longer gate the load.
   - Capture parse errors separately to keep healthy commands available.

3. **Add lightweight manifest cache for template rendering**
   - Memoize rendered template skeletons (post-argument substitution) keyed by command + args signature, and reuse file include contents when source mtime unchanged.
   - Provide escape hatches for dynamic commands to opt out.

4. **Pool long-running subprocess helpers**
   - Introduce a background task runner (Node worker, task queue, or persistent CLI daemon) for `/test`, `/lint`, `/format` to amortize `pnpm` startup and serialize expensive workloads.
   - Surface command progress via streaming logs to preserve UX while containing CPU spikes.

5. **Instrument command lifecycle**
   - Emit OTEL spans for load, render, execute, and adapter subprocess phases; add histograms for command latency and cache hit rate to satisfy package SLO observability needs.

6. **Guardrails for bash/file expansion concurrency**
   - Introduce concurrency limits or resource pools inside `expandBangs`/`expandAtRefs` so many inclusions execute predictably, and ensure byte counters remain accurate under asynchronous execution.

## Implementation Roadmap
| Phase | Timeframe | Key Tasks | Dependencies |
| --- | --- | --- | --- |
| 1 — Profiling & Telemetry | Week 1 | Wire OTEL spans, latency histograms, and cache hit counters inside loader and runner paths. Establish baseline metrics dashboards. | `@cortex-os/observability` updates for new metrics namespace |
| 2 — Command Cache & Parallel Loader | Week 2 | Implement session cache with watcher/TTL invalidation, refactor loader to use bounded concurrency, add unit coverage for reload semantics. | File watching via `chokidar` (existing dependency check) |
| 3 — Adapter Process Pooling | Week 3 | Stand up shared worker for `pnpm` operations, add request queueing, and expose health endpoints/logging for long-running tasks. | Coordination with Dev Productivity to host shared runner |
| 4 — Template Memoization & Concurrency Guards | Week 4 | Add memoization layer for render pipeline, enforce inclusion concurrency limits, expand tests for byte-cap accuracy. | Cache invalidation heuristics + config surfacing |

## Risks & Considerations
- Cache invalidation errors could expose stale commands; pair caching rollout with config toggles and telemetry to detect misses quickly.
- Long-running subprocess pools must respect existing security boundaries (no cross-session leakage of env or file handles).
- Additional dependencies (watchers, pooling libs) require security review and OSS policy compliance before adoption.

## Next Steps
1. Align with @cortex-ops on telemetry schema additions and dashboard placement.
2. Draft a detailed technical spec for the command cache and loader parallelization, citing this review per governance requirements.
3. Schedule a spike to prototype the pnpm worker pool, capturing cold vs. warm timings to validate expected gains.
