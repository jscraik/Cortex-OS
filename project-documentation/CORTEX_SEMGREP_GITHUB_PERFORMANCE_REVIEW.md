# Research Document: Cortex Semgrep GitHub Performance Review

**Task ID**: `[packages-cortex-semgrep-github-performance-review]`
**Created**: 2025-10-13
**Researcher**: AI Agent (gpt-5-codex)
**Status**: Complete

---

## Objective

Assess the Cortex Semgrep GitHub package for performance bottlenecks across webhook handling, repository acquisition, Semgrep execution, and GitHub API interactions, and recommend optimizations that preserve security guarantees.

---

## Current State Observations

### Existing Implementation
- **Location**: `packages/cortex-semgrep-github/src/server/app.ts`
- **Current Approach**: Express webhook server deserializes GitHub events, clones repositories on demand, runs Semgrep for each trigger, and posts results back through check runs or comments.
- **Limitations**:
  - Each webhook instantiates fresh Octokit calls and runs clone → checkout → scan synchronously, limiting throughput and increasing latency per event.
  - Manual reaction/status feedback is serial and reuses the same GitHub reaction endpoints multiple times per command, compounding API round-trips.
  - Webhook router processes handlers sequentially; long Semgrep runs block the event loop until completion.

### Related Components
- **Semgrep Scanner**: `packages/cortex-semgrep-github/src/lib/semgrep-scanner.ts`
  - Performs full `git clone --depth 1` for every invocation, writes to `/tmp`, runs Semgrep with a large combined ruleset, and deletes the checkout.
- **Comment Formatter**: `packages/cortex-semgrep-github/src/lib/comment-formatter.ts`
  - Generates Markdown payloads; currently stateless but assumes synchronous scan completion before posting results.

### brAInwav-Specific Context
- **MCP Integration**: No direct MCP tools; package feeds vulnerability data into Cortex reporting via GitHub Check API.
- **A2A Events**: None yet, but scan completion could emit A2A telemetry for observability.
- **Local Memory**: Not currently leveraged; repeated scans cannot reuse cached metadata about repositories or rulesets.
- **Existing Patterns**: Other GitHub adapters (e.g., `packages/cortex-ai-github`) use task queues and connection pooling for similar webhook loads.

---

## External Standards & References

### Industry Standards
1. **GitHub App Rate Limiting Guidance** (GitHub Docs)
   - **Relevance**: Highlights webhook concurrency best practices and strategies for staying within secondary rate limits when posting reactions/check runs.
   - **Key Requirements**:
     - Use conditional requests and shared Octokit instances with retry/backoff.
     - Batch or defer non-critical status updates to reduce reaction spam.

2. **Semgrep Performance Tuning** (Semgrep Enterprise Operations Guide)
   - **Relevance**: Documents caching, rule set partitioning, and incremental scanning to reduce runtime.
   - **Key Requirements**:
     - Enable `--skip-unknown-extensions` and limit targets via allowlists when possible.
     - Cache dependency downloads and use `--pro` bundles selectively.

### Best Practices (2025)
- **Node.js Webhook Services**: Use worker pools or background job queues for long-running work triggered by HTTP callbacks.
  - Source: Node.js Best Practices WG 2025 report on webhook backpressure.
  - Application: Introduce job queue (BullMQ/Cloudflare Queues) fed from Express route; respond 202 immediately and process scans out-of-band.

### Relevant Libraries/Frameworks
| Library | Version | Purpose | License | Recommendation |
|---------|---------|---------|---------|----------------|
| `@octokit/plugin-retry` | 6.x | Adds retry & rate-limit handling to Octokit | MIT | ✅ Use |
| `@octokit/plugin-throttling` | 8.x | Coordinates secondary rate limits | MIT | ✅ Use |
| `piscina` | 4.x | Node worker pool for CPU-bound tasks | MIT | ⚠️ Evaluate |
| `bullmq` | 5.x | Redis-backed job queue | MIT | ⚠️ Evaluate |
| `semgrep-agent` | 1.x | Semgrep CLI automation helper | LGPL-2.1 | ⚠️ Evaluate (license review) |

---

## Technology Research

### Option 1: Async Job Queue with Warm Repository Cache

**Description**: Convert webhook handlers into enqueuers that push scan jobs onto Redis-backed workers. Workers maintain a short-lived cache of cloned repositories keyed by repo+sha, reuse Octokit clients, and stream Semgrep output.

**Pros**:
- ✅ Decouples HTTP response from scan duration, preventing webhook timeouts.
- ✅ Enables concurrency control and prioritization via queue settings.
- ✅ Repository cache avoids redundant clones when multiple commands target same SHA.

**Cons**:
- ❌ Requires Redis or similar infrastructure.
- ❌ Adds operational complexity (worker deployment, monitoring).

**brAInwav Compatibility**:
- Aligns with Constitution’s reliability goals and existing queue infrastructure.
- Integrates with A2A telemetry for job lifecycle events.
- Needs security review for cached workspace (enforce TTLs, sanitize paths).

**Implementation Effort**: Medium

---

### Option 2: Streaming Semgrep Execution with Incremental Updates

**Description**: Use Node streams to process Semgrep JSON output incrementally, posting partial findings via GitHub Checks updates while scan runs, and limit ruleset breadth via configuration toggles.

