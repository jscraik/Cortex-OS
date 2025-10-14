# Agentic Second Brain — Production Readiness Checklist and TDD Task Tracker

Last updated: 2025-09-15

## Governance Artifact Template Map

| Artifact | Template Path | Expected Storage Location |
| --- | --- | --- |
| Feature Specification | `/.cortex/templates/feature-spec-template.md` | `~/tasks/[feature]/feature-spec.md` (link in PR summary) |
| Research Dossier | `/.cortex/templates/research-template.md` | `~/tasks/[feature]/research/` (include hybrid model logs) |
| TDD Plan | `/.cortex/templates/tdd-plan-template.md` | `~/tasks/[feature]/planning/tdd-plan.md` (referenced in implementation log) |
| Code Review Checklist | `/.cortex/rules/code-review-checklist.md` | Top-level PR comment + CI mirror at `.cortex/audit/reviews/` (link from task folder) |

## Status Legend

- [ ] Todo
- [x] Done
- [ ] (WIP) In progress — append `(WIP)` to the line
- [ ] (BLOCKED) Blocked — append `(BLOCKED)` + reason

## Operating Principles (TDD + Workflow)

- Tests first: each change starts with a failing test.
- Minimal implementation to green; then refactor while green.
- Single-focus commits: tests + implementation together; Conventional Commits.
- Prefer smart Nx: `pnpm test:smart`, `pnpm lint:smart`, `pnpm build:smart`.
- Use Agent Toolkit for search/mods/verification: `just scout`, `just codemod`, `just verify`.
- Local Memory via `createStoreFromEnv()` when tests touch memories.

### Task Execution Log Checklist

- [ ] Smart targets recorded for the task (`pnpm build:smart`, `pnpm test:smart`, `pnpm lint:smart` or rationale for omissions)
- [ ] TDD Coach checkpoints captured (red → green → refactor evidence and any waivers)
- [ ] Performance budget validation noted (bundle/time/memory metrics with pass/fail outcome)

## Coverage Assessment — Did the plan cover all gaps?

Covered by plan (examples):

- Structure-guard enforcement, deny-by-default egress, audit logging, secret scoping
- Evidence schema + attachment, RAG citations/bundles/freshness, evidence in memories
- A2A rate limits/quotas/burst smoothing, replay helpers
- Model Gateway circuit breakers, sticky sessions, token/VRAM budgets, provider scoring
- Cerebrum: LLM planning strategy, simulation safety checks, epistemic confidence
- Golden outputs for agents
- MCP: health pings, streaming chunk control, cost/latency meters, allowlist
- Observability: span propagation, local viewer
- Memories: consolidation/decay, short/long-term tiers
- Supply chain: OSV, SBOM, gitleaks, CodeQL, cosign

Missing or underspecified in plan (added to tracker below):

- Policy hot-reload
- Error budget calculation (SLOs)
- Flamegraphs profiling
- Per-subagent scopes (fine-grained access control)
- Curriculum building (advanced learning paths)
- Agent interactive corrections (human-in-the-loop)
- MCP capability discovery
- Multi-GPU sharding
- Evidence-first retrieval strategy (RAG-first guard)

---

## Master Checklist

### Architecture & Security Guardrails

- [x] Structure-guard: policy schema and test harness (deny cross-feature imports)
- [x] Structure-guard: ESLint/plugin enforcement + CLI integration (`just verify`)
- [x] Policy hot-reload: runtime reload of guard/policy configs without restart
  - Hybrid watcher: fs.watch + watchFile + polling fallback
  - Validated reload events (reload, parse/validation errors, deletion)
  - Atomic consumer pattern helper (`policy-state.ts`)
  - Contract + mutation tests + integration docs cross-linked
- [x] Deny-by-default egress: allowlist + error type + env toggles
- [x] Tool allowlist enforcement in MCP core (structured policy errors)
- [x] Audit logging for allow/deny decisions (CloudEvents + redaction)
- [x] Explicit secret scoping/accessor; redact in logs
- [x] Agent Isolation Sandbox: worker-based execution with comprehensive API restrictions, policy violation detection,
  configurable thresholds, structured violation codes, and complete audit logging

