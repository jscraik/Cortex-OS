# Research Document: CBOM Ecosystem Performance Review

**Task ID**: `review-cbom-ecosystem-performance`
**Created**: 2025-08-28
**Researcher**: AI Agent
**Status**: Complete

---

## Objective

Assess the current Context Bill of Materials (CBOM) instrumentation pipeline for throughput and latency bottlenecks, and recommend performance improvements that preserve attestability and policy compliance.

---

## Current State Observations

### Existing Implementation
- **Location**: `packages/cbom/src/emitter.ts`
- **Current Approach**: The emitter wires itself into the A2A router and OpenTelemetry tracer, serializing envelopes and spans into JSON, redacting data, and buffering evidence in-memory before flushing documents to disk. Git metadata is detected by synchronously shelling out to `git` during emitter construction. (see `packages/cbom/src/emitter.ts` lines 32-125 and 205-272)
- **Limitations**: Heavy JSON serialization occurs inline on every dispatch, evidence is stored in a single-threaded `Map`, and synchronous `spawnSync` invocations block the event loop for repository metadata, compounding latency under bursty routing. File flushes rewrite entire documents with pretty-printing, inflating I/O costs. (see `packages/cbom/src/emitter.ts` lines 50-124 and 266-272)

### Related Components
- **CbomRedactor**: Performs per-call hashing and optional file reads, relying on repeated SHA-256 computations without caching, leading to duplicated work when the same payload appears across spans or files. (see `packages/cbom/src/redactor.ts` lines 6-44)
- **CbomReplayer**: Replays decisions sequentially and performs `await` within the loop for each decision, lacking batching or concurrency controls, which limits throughput for large CBOM archives. (see `packages/cbom/src/replayer.ts` lines 12-46)
- **CLI (`cli/index.ts`)**: The record, export, and attest commands rebuild TypeScript output each invocation and duplicate file copies instead of streaming, causing redundant filesystem churn on large artifacts. (see `packages/cbom/cli/index.ts` lines 11-70)
- **CbomSigner**: Reads full CBOM payloads into memory and synchronously generates Ed25519 key pairs when keys are absent, performing blocking crypto operations and multiple filesystem writes per attestation. (see `packages/cbom/src/signer.ts` lines 38-114)

### brAInwav-Specific Context
- **MCP Integration**: The emitter hooks into A2A router dispatch to capture tool activity, but lacks back-pressure or streaming integration with MCP logs, risking dropped spans when MCP bursts occur.
- **A2A Events**: Router instrumentation currently wraps dispatch without metrics or queuing, so A2A throughput is limited by JSON serialization latency.
- **Local Memory**: CBOM artifacts feed retention and auditing; any batching or caching must preserve deterministic hashes to maintain memory and compliance workflows.
- **Existing Patterns**: Other packages (e.g., observability) employ async span processors with queue buffers; mirroring that pattern could absorb load spikes while keeping output deterministic.

---

## External Standards & References

### Industry Standards
1. **NIST AI Risk Management Framework (RMF)**
   - **Relevance**: Emphasizes traceability and timely capture of AI system context, reinforcing the need for low-latency CBOM capture while preserving auditability.
   - **Key Requirements**: Deterministic logging, integrity preservation, and prompt availability for governance reviews.

2. **CycloneDX ML-BOM 1.6**
   - **Relevance**: CBOM exports to CycloneDX ML-BOM; exporter performance must support timely artifact generation for downstream supply-chain tooling.
   - **Key Requirements**: Accurate component metadata, consistent hashing, and compatibility with existing BOM pipelines.

### Best Practices (2025)
- **Node.js Observability Pipelines**: Recommended to offload span processing to bounded worker queues with bulk JSON encoding and reuse of keep-alive file handles to avoid blocking the event loop. Source: Node.js Diagnostics Working Group 2025 guidelines.
  - Application: Introduce buffered span capture and asynchronous flush scheduling inside `CbomEmitter`.
- **Supply Chain Attestation**: Modern attest tooling caches signer keys and streams large payloads through incremental hashing to minimize memory pressure. Source: in-toto community roadmap 2025.
  - Application: Cache key material and adopt streaming digests in `CbomSigner`.

