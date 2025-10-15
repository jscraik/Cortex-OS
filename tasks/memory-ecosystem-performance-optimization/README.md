# Memory Ecosystem Performance Optimization — Quick Start

**Task ID**: `memory-ecosystem-performance-optimization`  
**Status**: ✅ Planning Complete → Ready for Implementation  
**Created**: 2025-10-15

---

## 📋 What This Task Does

Optimizes the Cortex-OS memory ecosystem to achieve:

- **30-50% faster** memory ingest (p95 latency reduction)
- **Connection reuse** via HTTP/2 pooling (undici)
- **Parallel embedding** with bounded concurrency (p-limit)
- **Cache efficiency** through LRU eviction
- **Resource cleanup** to prevent timer leaks

---

## 🗂️ Artifact Locations

All planning artifacts are in: `~/tasks/memory-ecosystem-performance-optimization/`

### Essential Reading (in order)

1. **[SUMMARY.md](./SUMMARY.md)** — Executive overview and outcomes
2. **[implementation-plan.md](./implementation-plan.md)** — Detailed 8-task plan with code scaffolds
3. **[tdd-plan.md](./tdd-plan.md)** — Test matrix, fixtures, coverage strategy
4. **[implementation-checklist.md](./implementation-checklist.md)** — Granular task checklist

### Metadata

- **[json/baton.v1.json](./json/baton.v1.json)** — Task handoff contract (machine-readable)

### Outputs (TBD during implementation)

- `test-logs/` — Unit test results, JUnit XML
- `verification/` — Coverage and mutation reports
- `validation/` — k6 performance benchmarks
- `design/` — Architecture diagrams
- `refactoring/` — Code evolution notes
- `monitoring/` — Observability dashboards

---

## 🚀 Quick Start (First Steps)

```bash
# 1. Navigate to task directory
cd ~/tasks/memory-ecosystem-performance-optimization

# 2. Read the implementation plan
cat implementation-plan.md | less

# 3. Review the checklist
cat implementation-checklist.md | less

# 4. Create feature branch
cd /Users/jamiecraik/.Cortex-OS
git checkout -b feat/memory-performance-optimization

# 5. Start with Task 1 (Dependencies)
# Follow implementation-checklist.md step-by-step
```

---

## 📊 Task Breakdown

| Task | Description | Est. Time | Prerequisites |
|------|-------------|-----------|---------------|
| **1** | Install dependencies (undici, p-limit, lru-cache) | 30 min | None |
| **2** | HTTP pooling with undici | 4 hours | Task 1 |
| **3** | Adaptive rate-limit backoff | 3 hours | Task 2 |
| **4** | Parallel chunk embedding | 5 hours | Task 1 |
| **5** | LRU cache eviction | 3 hours | Task 1 |
| **6** | Timer lifecycle cleanup | 2 hours | Task 5 |
| **7** | Performance validation (k6) | 4 hours | Tasks 2-6 |
| **8** | Documentation & ADR | 3 hours | Tasks 1-7 |
| **Total** | | **24 hours** | |

---

## 🎯 Key Files to Modify

### packages/memories

- `src/adapters/rest-api/http-client.ts` — Add undici Pool
- `src/adapters/rest-api/rest-adapter.ts` — Token bucket backoff
- `__tests__/http-pooling.test.ts` — NEW
- `__tests__/rate-limit-backoff.test.ts` — NEW

### packages/memory-core

- `src/services/GraphRAGIngestService.ts` — Parallel embedding
- `src/retrieval/QdrantHybrid.ts` — LRU cache
- `src/caching/DistributedCache.ts` — Timer cleanup
- `src/lib/concurrency.ts` — NEW (bounded queue)
- `src/lib/batch-processor.ts` — NEW (batch util)
- `__tests__/parallel-ingest.test.ts` — NEW
- `__tests__/cache-eviction.test.ts` — NEW

---

## ✅ Quality Gates (Must Pass Before Merge)

```bash
# Coverage
pnpm test:smart -- --coverage
# ≥92% global, ≥95% changed lines

# Mutation
pnpm --filter memory-core test:mutate
# ≥75% score

# Lint & Types
pnpm lint:smart
pnpm typecheck:smart

# Security
pnpm security:scan --scope=memories --scope=memory-core

# Structure
pnpm structure:validate

# Build
pnpm build:smart
```

---

## 🧪 TDD Workflow

