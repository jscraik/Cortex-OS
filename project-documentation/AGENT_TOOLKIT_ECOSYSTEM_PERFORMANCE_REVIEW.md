# Agent Toolkit Ecosystem Performance Review

## Executive Summary
- The Agent Toolkit currently relies on unbounded `Promise.all` dispatch for fan-out workloads, which allows dozens of shell tools to spawn simultaneously and can exhaust CPU, file descriptors, and process limits during orchestrated runs.【F:packages/agent-toolkit/src/app/UseCases.ts†L118-L139】
- Context-building helpers read and chunk every file sequentially, repeatedly initializing the Tree-sitter boundary provider and sorting large token arrays, which inflates latency for bulk validation flows.【F:packages/agent-toolkit/src/app/UseCases.ts†L217-L341】【F:packages/agent-toolkit/src/semantics/ContextBuilder.ts†L23-L93】【F:packages/agent-toolkit/src/session/TokenBudget.ts†L16-L40】
- Script adapters run shell utilities with fully buffered stdout/JSON parsing and no shared caching of Web Tree-sitter grammars, magnifying memory usage and cold-start costs for high-volume search and diagnostics commands.【F:packages/agent-toolkit/src/infra/ShellScriptAdapter.ts†L14-L64】【F:packages/agent-toolkit/src/semantics/TreeSitterBoundary.ts†L31-L190】【F:packages/agent-toolkit/src/infra/execUtil.ts†L14-L50】

## Current Runtime Characteristics
- **Tool execution** – `ToolExecutorUseCase` routes per-input execution and surfaces lifecycle hooks, while `BatchToolExecutorUseCase` and `CodeSearchUseCase` issue parallel `Promise.all` requests over registered search/codemod validators.【F:packages/agent-toolkit/src/app/UseCases.ts†L19-L230】
- **Quality automation** – `CodeQualityUseCase` slices file lists, then runs ESLint, Ruff, and Cargo serially, invoking context building for large targets to produce per-file token budgets.【F:packages/agent-toolkit/src/app/UseCases.ts†L236-L341】
- **Context services** – `buildChunkedContext` loops through each file synchronously, re-loading content, chunking, and tokenizing before pruning with a sort-and-shift budget helper.【F:packages/agent-toolkit/src/semantics/ContextBuilder.ts†L23-L93】【F:packages/agent-toolkit/src/session/TokenBudget.ts†L16-L40】
- **Toolchain adapters** – Shell and exec-based adapters buffer the entire output of ripgrep/semgrep/diagnostics runs, parse JSON on completion, and load Tree-sitter grammars on every request when enabled.【F:packages/agent-toolkit/src/infra/SearchAdapters.ts†L34-L80】【F:packages/agent-toolkit/src/infra/ShellScriptAdapter.ts†L14-L64】【F:packages/agent-toolkit/src/infra/execUtil.ts†L14-L50】【F:packages/agent-toolkit/src/semantics/TreeSitterBoundary.ts†L31-L190】

## High-Impact Bottlenecks

| Area | Finding | Impact | Recommendation |
| --- | --- | --- | --- |
| Batch tool dispatch | `executeParallel` uses `Promise.all` without concurrency limits, letting dozens of shell processes start simultaneously.【F:packages/agent-toolkit/src/app/UseCases.ts†L118-L125】 | CPU & FD spikes under orchestrated runs; cascades into OS throttling when combined with diagnostics or codemods. | - Introduce a configurable concurrency limiter (e.g., `p-limit`) with sensible defaults per tool class.<br>- Surface overrides in package config.
| Quality validation fan-in | ESLint, Ruff, and Cargo validators execute sequentially even though they operate on disjoint file sets.【F:packages/agent-toolkit/src/app/UseCases.ts†L264-L300】 | Extends validation wall-clock time by ~3× for mixed-language repos; blocks follow-on context builds. | Run validators in parallel with bounded concurrency; reuse aggregated context once rather than per validator.
| Context building | `buildChunkedContext` performs sequential `readFile` and chunking, and `createTreeSitterProvider` re-loads grammars on every invocation.【F:packages/agent-toolkit/src/semantics/ContextBuilder.ts†L23-L93】【F:packages/agent-toolkit/src/semantics/TreeSitterBoundary.ts†L31-L190】 | Large projects (>500 files) spend seconds in serialized I/O and repeated WASM initialization. | Cache Tree-sitter provider at module scope, prefetch grammars asynchronously during bootstrap, and parallelize file reads via a capped worker pool.
| Token pruning | `createTokenBudget` sorts and shifts arrays on every prune, even when budgets are only slightly exceeded.【F:packages/agent-toolkit/src/session/TokenBudget.ts†L16-L40】 | O(n log n) allocations per run; spikes GC for large chunk lists. | Maintain a min-heap or deque keyed by creation time to support incremental pruning without resorting entire arrays.
| Shell adapters | `ShellScriptAdapter.executeScript` buffers entire stdout and logs stderr synchronously; diagnostics spawn collects strings similarly.【F:packages/agent-toolkit/src/infra/ShellScriptAdapter.ts†L14-L64】【F:packages/agent-toolkit/src/diagnostics/diagnostics.ts†L18-L76】 | High memory footprint for large search results; slow feedback during long-running scripts. | Stream stdout via `spawn` with incremental JSON framing or NDJSON; emit partial telemetry to keep spans active and responsive.

