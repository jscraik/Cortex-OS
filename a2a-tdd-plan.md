# A2A Event Bus & Middleware TDD Development Plan

This roadmap details micro-tasks to reach operational readiness for `packages/a2a` and `packages/a2a-services`. Each step follows strict TDD:

1. **Red test** – write failing test(s) describing the requirement.
2. **Green code** – implement minimal code to pass tests.
3. **Refactor** – improve design while keeping tests green.

Every bullet below represents a separate commit following Conventional Commits (e.g., `feat(a2a): enforce topic ACLs`).

---

## 1. `packages/a2a` – Event Bus

### 1.1 Topic ACLs (Should) ✅ Completed

- ✅ test(a2a): publish/subscribe denied without ACL entry.
- ✅ feat(a2a): minimal ACL enforcement for topics.
- ✅ refactor(a2a): optimize ACL checks & document configuration.

### 1.2 Redaction (Should) ✅ Completed

- ✅ test(a2a): sensitive fields are removed before logging/persisting.
- ✅ feat(a2a): schema-driven redaction utility.
- ✅ refactor(a2a): centralize redaction rules and add docs.

### 1.3 Replay Helpers (Nice) ✅ Completed

- ✅ test(a2a): replay API reprocesses outbox/DLQ messages in order.
- ✅ feat(a2a): implement replay helpers and CLI entry point.
- ✅ refactor(a2a): improve replay performance & document usage.

### 1.4 Quality Upgrades (Completed + Follow-ups)

- ✅ baseline tests for core features (outbox, ACL, redaction, replay).
- ✅ idempotency & correlation: bus-level dedupe + auto correlationId generation.
- ✅ refactor(a2a): simplify outbox/DLQ internals (initial pass complete).
- ▶️ follow-up: distributed idempotency store & richer correlation chain tests.

---

## 2. `packages/a2a-services` – Bus Middleware

### 2.1 Quotas (Mission & Should: per agent) ✅ Completed

- ✅ test: global quota exceeded triggers 429.
- ✅ feat: implement global quota enforcement.
- ✅ test: per-agent quota limits usage.
- ✅ feat: per-agent quota tracking.
- ✅ refactor: consolidated basic logic (future: external store for distribution).

### 2.2 Schema Registry Client (Mission) ✅ Completed

- ✅ test: client fetches and caches schemas.
- ✅ feat: caching layer with TTL + LRU.
- ✅ refactor: metrics exposed.

### 2.3 Burst Smoothing (Nice) ✅ Completed

- ✅ test: smoothing enforcement & per-key buckets.
- ✅ feat: token-bucket smoother.
- ✅ refactor: metrics hook via middleware.metrics().

### 2.4 Quality Upgrades (Extended)

- ✅ integration test layering (smoothing + quota + ACL + redaction + idempotency behaviors).
- ✅ Redis quota backend (fallback to memory if unavailable).
- ✅ Prometheus exposition endpoint (optional).
- ▶️ follow-up: production metrics counters & distributed smoothing token bucket.

---

## 3. Documentation & Ops

-- ✅ docs(a2a-services): base docs + pending expansion for new middleware (in progress).
-- ✅ base CI scripts exist; ⬜ ensure full matrix coverage for new middleware (follow-up).

---

## 4. Verification Checklist for Each Commit

1. Optional quick local checks: `pnpm biome:staged` and `pnpm test:safe`
2. `pnpm lint`
3. `pnpm test`

---

## 5. Milestones

-- **M1 – Core compliance**: ✅
-- **M2 – Enhanced reliability**: ✅
-- **M3 – Documentation & cleanup**: ▶️ (Docs done; remaining edge tests pending)

## Readiness Summary (Added)

| Area | Status | Notes |
|------|--------|-------|
| ACL | ✅ | Enforced via pseudo-topic mapping in schema registry |
| Redaction | ✅ | Path-based redactor applied to all GET responses |
| Replay Helpers | ✅ | Outbox/DLQ replay utilities + tests |
| Global Quota | ✅ | In-memory windowed counter|
| Per-Agent Quota | ✅ | In-memory per-id counters |
| Rate Limiter | ✅ | Simple IP-based limiter |
| Burst Smoothing | ✅ | Token bucket with per-header buckets |
| Schema Client Cache | ✅ | TTL + LRU + metrics |
| Docs | ✅ | Middleware + env vars + metrics documented |
| Edge / Advanced Tests | ▶️ | Distributed idempotency + deep validator/rate limiter edges deferred |
| Prometheus Metrics | ✅ | /metrics/prom (optional) placeholder counters |
| Redis Quota Backend | ✅ | Fallback auto to in-memory when REDIS_URL missing |
| Metrics Endpoint | ✅ | /metrics JSON implemented |
| Env Configuration | ✅ | All middleware configurable via env |

Legend: ✅ done · ▶️ partial · ⬜ pending