Each task follows **Red-Green-Refactor**:

1. **Red**: Write failing test
2. **Green**: Minimal implementation to pass
3. **Refactor**: Improve design, tests still pass
4. **Commit**: Small, atomic, signed commit

Example (Task 2):

```bash
# Red
pnpm --filter memories test http-pooling  # FAILS

# Green
# (implement minimal http-client.ts changes)
pnpm --filter memories test http-pooling  # PASSES

# Refactor
# (extract helpers, add docs)
pnpm --filter memories test http-pooling  # STILL PASSES

# Commit
git add -A
git commit -S -m "feat(memories): add undici HTTP pooling"
```

---

## 🏁 Feature Flags (Staged Rollout)

```bash
# Default (OFF — backward compatible)
MEMORY_HTTP_POOL_ENABLED=false
MEMORY_PARALLEL_INGEST_CONCURRENCY=0  # 0 = disabled

# Optimized (ON — performance mode)
MEMORY_HTTP_POOL_ENABLED=true
MEMORY_PARALLEL_INGEST_CONCURRENCY=4
MEMORY_CACHE_MAX_SIZE=500
```

---

## 📈 Expected Outcomes

### Performance Improvements

- p95 latency: **-30%** (from ~350ms → <250ms)
- Throughput: **+50%** (from ~60 req/s → 90+ req/s)
- Cache hit rate: **+20%** (from ~50% → 70%+)
- Embedding concurrency: **4x** (from 1 → 4 parallel)

### Code Quality

- Coverage: ≥95% changed lines
- Mutation score: ≥75% critical paths
- Zero timer leaks (verified with `--trace-warnings`)

### Operational

- Graceful shutdown with cleanup hooks
- Observability via pool stats, cache metrics
- Staged rollout with instant rollback capability

---

## 🔗 Governance Compliance

This plan strictly follows:

✅ [code-change-planner.prompt.md](file:///Users/jamiecraik/.Cortex-OS/.github/prompts/code-change-planner.prompt.md)  
✅ [AGENTS.md](file:///Users/jamiecraik/.Cortex-OS/packages/agents/AGENTS.md)  
✅ [CODESTYLE.md](file:///Users/jamiecraik/.Cortex-OS/CODESTYLE.md)  
✅ [code-review-checklist.md](file:///Users/jamiecraik/.Cortex-OS/.cortex/rules/code-review-checklist.md)

### Key Requirements Met

- ✅ TDD with Red-Green-Refactor
- ✅ Coverage ≥92% global, ≥95% changed
- ✅ Mutation ≥75%
- ✅ Function size ≤40 lines
- ✅ Named exports only
- ✅ Branded logs: `{ brand: "brAInwav" }`
- ✅ Conventional Commits
- ✅ Signed commits/tags
- ✅ Feature flags for staged rollout
- ✅ DRY, YAGNI, local-first principles

---

## 📞 Support & Questions

- **Primary Contacts**: #cortex-ops
- **Owners**: @brAInwav-devs
- **Research Doc**: [MEMORY_ECOSYSTEM_PERFORMANCE_REVIEW.md](file:///Users/jamiecraik/.Cortex-OS/project-documentation/memory/MEMORY_ECOSYSTEM_PERFORMANCE_REVIEW.md)

---

## 🎓 Learning Resources

### External Standards Referenced

- **IETF RFC 9113**: HTTP/2 specification
- **Node.js HTTP Working Group**: 2025 pooling recommendations
- **Redis Enterprise**: Performance and lifecycle guides

### Libraries Used

- **undici** (v6.x): Node.js official HTTP client
- **p-limit** (v5.x): Promise concurrency control
- **lru-cache** (v10.x): Least-recently-used cache

---

## ⚠️ Important Notes

### Do NOT Skip

- **Pre-commit**: All quality gates must pass
- **TDD**: Write tests BEFORE implementation
- **Feature Flags**: Default to OFF for safety
- **Secrets**: Never commit credentials (use 1Password CLI `op`)

### Critical Constraints

- Node 20+ LTS compatibility required
- Backward compatibility for MCP clients mandatory
- Local-first execution (no async offload yet)
- brAInwav branded logs required

---

**Status**: ✅ Ready for Implementation  
**Next Action**: Begin Task 1 — Dependency Installation  
**Owner**: Assign from @brAInwav-devs

---

*Generated by brAInwav AI Agent following code-change-planner.prompt.md*
