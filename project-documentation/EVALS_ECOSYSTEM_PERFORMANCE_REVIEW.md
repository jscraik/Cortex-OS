# Cortex-OS Evals Ecosystem Performance Review

**Author:** Cortex-OS Performance Task Force (AI assistant)
**Date:** 2025-02-13
**Scope:** packages/evals/*, dependent runtime flows, and shared infrastructure touchpoints.

## 1. Executive Summary
- The `runGate` coordinator executes enabled suites sequentially and rebuilds dependency wiring for each suite invocation, creating avoidable latency spikes and constraining throughput under multi-suite configurations. [See `index.ts` L9-L47](https://github.com/your-org/your-repo/blob/main/packages/evals/src/index.ts#L9-L47)
- Retrieval evaluations repeatedly construct embedders and vector stores per run, forcing redundant model warm-ups and dataset hydration that dominate cold-start costs.【F:packages/evals/src/suites/rag.ts†L24-L63】
- Router and MCP-oriented suites execute blocking network probes without timeout controls or concurrency, amplifying tail latencies and masking per-capability health regressions.【F:packages/evals/src/suites/router.ts†L21-L77】【F:packages/evals/src/suites/mcp-tools.ts†L21-L48】
- A2A emission uses the in-process transport by default, registering schemas on every bus creation and limiting scalability once eval throughput requires cross-process dispatch.【F:packages/evals/src/a2a.ts†L1-L108】

## 2. Current Architecture & Performance Characteristics

### 2.1 Gate Orchestration
- `runGate` parses gate configuration, filters enabled suites, and executes each suite in series. Outcomes are accumulated and pass/fail is determined via an `every` check after all suites run.【F:packages/evals/src/index.ts†L21-L47】
- Dependency injection is manual: the caller supplies a dependency map per suite, and the runner throws synchronously when a dependency is missing. No memoization exists across suites.

### 2.2 Retrieval (RAG) Suite
- The suite constructs an embedder and store, performs a full dataset preparation, then runs retrieval metrics for the configured `k`. Threshold defaults target 0.8 nDCG/recall and 0.5 precision.【F:packages/evals/src/suites/rag.ts†L24-L63】
- Embedding and store factories are awaited for every suite run without caching or pooling, even if repeated datasets or stores are used.

### 2.3 Router Suite
- Initialization, embedding, chat, and rerank probes are executed back-to-back with `Date.now()` boundaries to record latency. Thresholds default to 2s per capability.【F:packages/evals/src/suites/router.ts†L21-L74】
- Health signals rely on boolean `hasAvailableModels` guards and simple token counts; no percentile tracking, concurrency, or failure isolation is present.

### 2.4 Prompt & Redteam Suites
- Both suites defer to injected runners and evaluate aggregate metrics against thresholds. They assume synchronous completion and do not expose partial progress or streaming updates.【F:packages/evals/src/suites/promptfoo.ts†L10-L39】【F:packages/evals/src/suites/redteam.ts†L10-L39】

### 2.5 MCP Tools Suite
- Executes provided cases serially through a dependency runner, expecting zero failures and high refusal rates. Lacks tolerance for partial refusal data or adaptive sampling.【F:packages/evals/src/suites/mcp-tools.ts†L21-L48】

### 2.6 A2A Bus and Events
- `createEvalsBus` builds a fresh schema registry, merges ACLs, and instantiates an in-process transport for each invocation. Schema registration replays static metadata for every bus creation, even in hot paths.【F:packages/evals/src/a2a.ts†L1-L108】
- Event schemas emphasize correctness but do not embed latency budgets or correlation identifiers needed for high-volume telemetry.【F:packages/evals/src/events/evals-events.ts†L1-L63】

## 3. Observed Bottlenecks & Failure Modes
1. **Sequential suite execution:** Multi-suite gates are bottlenecked by the slowest suite; downstream consumers cannot observe partial pass/fail states until the loop completes.【F:packages/evals/src/index.ts†L29-L47】
2. **Cold-start heavy retrieval prep:** Embedding creation and store hydration rerun per evaluation, penalizing short-lived workers and horizontal scaling.【F:packages/evals/src/suites/rag.ts†L30-L53】
3. **Router latency probes:** Blocking calls per capability share a single thread, so latency spikes cascade and inflate total gate completion time.【F:packages/evals/src/suites/router.ts†L34-L63】
4. **Unbounded dependency runtimes:** Prompt, redteam, and MCP suites depend on external runners without timeout envelopes or retries, increasing risk of hung evaluations.【F:packages/evals/src/suites/promptfoo.ts†L18-L39】【F:packages/evals/src/suites/redteam.ts†L18-L36】【F:packages/evals/src/suites/mcp-tools.ts†L28-L44】
5. **Schema registration churn:** Creating the bus repeatedly re-registers static schemas, increasing CPU and GC load during high-frequency test orchestration.【F:packages/evals/src/a2a.ts†L33-L103】

## 4. Recommended Remediations

### 4.1 Parallel & Incremental Gate Execution (Priority: High)
- Introduce configurable concurrency in `runGate`, allowing independent suites to run in parallel while maintaining deterministic ordering for results emission.
- Stream intermediate suite outcomes through the A2A bus immediately after completion to shorten feedback loops for long-running evaluations.

### 4.2 Retrieval Warm Path Optimizations (Priority: High)
- Cache embedder instances per dataset/model signature and reuse prepared stores when dataset manifests are unchanged.
- Support background hydration workers that refresh stores asynchronously, coupled with TTL-based invalidation.

### 4.3 Router Probe Hardening (Priority: Medium)
- Wrap capability probes in cancellable promises with per-call timeout budgets and expose percentile latency metrics.
- Batch capability checks where possible (e.g., combined embedding/chat requests) to reduce transport overhead.

### 4.4 Dependency Guardrails (Priority: Medium)
- Apply standardized timeout/retry decorators to prompt, redteam, and MCP runners, surfacing degraded modes instead of binary pass/fail timeouts.
- Emit structured telemetry (start/stop events) for each dependency call to support saturation analysis.

### 4.5 Bus & Schema Lifecycle (Priority: Medium)
- Promote a shared registry singleton that initializes once per process and reuses transport pools for high-frequency emitters.
- Pre-register schemas at bootstrap time and add lightweight validation caches to cut registration overhead.

### 4.6 Observability Enhancements (Priority: Supporting)
- Extend event schemas with correlation IDs, latency buckets, and failure taxonomies to improve debugging for degraded eval runs.【F:packages/evals/src/events/evals-events.ts†L11-L62】
- Instrument gate stages with OpenTelemetry spans and structured logs tagged with suite name, dataset ID, and dependency latencies.

## 5. Phased Roadmap

| Phase | Timeline | Key Deliverables | Dependencies |
|-------|----------|------------------|---------------|
| Phase 1 | 2025-02 → 2025-03 | Parallel gate execution with streaming outcomes; shared schema registry bootstrap | Requires concurrency-safe dependency wrappers, registry singleton wiring |
| Phase 2 | 2025-03 → 2025-04 | Retrieval cache layer, router timeout guards, standardized dependency decorators | Depends on Phase 1 telemetry to size resource pools |
| Phase 3 | 2025-04 → 2025-05 | Bus transport pooling, enriched event schemas, OTEL trace integration | Needs Observability pipeline updates, registry changes landed |

## 6. Risks & Mitigations
- **Concurrency regressions:** Parallelizing suites risks resource contention; mitigate with configurable worker limits and per-suite circuit breakers.
- **Cache staleness:** Persisting retrieval stores may surface stale data; pair caches with dataset hash validation and explicit invalidation hooks.
- **Transport migration complexity:** Moving away from per-call inproc buses requires coordination with A2A transport owners; prototype behind feature flags to stage rollout.

## 7. Next Steps
1. Draft a detailed design doc for parallel gate orchestration, including failure semantics and event emission plans.
2. Prototype embedder/store caching within a feature branch, capturing warm/cold metrics to validate gains.
3. Align with Observability team on schema extensions and trace export destinations ahead of Phase 3.

