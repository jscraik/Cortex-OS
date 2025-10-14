# Cortex AI GitHub Ecosystem Performance Review

- **Assessment Date:** 2025-10-13 (UTC)
- **Reviewer:** Cortex-OS Performance Audit (AI)
- **Scope:** `packages/cortex-ai-github` webhook ingestion, task orchestration, and GitHub Models integration paths.
- **Performance Budgets:** 800 ms cold start, 250 ms p95 latency, 256 MB memory (per package `AGENTS.md`).

## 1. Ecosystem Snapshot

The Cortex AI GitHub package wires an Express webhook server (`CortexWebhookServer`) to the `CortexAiGitHubApp` task manager that proxies work to the GitHub Models API. Event handling flows are:

1. Webhook delivery enters `/webhook`, which validates HMAC signatures, parses payloads, and routes to event-specific handlers before enqueuing tasks on the AI app. [webhook-server.ts:23-214](packages/cortex-ai-github/src/server/webhook-server.ts#L23-L214)
2. `CortexAiGitHubApp.queueTask` stores requests in an in-memory `Map`, emits queue metrics, and immediately processes items when rate limits appear available. [ai-github-app.ts:83-146](packages/cortex-ai-github/src/core/ai-github-app.ts#L83-L146)
3. `callModel` issues a fresh `fetch` POST per task with a per-request abort controller and parses the GitHub Models completion response. [ai-github-app.ts:211-288](packages/cortex-ai-github/src/core/ai-github-app.ts#L211-L288)
4. Progressive status updates and emoji reactions feed back to GitHub via dynamic Octokit clients on every state transition. [webhook-server.ts:305-384](packages/cortex-ai-github/src/server/webhook-server.ts#L305-L384)

## 2. Observed Performance Hot Spots

### 2.1 Queue starvation under rate limiting

- `queueTask` only schedules immediate execution when `rateLimitInfo.remaining > 0`, but no follow-up scheduler revisits queued work after the GitHub Models limit resets. Tasks submitted during a 0-remaining window stay in `taskQueue` without ever executing, causing indefinite backlog and user-visible stalls. [ai-github-app.ts:105-146](packages/cortex-ai-github/src/core/ai-github-app.ts#L105-L146)[ai-github-app.ts:409-420](packages/cortex-ai-github/src/core/ai-github-app.ts#L409-L420)
- Because processing is triggered with `setImmediate`, any burst that arrives before the limiter updates will spin up unbounded concurrent requests. Combined with the missing retry window, this oscillates between over-saturation and starvation.

### 2.2 Unbounded concurrency and missing backpressure

- `processTask` runs for every queued ID without a concurrency cap; `activeRequests` only guards duplicate execution, not total workers. A busy repository can launch dozens of simultaneous `fetch` calls, increasing tail latency and breaching p95 goals. [ai-github-app.ts:147-210](packages/cortex-ai-github/src/core/ai-github-app.ts#L147-L210)
- The webhook handlers enqueue multiple tasks sequentially (e.g., label-driven security + docs scans) without batching or deduping, multiplying parallel load with no prioritization. [webhook-server.ts:215-304](packages/cortex-ai-github/src/server/webhook-server.ts#L215-L304)

### 2.3 Inefficient GitHub feedback loop

- Progressive reactions (`eyes` → `gear` → `rocket`) each await a freshly imported Octokit client, performing redundant module loads and serial API round-trips that extend request handling and hold Express request threads longer than necessary. [webhook-server.ts:305-384](packages/cortex-ai-github/src/server/webhook-server.ts#L305-L384)
- The sequential `await` chain for status updates blocks comment processing until all reactions resolve; slow GitHub API latency can extend webhook response times and increase retry pressure.

### 2.4 Networking overhead on model requests

- Every `callModel` invocation creates a new TCP connection because the code uses the global `fetch` without keep-alive agents; repeated TLS handshakes inflate latency and CPU. [ai-github-app.ts:211-288](packages/cortex-ai-github/src/core/ai-github-app.ts#L211-L288)
- `fetchWithTimeout` spins up a new `AbortController` per call but provides no retry or jitter strategy, causing thundering-herd retries when GitHub briefly hiccups. [fetch-with-timeout.ts:1-18](packages/cortex-ai-github/src/lib/fetch-with-timeout.ts#L1-L18)

### 2.5 Memory pressure from rate limiter store

- The in-memory `requestStore` map never prunes inactive keys beyond the sliding window filter; long-lived installations accumulate per-user arrays indefinitely, risking memory growth and GC churn during busy comment storms. [packages/cortex-ai-github/src/lib/rate-limiter.ts L12–L37](../packages/cortex-ai-github/src/lib/rate-limiter.ts#L12-L37)

## 3. Recommended Remediations

| Priority | Recommendation | Expected Impact | Effort |
| --- | --- | --- | --- |
| 🔴 High | Introduce a token-bucket scheduler that rechecks the queue when rate limits reset (e.g., `setTimeout` for `resetAt`) and caps concurrent workers (p-limit/p-queue). | Prevents queue starvation, smooths throughput spikes, and keeps p95 within 250 ms by avoiding floods. | Medium |
| 🔴 High | Batch webhook-triggered tasks per payload, dedupe duplicate task types, and enqueue via priority queue (security > docs > health). | Cuts redundant model calls and reduces mean + tail latency. | Medium |
| 🟠 Medium | Cache Octokit instances per installation and emit reactions asynchronously (fire-and-forget or background worker) so webhook handlers respond immediately. | Shrinks request handling time, freeing Express threads and reducing retries. | Medium |
| 🟠 Medium | Adopt HTTP keep-alive agents (e.g., `node:https.Agent({ keepAlive: true })`) plus exponential backoff on `fetchWithTimeout`. | Reduces TLS overhead and stabilizes throughput during transient failures. | Medium |
| 🟡 Low | Add periodic cleanup for `requestStore` (LRU or TTL eviction) to bound memory and GC time. | Keeps memory within 256 MB budget under sustained load. | Low |

## 4. Next Steps & Instrumentation

1. Prototype the scheduler/backpressure changes behind a feature flag, validate with load tests that mimic concurrent PR comment bursts (≥50 tasks/min). Target completion by 2025-10-31.
2. Extend observability: emit queue depth, active worker count, and rate-limit remaining to OTEL spans to validate improvements post-rollout.
3. Add integration tests that simulate rate-limit exhaustion to ensure queued tasks resume after reset, preventing regressions.
4. Document Octokit client reuse and background reaction policy in package README once implemented.

---
*Filed under `project-documentation/` for centralized performance tracking of Cortex AI GitHub services.*
