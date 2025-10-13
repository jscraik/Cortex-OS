# SKILLS Package Performance Review — 2025-10-13

**Scope**: `packages/memory-core/src/skills`
**Auditor**: gpt-5-codex
**Objective**: Document loader and registry bottlenecks that limit large skill corpora throughput and outline remediation steps that preserve correctness and governance guarantees.

## Executive Summary
- Loader throughput collapses under large repositories because directory walks and batch validation run sequentially. Meanwhile, skill parsing and policy checks execute with unbounded concurrency, causing bursty CPU spikes followed by idle waits. Tighten concurrency and reuse intermediate artifacts to keep p95 ingestion under control.
- Registry search performs an \(O(n)\) table scan that rebuilds scoring inputs on every call. It ignores existing secondary indexes and recompiles regular expressions per document. This approach will not meet the 250 ms SLA once catalogs grow past a few hundred entries. Adopt index-driven narrowing and cached term vectors to make lookups proportional to result size.
- Observability is minimal: cache statistics are exposed but no timings, high-water marks, or rejection metrics are emitted. Without instrumentation, regression detection and capacity planning for the SKILLS surface remain guesswork.

## Architecture Snapshot
- File-system loader: recursive directory scan, YAML parsing, schema/security/ethics validation, and optional LRU cache for parsed skills.【F:packages/memory-core/src/skills/loaders/skill-loader.ts†L97-L361】
- Batch ingestion utility that maps directories into memory, reporting successes, failures, and cache stats.【F:packages/memory-core/src/skills/loaders/skill-loader.ts†L398-L432】
- In-memory registry offering batch registration, secondary indexes, ad-hoc search, and lifecycle operations.【F:packages/memory-core/src/skills/registry/skill-registry.ts†L166-L518】

## Observed Performance Risks
### Loader pipeline
1. **Sequential directory traversal** – `scanDirectory` awaits each recursive branch serially; on SSDs this forfeits I/O parallelism during cold loads.【F:packages/memory-core/src/skills/loaders/skill-loader.ts†L191-L228】
2. **Unbounded concurrency for heavy validation** – `loadSkillsFromDirectory` fans out every file via `Promise.all`. As a result, YAML parsing, schema validation, security checks, and ethics validation all compete simultaneously. This risks event-loop starvation on large batches.【F:packages/memory-core/src/skills/loaders/skill-loader.ts†L292-L408】
3. **Global cache without size tuning** – A single `SkillCache` with a fixed 1 000-entry cap is shared by all loaders, yet `cacheMaxSize` from options is never plumbed through, preventing callers from tailoring eviction to corpus size.【F:packages/memory-core/src/skills/loaders/skill-loader.ts†L96-L185】【F:packages/memory-core/src/skills/loaders/skill-loader.ts†L252-L361】

### Registry and indexing
1. **Batch registration is serial** – `registerBatch` loops with `await this.register(skill)`; because the underlying work is CPU-bound validation and map updates, the `await` introduces needless task switching while preventing intra-batch parallelism.【F:packages/memory-core/src/skills/registry/skill-registry.ts†L166-L183】
2. **Search ignores indexes** – Queries always clone `this.skills.values()` and filter in JavaScript, even though category, difficulty, and tag indexes already exist; this keeps search \(O(n)\) regardless of filter selectivity.【F:packages/memory-core/src/skills/registry/skill-registry.ts†L334-L413】
3. **Full rescans for statistics** – `getStats` iterates the entire map each call to compute counts, which will become a hotspot for dashboards; a streaming counter or incremental aggregation would avoid repeated \(O(n)\) passes.【F:packages/memory-core/src/skills/registry/skill-registry.ts†L245-L260】

### Search scoring
1. **Per-request string normalization** – Each search recomputes `toLowerCase` across names, descriptions, tags, and content, duplicating work that could be pre-indexed during registration.【F:packages/memory-core/src/skills/registry/skill-registry.ts†L389-L488】
2. **Dynamic regular-expression compilation** – `scoreSkill` builds `new RegExp(keywordsLower, 'g')` per skill, which is costly for multi-term queries and risks catastrophic backtracking on unsanitized keywords.【F:packages/memory-core/src/skills/registry/skill-registry.ts†L444-L488】

## Recommended Optimizations
1. **Adopt bounded concurrency for ingestion**: introduce a worker pool (e.g., `p-limit`) so only \(k\) files are parsed/validated at once while the directory walker prefetches the next batch.【F:packages/memory-core/src/skills/loaders/skill-loader.ts†L292-L408】
2. **Surface cache tuning hooks**: thread `cacheMaxSize` through to the `SkillCache` constructor and expose eviction metrics so operators can align cache size with tenant corpus volume.【F:packages/memory-core/src/skills/loaders/skill-loader.ts†L96-L185】【F:packages/memory-core/src/skills/loaders/skill-loader.ts†L252-L361】
3. **Leverage secondary indexes for filtering**: build candidate sets via intersection/union of the per-field indexes before scoring to avoid scanning the entire map for every query.【F:packages/memory-core/src/skills/registry/skill-registry.ts†L334-L413】
4. **Precompute normalized tokens**: store lowercase variants and simple token vectors during registration so search scoring can reuse them without repeated allocation.【F:packages/memory-core/src/skills/registry/skill-registry.ts†L166-L488】
5. **Replace per-skill regex creation**: tokenize keyword input once, reuse compiled expressions, and enforce length limits to prevent expensive backtracking during content scans.【F:packages/memory-core/src/skills/registry/skill-registry.ts†L444-L488】
6. **Parallelize safe registry operations**: where map mutations are absent (e.g., read-mostly stats), defer to snapshotting or incremental counters to keep analytics cheap.【F:packages/memory-core/src/skills/registry/skill-registry.ts†L245-L260】

## Instrumentation & Testing Gaps
- Loader exposes hit/miss counts but omits timing histograms, validation latency, or queue depth metrics, leaving ingestion regressions undetected.【F:packages/memory-core/src/skills/loaders/skill-loader.ts†L97-L185】【F:packages/memory-core/src/skills/loaders/skill-loader.ts†L398-L432】
- Registry lacks unit tests or benchmarks for search throughput under realistic datasets; add focused performance specs covering cold cache, warm cache, and failure-path behavior.

## Next Steps
1. Prototype a concurrency-limited loader and capture ingest benchmarks across 100, 1 000, and 5 000 skill files.
2. Rework search to construct candidate sets from indexes and profile latency against existing implementation.
3. Add instrumentation (structured logs or metrics) for loader latency, cache eviction, registry search counts, and result sizes to guide capacity planning.
