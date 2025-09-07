# A2A Event Bus & Middleware TDD Development Plan

This roadmap details micro-tasks to reach operational readiness for `packages/a2a` and `packages/a2a-services`. Each step follows strict TDD:

1. **Red test** – write failing test(s) describing the requirement.
2. **Green code** – implement minimal code to pass tests.
3. **Refactor** – improve design while keeping tests green.

Every bullet below represents a separate commit following Conventional Commits (e.g., `feat(a2a): enforce topic ACLs`).

---

## 1. `packages/a2a` – Event Bus

### 1.1 Topic ACLs (Should)

- test(a2a): publish/subscribe denied without ACL entry.
- feat(a2a): minimal ACL enforcement for topics.
- refactor(a2a): optimize ACL checks & document configuration.

### 1.2 Redaction (Should)

- test(a2a): sensitive fields are removed before logging/persisting.
- feat(a2a): schema-driven redaction utility.
- refactor(a2a): centralize redaction rules and add docs.

### 1.3 Replay Helpers (Nice)

- test(a2a): replay API reprocesses outbox/DLQ messages in order.
- feat(a2a): implement replay helpers and CLI entry point.
- refactor(a2a): improve replay performance & document usage.

### 1.4 Quality Upgrades

- test(a2a): edge cases for CloudEvents, idempotency, correlation IDs.
- refactor(a2a): simplify outbox/DLQ internals with confidence from tests.

---

## 2. `packages/a2a-services` – Bus Middleware

### 2.1 Quotas (Mission & Should: per agent)

- test(a2a-services): global quota exceeded triggers 429.
- feat(a2a-services): implement global quota enforcement.
- test(a2a-services): per-agent quota limits usage.
- feat(a2a-services): add per-agent quota tracking.
- refactor(a2a-services): consolidate limiter and quota logic.

### 2.2 Schema Registry Client (Mission)

- test(a2a-services): client fetches and caches schemas from registry.
- feat(a2a-services): implement schema registry client with caching.
- refactor(a2a-services): expose typed helpers and document usage.

### 2.3 Burst Smoothing (Nice)

- test(a2a-services): bursts are smoothed to configured rate.
- feat(a2a-services): add token-bucket burst smoother.
- refactor(a2a-services): tune smoothing algorithm & config docs.

### 2.4 Quality Upgrades

- test(a2a-services): extend coverage for validators and rate limiter.
- refactor(a2a-services): cleanup middleware API based on tests.

---

## 3. Documentation & Ops

- docs(a2a): usage guides for ACLs, redaction, replay, quotas, schema client, burst smoothing.
- chore(ci): ensure lint, test, and type-check run for all packages.

---

## 4. Verification Checklist for Each Commit

1. `pre-commit run --files <changed files>`
2. `pnpm lint`
3. `pnpm test`

---

## 5. Milestones

- **M1 – Core compliance**: Topic ACLs, Redaction, Quotas, Schema Client.
- **M2 – Enhanced reliability**: Replay helpers, Burst smoothing.
- **M3 – Documentation & cleanup**: Docs complete, CI hardened.