### Relevant Libraries/Frameworks
| Library | Version | Purpose | License | Recommendation |
|---------|---------|---------|---------|----------------|
| `piscina` | ^4.x | Worker thread pool for CPU-bound hashing/redaction | MIT | ⚠️ Evaluate |
| `stream-json` | ^1.x | Streaming JSON parser/stringifier | MIT | ✅ Use |
| `lru-cache` | ^11.x | Memoization cache for repeated hashes/pointers | MIT | ✅ Use |

---

## Technology Research

### Option 1: Buffered Event Loop with Streaming IO

**Description**: Introduce a bounded buffer inside `CbomEmitter` that queues evidence mutations and flushes batches on a timer or when thresholds are reached. Replace `JSON.stringify` hot paths with incremental serialization via `stream-json`, and reuse a single file descriptor per report.

**Pros**:
- ✅ Reduces per-dispatch latency by decoupling routing from disk writes.
- ✅ Enables batching of repeated hash computations via memoization.
- ✅ Maintains deterministic output by ordering batches deterministically.

**Cons**:
- ❌ Requires careful back-pressure handling to avoid buffer overflows.
- ❌ Adds complexity to ensure crash-safe flush ordering.

**brAInwav Compatibility**:
- Aligns with observability queue patterns already accepted in governance.
- Needs guardrails to persist evidence before process exit to protect audit trails.
- Security impact is low; hashed content remains unchanged.

**Implementation Effort**: Medium

---

### Option 2: Worker Thread Hashing & Redaction Pool

**Description**: Offload hashing and redaction to a worker thread pool (e.g., `piscina`), allowing the main thread to continue routing while CPU-bound SHA-256 operations run in parallel.

**Pros**:
- ✅ Improves throughput when multiple spans or tool calls arrive simultaneously.
- ✅ Frees the event loop to handle MCP/A2A traffic.

**Cons**:
- ❌ Worker startup overhead may dominate small workloads.
- ❌ Shared memory must be managed carefully to avoid copying large payloads.

**brAInwav Compatibility**:
- Must respect deterministic hashing (workers must be pure functions).
- Requires additional governance review for thread pool sizing in constrained deployments.

**Implementation Effort**: Medium-High

---

### Option 3: Incremental Attestation Pipeline

**Description**: Refactor `CbomSigner` and CLI commands to stream CBOM payloads from disk, compute rolling hashes, and reuse cached Ed25519 key material. Add optional chunked writes for large attestations.

**Pros**:
- ✅ Cuts peak memory usage and avoids blocking crypto operations.
- ✅ Enables reuse of cached keys to eliminate redundant generation.

**Cons**:
- ❌ Streaming JSON requires adapting exporter and signer interfaces.
- ❌ Caching keys introduces state that must be synchronized across environments.

**brAInwav Compatibility**:
- Supports compliance by ensuring attestations remain deterministic.
- Requires security review for key caching strategy.

**Implementation Effort**: Medium

---

## Comparative Analysis

| Criteria | Option 1 | Option 2 | Option 3 |
|----------|----------|----------|----------|
| **Performance** | High (batch flush, reduced blocking) | Medium (CPU offload gains) | Medium (faster attest/export) |
| **Security** | High (no new key handling) | Medium (thread isolation) | Medium (key cache governance) |
| **Maintainability** | Medium (buffer orchestration) | Medium-Low (worker management) | Medium (streaming interfaces) |
| **brAInwav Fit** | High (aligns with observability patterns) | Medium (needs ops guardrails) | Medium (requires key handling SOP) |
| **Community Support** | Medium (libraries maintained) | Medium (piscina stable) | High (streaming + in-toto patterns common) |
| **License Compatibility** | High (MIT) | High (MIT) | High (MIT) |

---

## Recommended Approach

Pursue **Option 1** as the primary initiative: implement buffered capture with streaming flush and memoization to address the highest-impact event-loop stalls while keeping architecture simple. Combine it with selective elements of Option 3 (key caching) once buffered writes stabilize, deferring worker thread adoption unless profiling shows CPU saturation persists.