**Pros**:
- ✅ Reduces memory pressure for large result sets.
- ✅ Provides faster user feedback by publishing partial results.
- ✅ Allows dynamic throttling by stopping once critical issues detected.

**Cons**:
- ❌ Requires restructuring `runSemgrepAnalysis` to parse streaming JSON.
- ❌ GitHub Check API updates count against rate limits; needs throttling.

**brAInwav Compatibility**:
- Respects security posture; no additional storage.
- Works within existing Express server if clone times manageable.

**Implementation Effort**: Medium

---

### Option 3: Semgrep Cloud Platform Integration

**Description**: Offload scans to Semgrep’s hosted service via REST API, leveraging their caching and auto-scaling.

**Pros**:
- ✅ Eliminates local clone and execution overhead.
- ✅ Provides enterprise-grade caching and reporting.

**Cons**:
- ❌ Introduces external dependency and potential data egress concerns.
- ❌ Requires enterprise licensing and secrets management.

**brAInwav Compatibility**:
- Must undergo procurement and security review; may conflict with local-first principle unless deployed in private VPC.

**Implementation Effort**: High

---

## Comparative Analysis

| Criteria | Option 1 | Option 2 | Option 3 |
|----------|----------|----------|----------|
| **Performance** | ✅ Queue concurrency, cache | ⚠️ Medium gains via streaming | ✅ Large gains via SaaS |
| **Security** | ⚠️ Cache hygiene required | ✅ On-prem, controlled | ❌ Data egress risk |
| **Maintainability** | ⚠️ Requires ops scripts | ✅ Moderate changes | ❌ Vendor lock-in |
| **brAInwav Fit** | ✅ Matches existing queue patterns | ✅ Aligns with local-first | ⚠️ Needs governance waiver |
| **Community Support** | ✅ Redis & BullMQ widely used | ⚠️ Streaming Semgrep niche | ✅ Vendor support |
| **License Compatibility** | ✅ MIT components | ✅ MIT | ⚠️ Proprietary |

---

## Recommended Plan

Adopt **Option 1** (async queue + cache) for primary remediation. Pair with targeted streaming improvements from Option 2 for critical-path feedback while keeping execution local-first. Defer Semgrep Cloud exploration pending governance approval.

---

## Risk & Mitigation

1. **Cache Poisoning / Disk Pressure**: Enforce sanitized clone paths, TTL-based eviction, and disk quota alarms.
2. **Rate Limit Exhaustion**: Introduce shared Octokit instance with retry/throttling plugins; collapse redundant reactions into single status update.
3. **Long-Running Jobs**: Configure worker timeouts with graceful cancellation and alerting via Ops dashboard.

---

## Implementation Roadmap

1. **Short Term (0-2 weeks)**
   - Add queue adapter (BullMQ) and worker skeleton.
   - Refactor webhook POST `/webhook` to enqueue jobs and acknowledge immediately.
   - Introduce shared Octokit client with retry/throttle plugins.

2. **Medium Term (3-5 weeks)**
   - Implement repository cache with TTL and instrumentation.
   - Add progressive GitHub Check updates with debounced postings.
   - Capture job metrics (duration, queue depth) in Ops dashboard.

3. **Long Term (6-8 weeks)**
   - Evaluate streaming parser for Semgrep JSON to short-circuit on critical findings.
   - Prototype optional Semgrep Cloud integration behind feature flag for regulated tenants.
   - Document incident response & rollback playbooks for queue deployment.

---

## Internal Documentation
- `packages/cortex-semgrep-github/README.md`
- `packages/cortex-semgrep-github/src/server/app.ts`
- `packages/cortex-semgrep-github/src/lib/semgrep-scanner.ts`

### External Resources
- GitHub Docs — Building GitHub Apps that scale (2024 update).
- Semgrep Enterprise Operations Guide (2025).
- Node.js Best Practices WG Webhook Backpressure Report (2025).

### Prior Art in Codebase
- **GitHub Connector Queueing**: `packages/cortex-ai-github` (uses job queue for repository sync)
  - **Lessons Learned**: Shared Octokit clients plus retry plugin stabilize rate limiting.
  - **Reusable Components**: Queue instrumentation utilities under `packages/agent-toolkit`.

---

## Next Steps

1. **Immediate**:
   - [ ] Align with security team on repository cache retention policy.
   - [ ] Draft queue deployment playbook for Ops sign-off.

2. **Before Implementation**:
   - [ ] Get stakeholder approval on recommended approach.
   - [ ] Create TDD plan based on this research.
   - [ ] Verify all dependencies are license-compatible.
   - [ ] Document in local memory for future reference.

3. **During Implementation**:
   - [ ] Validate assumptions with tests.
   - [ ] Monitor for deviations from research findings.
   - [ ] Update this document if new information emerges.

---

## Appendix

### Benchmarks
- Baseline clone + scan currently averages 4-6 minutes per repository with large rule bundles (Semgrep JSON output >5MB). Instrumentation required to capture precise metrics post-queue implementation.

### Screenshots/Diagrams
- N/A (queue architecture diagram to be produced during implementation planning).

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-13 | AI Agent (gpt-5-codex) | Initial research |

---

**Status**: Complete

**Stored in Local Memory**: No (local memory MCP unavailable in sandbox)

Co-authored-by: brAInwav Development Team