## Recommended Improvement Plan

### Phase 1 — Guardrails & Instrumentation (1–2 sprints)
1. Add configurable concurrency limits to `BatchToolExecutorUseCase.executeParallel` and context-aware fan-out helpers; expose defaults (e.g., 4 for search, 2 for codemods) via package config or environment variables.【F:packages/agent-toolkit/src/app/UseCases.ts†L118-L217】
2. Parallelize ESLint/Ruff/Cargo execution with a capped `Promise.allSettled` and attach metrics to compare elapsed time before/after rollout.【F:packages/agent-toolkit/src/app/UseCases.ts†L264-L341】
3. Cache a singleton Tree-sitter provider and grammars, and record initialization latency in metrics to confirm cold-start reductions.【F:packages/agent-toolkit/src/semantics/TreeSitterBoundary.ts†L31-L190】

### Phase 2 — Throughput Optimizations (2–3 sprints)
1. Refactor `buildChunkedContext` to batch `readFile` calls using a worker pool (e.g., `p-map` with concurrency) and to reuse tokenization buffers across files.【F:packages/agent-toolkit/src/semantics/ContextBuilder.ts†L23-L93】
2. Replace the sort-based pruning in `createTokenBudget` with a monotonic queue or indexed ring buffer to cut allocations for large chunk sets.【F:packages/agent-toolkit/src/session/TokenBudget.ts†L16-L40】
3. Introduce streaming adapters for ripgrep/semgrep/diagnostics, emitting chunks into incremental JSON decoders and providing early progress telemetry.【F:packages/agent-toolkit/src/infra/ShellScriptAdapter.ts†L14-L64】【F:packages/agent-toolkit/src/diagnostics/diagnostics.ts†L18-L113】

### Phase 3 — Strategic Enhancements (post-Phase 2)
1. Teach `CodeSearchUseCase` to short-circuit tool fan-out when prior results exceed confidence thresholds, lowering redundant shell invocations.【F:packages/agent-toolkit/src/app/UseCases.ts†L151-L195】
2. Add adaptive batching for diagnostics to reuse running processes (long-lived worker pattern) instead of repeated cold spawns, especially for observability pipelines.【F:packages/agent-toolkit/src/diagnostics/diagnostics.ts†L18-L113】
3. Explore WebAssembly or native bindings for ripgrep/semgrep to avoid shell marshalling overhead for high-frequency searches.【F:packages/agent-toolkit/src/infra/SearchAdapters.ts†L34-L80】

## Observability & Verification
- Extend existing OpenTelemetry spans in diagnostics to include queue depth, concurrency level, and script duration metrics; emit Prometheus histograms for per-tool runtime to catch regressions.【F:packages/agent-toolkit/src/diagnostics/diagnostics.ts†L18-L113】
- Add structured logs around `BatchToolExecutorUseCase` dispatch showing queue wait time vs. execution time to validate concurrency limit tuning.【F:packages/agent-toolkit/src/app/UseCases.ts†L118-L230】
- Track Tree-sitter provider cache hits/misses and grammar load times to prove the effectiveness of lazy caching improvements.【F:packages/agent-toolkit/src/semantics/TreeSitterBoundary.ts†L31-L190】

## Next Steps
1. Socialize this review with the Agent Toolkit owners (@brAInwav-devs) and align on Phase 1 scope during the next planning cycle.
2. Draft a lightweight TDD plan covering concurrency guards and Tree-sitter caching before implementation, per governance templates.
3. Schedule follow-up benchmarking after Phase 2 to measure search/validation throughput improvements against the 250 ms p95 latency SLO noted in package metadata.