---

## Implementation Considerations

### Dependencies to Add
```json
{
  "dependencies": {
    "stream-json": "^1.8.0",
    "lru-cache": "^11.0.0"
  }
}
```

**License Verification Required**:
- [ ] `stream-json` - MIT - ✅ Compatible
- [ ] `lru-cache` - MIT - ✅ Compatible

### Configuration Changes
- **File**: `packages/cbom/project.json`
- **Changes**: Add targeted Nx tasks for buffered flush benchmarking and profiling commands.

### Database Schema Changes
- **Migration Required**: No
- **Impact**: N/A

### Breaking Changes
- **API Changes**: None if flush semantics remain backward compatible; ensure `CbomEmitter` exposes `flush()` for deterministic tests.
- **Migration Path**: Document new async flush lifecycle and update CLI to await final flush before exit.

---

## Timeline Estimate

| Phase | Effort | Description |
|-------|--------|-------------|
| **Setup** | 1-2 days | Add dependencies, baseline benchmarks, guard feature flags |
| **Core Implementation** | 3-4 days | Implement buffered emitter, memoization, streaming writer |
| **Testing** | 2 days | Unit tests for buffering, integration tests for CLI commands |
| **Integration** | 1 day | Wire into MCP/A2A workflows and ensure telemetry coverage |
| **Documentation** | 1 day | Update README, runbooks, and changelog |
| **Total** | 8-10 days | |

---

## Related Research

### Internal Documentation
- `project-documentation/RAG_ECOSYSTEM_PERFORMANCE_REVIEW.md` (for reference on documenting ingestion pipelines)
- `packages/observability` docs on span buffering strategies
- `PERFORMANCE_OPTIMIZATION_GUIDE.md` for governance constraints

### External Resources
- NIST AI RMF 1.0 overview – guidance on trustworthy AI operations
- in-toto Attestation Framework 2025 roadmap – signer caching recommendations
- Node.js Diagnostics WG 2025 notes – event-loop friendly telemetry patterns

### Prior Art in Codebase
- **Similar Pattern**: `packages/observability/src/span-processor` (queue-backed processing)
  - **Lessons Learned**: Use bounded queues and flush on process exit to guarantee delivery.
  - **Reusable Components**: Backoff utilities and metrics instrumentation helpers.

---

## Next Steps

1. **Immediate**:
   - [ ] Capture flamegraphs of `cortex-cbom record` during high A2A load.
   - [ ] Profile synchronous git detection to confirm impact on startup latency.

2. **Before Implementation**:
   - [ ] Get stakeholder approval on buffered emitter design.
   - [ ] Create TDD plan based on this research.
   - [ ] Verify all dependencies are license-compatible.
   - [ ] Document findings in local memory MCP.

3. **During Implementation**:
   - [ ] Validate buffering thresholds with integration tests.
   - [ ] Monitor flush timing metrics for regressions.
   - [ ] Update research doc if new risks emerge.

---

## Appendix

### Code Samples

```typescript
// Proposed buffered evidence queue interface
type EvidenceMutation = () => void;

export class BufferedCbomEmitter extends CbomEmitter {
  private queue: EvidenceMutation[] = [];
  private draining = false;
  private readonly maxBatch = 64;

  enqueue(mutation: EvidenceMutation) {
    this.queue.push(mutation);
    if (!this.draining && this.queue.length >= this.maxBatch) {
      void this.flushQueue();
    }
  }

  private async flushQueue() {
    this.draining = true;
    const batch = this.queue.splice(0, this.maxBatch);
    for (const apply of batch) {
      apply();
    }
    this.draining = false;
  }
}
```

### Benchmarks

- Capture baseline: event-loop delay under 100 tool calls/sec with current emitter.
- Target: reduce median dispatch latency by ≥40% and keep CBOM write time under 50 ms per batch.

### Screenshots/Diagrams

- N/A (CLI-only change).

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-08-28 | AI Agent | Initial research |

---

**Status**: Complete

**Stored in Local Memory**: No (pending tooling availability)

Co-authored-by: brAInwav Development Team
