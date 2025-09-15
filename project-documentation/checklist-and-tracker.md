# Agentic Second Brain — Production Readiness Checklist and TDD Task Tracker

Last updated: 2025-09-15

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
- [ ] Policy hot-reload: runtime reload of guard/policy configs without restart
- [x] Deny-by-default egress: allowlist + error type + env toggles
- [x] Tool allowlist enforcement in MCP core (structured policy errors)
- [x] Audit logging for allow/deny decisions (CloudEvents + redaction)
- [x] Explicit secret scoping/accessor; redact in logs

### Evidence-First RAG & CloudEvents

- [ ] CloudEvents: evidence schema + validation (serialize/deserialize)
- [ ] Model Gateway: attach evidence/citations to responses; propagate downstream
- [ ] RAG: retrieval with citations per-claim; “no evidence” path
- [ ] RAG: bundles with grouped/de-duped citations, deterministic order
- [ ] RAG: freshness routing (threshold configurable)
- [ ] Evidence-first retrieval strategy: route answerability through RAG gate before LLM
- [ ] Agents: explicit evidence attachment on actions/memories

### A2A Controls: Limits, Quotas, Replay

- [ ] Per-agent rate limiting (windowed)
- [ ] Per-agent quotas (requests/tokens; reset logic)
- [ ] Burst smoothing (token bucket)
- [ ] Replay helpers: outbox/DLQ reprocessing with idempotency + range filters

### Model Gateway Resilience & Resource Management

- [ ] Circuit breakers per provider/route (open/half-open/metrics)
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

- [ ] Health pings (heartbeat + liveness)
- [ ] Streaming chunk control (sizes, end markers, backpressure)
- [ ] Cost/latency meters per tool call (tags: agent/tool)
- [ ] Capability discovery (introspection + versioning)

### Memory Lifecycle

- [ ] Consolidation job (merge duplicates; preserve evidence)
- [ ] Decay heuristics (recency/use; protected tags)
- [ ] Short/long-term tiers (routing, promotion/demotion)

### Security & Supply Chain

- [ ] OSV scanner gating
- [ ] SBOM (SPDX) per package
- [ ] gitleaks pre-commit/CI
- [ ] CodeQL workflow
- [ ] cosign signing + verification

---

## TDD Micro-Tasks Backlog (bitesize, test-first)

1. Structure-guard: policy schema tests → minimal impl
2. Structure-guard: ESLint rule tests → plugin + wiring
3. Deny-by-default egress: policy tests → wrapper + envs
4. MCP tool allowlist: policy tests → enforcement + errors
5. Audit events: emission tests → redaction + spans
6. Secret scoping: accessor tests → redact on logs
7. Evidence schema: zod tests → CE attach/parse
8. RAG citations: retrieval tests → cite in results
9. RAG bundles: grouping tests → deterministic output
10. RAG freshness: threshold tests → cache/live routing
11. Agents: evidence attach tests → write-through memories
12. A2A rate limits: window tests → headers + retry-after
13. Quotas: monthly caps tests → over-quota errors
14. Burst smoothing: token bucket tests → starvation-free
15. Replay helpers: outbox/DLQ replay tests → idempotency
16. Circuit breakers: state machine tests → metrics
17. Sticky sessions: affinity tests → opt-out
18. Token/VRAM budgets: session tracking tests → rejections
19. Provider scoring: routing tests → decay/recovery
20. Multi-GPU sharding: placement tests → capacity map
21. Epistemic confidence: tagging tests → propagation
22. Simulation gate: feasibility/safety tests → blockers
23. LLM planning: strategy interface tests → mock impl
24. Curriculum building: path-gen tests → scoring
25. Golden outputs: snapshot tests → update guard
26. Agent streaming: event/chunk tests → backpressure
27. Interactive corrections: HITL flow tests → audit
28. Span propagation: cross-boundary tests → baggage
29. Observability viewer: local load/filter tests
30. Error budget calc: SLI/SLO tests → alert math
31. Flamegraphs: profiler hook tests → artifact store
32. MCP health pings: heartbeat tests → liveness
33. MCP streaming control: size/end-marker tests
34. MCP cost/latency meters: metric tags tests
35. MCP capability discovery: introspection tests
36. Consolidation job: merge tests → scheduler
37. Decay heuristics: curve tests → exemptions
38. Memory tiers: routing tests → promotion
39. OSV scanner: failing dep test → allowlist
40. SBOM: artifact presence tests → per-package
41. gitleaks: secret catch test → baseline allowlist
42. CodeQL: workflow smoke tests
43. cosign: sign/verify tests → CI gate

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

- Agent Isolation Sandbox (worker-based, restricted API passed as param, fs/network/memory/timeout/dynamic-code guards with audit events)

---

## CLI Migration — cortex-cli to cortex-code

- [ ] Plan and execute deprecation of `cortex-cli` with TDD
  - Doc: `project-documentation/cortex-cli-migration-checklist.md`
  - Inventory: `project-documentation/cortex-cli-inventory.md`
  - Acceptance: no remaining references to `apps/cortex-cli`; parity commands available in `cortex-code`; smart Nx targets green.
  - Commands affected (initial set to verify): MCP subcommands (list/add/remove/get/show), A2A doctor/send.
  - Validation: `pnpm build:smart && pnpm test:smart && pnpm lint:smart && pnpm docs:lint`