### Evidence-First RAG & CloudEvents

- [x] CloudEvents: evidence schema + validation (serialize/deserialize)
  - Implemented `evidenceItemSchema` & `evidenceArraySchema` (`libs/typescript/contracts/src/evidence.ts`)
    with max 50 items, offset validation, at-least-one-of text|uri rule, relevance score,
    hashing & metadata.
  - Added contract test `evidence.contract.test.ts` validating ordering, constraints, CloudEvent embedding.
  - Added `withEvidence` helper (`packages/a2a/a2a-contracts/src/envelope.ts`) for non-mutating attachment.
- [x] Model Gateway: attach evidence/citations to responses; propagate downstream
  - Evidence auto-attachment implemented in `packages/model-gateway/tests/server.evidence.test.ts`
  - All responses (embeddings, rerank, chat) include evidence arrays with proper hashing
- [x] RAG: retrieval with citations per-claim; "no evidence" path
  - Citation bundler implemented in `packages/rag/src/lib/citation-bundler.ts`
  - Supports per-claim citations, no-evidence handling, and deduplication
- [x] RAG: bundles with grouped/de-duped citations, deterministic order
  - Enhanced citation bundler with source grouping and deterministic sorting
  - Includes `bundleWithDeduplication` and `bundleWithClaims` methods
- [x] RAG: freshness routing (threshold configurable)
  - Freshness router implemented in `packages/rag/src/retrieval/freshness-router.ts`
  - Configurable cache thresholds, live/cache routing strategies
- [ ] Evidence-first retrieval strategy: route answerability through RAG gate before LLM
- [ ] Agents: explicit evidence attachment on actions/memories

### A2A Controls: Limits, Quotas, Replay

- [x] Per-agent rate limiting (windowed)
  - Rate limiter implementation in `packages/a2a-services/common/src/middleware/rateLimiter.ts`
  - Windowed rate limiting with configurable limits and retry-after headers
- [ ] Per-agent quotas (requests/tokens; reset logic)
- [ ] Burst smoothing (token bucket)
- [x] Replay helpers: outbox/DLQ reprocessing with idempotency + range filters
  - DLQ implementation in `packages/a2a/a2a-core/src/dlq.ts` for event replay

### Model Gateway Resilience & Resource Management

- [x] Circuit breakers per provider/route (open/half-open/metrics)
  - Full circuit breaker implementation in `packages/orchestration/src/lib/circuit-breaker.ts`
  - Includes state management (closed/open/half-open), metrics, and CircuitBreakerManager
  - Event-driven with comprehensive statistics and manual control options
- [ ] Sticky sessions (consistent routing; opt-out)
- [ ] Token/VRAM budget tracking (session, project, global)
- [ ] Provider health/quality scoring (latency/failure/backoff)
- [ ] Multi-GPU sharding support (routing + capacity awareness)

### Cerebrum & Agent Quality

- [ ] Epistemic confidence tagging in plans and propagation
- [ ] Simulation gate: safety, cost, permission, evidence checks
- [ ] LLM planning via injectable strategy; deterministic mock for CI
- [ ] Curriculum building: advanced path generation with evaluation tests
- [ ] Golden outputs for key agent tasks (snapshot tests)
- [ ] Agent streaming improvements (fine-grained events; backpressure awareness)
- [ ] Interactive corrections (HITL): accept/patch/rollback loops with audit trails

### Observability & Telemetry

- [ ] Comprehensive span propagation across subsystems
- [ ] Local observability viewer (filter by agent/session; no PII)
- [ ] Error budget calculation + SLO dashboards/alerts
- [ ] Flamegraphs (CPU/async) for critical paths

### MCP Enhancements

- [x] Health pings (heartbeat + liveness)
  - Comprehensive health check system implemented in `packages/mcp/observability/health.py`
  - Includes HealthStatus enum, HealthCheckResult dataclass, and system metrics collection
- [ ] Streaming chunk control (sizes, end markers, backpressure)
- [ ] Cost/latency meters per tool call (tags: agent/tool)
- [ ] Capability discovery (introspection + versioning)

### Memory Lifecycle

- [ ] Consolidation job (merge duplicates; preserve evidence)
- [ ] Decay heuristics (recency/use; protected tags)
- [ ] Short/long-term tiers (routing, promotion/demotion)

### Security & Supply Chain

- [ ] OSV scanner gating
- [x] SBOM (SPDX) per package
  - SBOM generation implemented in `tools/scripts/generate-sbom.ts`
  - Supports both Node.js (CycloneDX) and Python (uv) package generation
  - JSON format output with proper CycloneDX 1.5 spec compliance
- [x] gitleaks pre-commit/CI
  - Gitleaks configuration in `.gitleaks.toml`
  - Proper allowlists for non-secret placeholders and ignored paths
  - Focused scanning on real source code, excluding vendored/build artifacts
- [ ] CodeQL workflow
- [ ] cosign signing + verification

#### Security Incident Response Matrix

| Severity | Initial Acknowledgment | Investigation & Owner | Fix & Disclosure Target | Notes |
| -------- | ---------------------- | ---------------------- | ----------------------- | ----- |
| Critical (CVSS ≥ 9.0) | ≤24 hours (goal), ≤72 hours absolute | Security Response Lead with Product Engineering Director | Mitigation in place ASAP; coordinated disclosure ≤45 days with weekly status updates | Emergency communications tree activated, 24/7 pager rotation engaged. |
| High (CVSS 7.0–8.9) | ≤72 hours | Security Response Lead with Service Owners | Fix planned within 14 days, public disclosure ≤45 days | Prioritize backlog, schedule maintenance windows as needed. |
| Medium (CVSS 4.0–6.9) | ≤72 hours | Security Engineering Triage + Component Owner | Fix or mitigation before 45-day disclosure window closes | Track progress in task folder, escalate if SLAs risk breach. |
| Low (CVSS < 4.0) | ≤72 hours | Component Owner with Security Advisor | Remediation scheduled; disclose with next release or ≤45 days if customer impact | Document risk acceptance if deferring beyond next release. |

Owners log acknowledgments, remediation steps, and disclosures in the corresponding task folder (e.g., `tasks/security-operations-plan/`) and update the public security policy when timelines or responsible parties change.

---

## TDD Micro-Tasks Backlog (bitesize, test-first)

1. Structure-guard: policy schema tests → minimal impl
1. Structure-guard: ESLint rule tests → plugin + wiring
1. Deny-by-default egress: policy tests → wrapper + envs
1. MCP tool allowlist: policy tests → enforcement + errors
1. Audit events: emission tests → redaction + spans
1. Secret scoping: accessor tests → redact on logs
1. Evidence schema: zod tests → CE attach/parse
1. RAG citations: retrieval tests → cite in results
1. RAG bundles: grouping tests → deterministic output
1. RAG freshness: threshold tests → cache/live routing
1. Agents: evidence attach tests → write-through memories
1. A2A rate limits: window tests → headers + retry-after
1. Quotas: monthly caps tests → over-quota errors
1. Burst smoothing: token bucket tests → starvation-free
1. Replay helpers: outbox/DLQ replay tests → idempotency
1. Circuit breakers: state machine tests → metrics
1. Sticky sessions: affinity tests → opt-out
1. Token/VRAM budgets: session tracking tests → rejections
1. Provider scoring: routing tests → decay/recovery
1. Multi-GPU sharding: placement tests → capacity map
1. Epistemic confidence: tagging tests → propagation
1. Simulation gate: feasibility/safety tests → blockers
1. LLM planning: strategy interface tests → mock impl
1. Curriculum building: path-gen tests → scoring
1. Golden outputs: snapshot tests → update guard
1. Agent streaming: event/chunk tests → backpressure
1. Interactive corrections: HITL flow tests → audit
1. Span propagation: cross-boundary tests → baggage
1. Observability viewer: local load/filter tests
1. Error budget calc: SLI/SLO tests → alert math
1. Flamegraphs: profiler hook tests → artifact store
1. MCP health pings: heartbeat tests → liveness
1. MCP streaming control: size/end-marker tests
1. MCP cost/latency meters: metric tags tests
1. MCP capability discovery: introspection tests
1. Consolidation job: merge tests → scheduler
1. Decay heuristics: curve tests → exemptions
1. Memory tiers: routing tests → promotion
1. OSV scanner: failing dep test → allowlist
1. SBOM: artifact presence tests → per-package
1. gitleaks: secret catch test → baseline allowlist
1. CodeQL: workflow smoke tests
1. cosign: sign/verify tests → CI gate

Each task should land as a single focused commit with tests + minimal implementation.

---

## Validation Commands (per change)

```bash
pnpm biome:staged
pnpm lint:smart
pnpm typecheck:smart
pnpm test:smart
# optional
just verify changed.txt
```

## Notes

- Use deterministic mocks for LLM, network, time, and OTEL exporters.
- Prefer deny-by-default and explicit allowlists for tools, egress, and secrets.
- Keep documentation and public APIs up to date when tasks change behavior.

### Additional Completed (Not Originally Explicitly Listed)

- [x] Agent Isolation Sandbox: **Production-ready TDD implementation** with comprehensive features:
  - **Worker-based isolation**: Complete API surface restriction with restricted API passed as parameter
  - **Multi-layer security**: File system, network, process control, memory, timeout, and dynamic code execution guards
  - **Robust serialization**: structuredClone primary with JSON.stringify fallback and error handling
  - **Configurable thresholds**: maxViolations setting with severity escalation (default: 5)
  - **Structured violation codes**: Clear enum system (NETWORK_ACCESS, FILE_SYSTEM, PROCESS_CONTROL, etc.)
  - **Comprehensive audit logging**: CloudEvents-based with violation metadata and redaction support
  - **Contract validation**: Zod schema with complete contract test suite
  - **Centralized event architecture**: Reusable helpers for consistent audit event emission
  - **Full test coverage**: 14/14 tests passing (sandbox + contracts)
  - **Complete documentation**: README updated with usage examples and violation code reference

- [x] Code Quality & Standards Compliance (Sept 2025): **TDD-driven modernization**
  - **Export standards**: Eliminated `export default` violations (freshness-router.ts)
  - **Async patterns**: Converted Promise.then() chains to async/await (ImagePreview.tsx)
  - **Accessibility compliance**: Added WCAG 2.2 AA support with ARIA labels and keyboard navigation
  - **TypeScript compatibility**: Fixed replaceAll() usage for broader browser support
  - **Deprecated code cleanup**: Removed legacy workflows directory and outdated documentation
  - **Error handling**: Implemented proper try/catch blocks for async operations
  - **Code structure**: Enhanced component patterns with proper React hooks and state management

---

## CLI Migration — cortex-cli to cortex-code

- [ ] Plan and execute deprecation of `cortex-cli` with TDD
  - Doc: `project-documentation/cortex-cli-migration-checklist.md`
  - Inventory: `project-documentation/cortex-cli-inventory.md`
  - Acceptance: no remaining references to `apps/cortex-cli`; parity commands available in
    `cortex-code`; smart Nx targets green.
  - Commands affected (initial set to verify): MCP subcommands (list/add/remove/get/show),
    A2A doctor/send.
  - Validation: `pnpm build:smart && pnpm test:smart && pnpm lint:smart && pnpm docs:lint`
  - Status: Parity stubs implemented in `codex` for MCP, A2A, RAG, Simlab, CTL, Eval, Agent;
    references sweep in progress (docs/PM2 updated); removal planned as next PR.
