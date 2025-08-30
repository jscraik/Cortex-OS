Title: Cortex‑OS Evaluation & Validation Plan (Execution)

Objectives
- Prove correctness: contract, schema, and behavior validation across agents.
- Prove reliability: load, canary/shadow in staging, and rollback readiness.
- Prove safety/compliance: security scans, dependency hygiene, governance checks.
- Prove performance/cost: SLOs for latency/error rate and budget alerts.

In Scope
- Contract testing (Pact Broker + provider verify)
- OpenAPI generation and drift checks
- k6 quick + nightly load profiles with thresholds
- Golden traces v1 (chat, rerank) with schema and artifacts
- Staging canary/shadow flows with rollback drills (scaffolded)
- Governance: .cortex validation, schema/contract checks in CI

Out of Scope (Phase 1)
- Production infra provisioning and secrets management
- Full compliance attestations (SOC2/ISO27001), pen test execution

Milestones & Tasks
1) Contracts & API
   - [x] Generate/serve OpenAPI and test presence
   - [x] Pact consumer (MCP) + provider verify
   - [x] Broker publish/verify with tag matrix (branch/PR)

2) Load & Reliability
   - [x] k6 quick profile on PRs
   - [x] Nightly k6 load with tighter thresholds
   - [ ] Staging canary/shadow/rollback scripts and CI job

3) Evals & Quality
   - [x] Golden traces v1 (chat, rerank) + schema + runner
   - [ ] Expand suites (RAG retrieval, embeddings) and track results over time
   - [ ] Add AgentOps/Knostic integration when credentials available

4) Governance & Security
   - [x] .cortex validation and contracts check in CI
   - [x] CodeQL + Semgrep + SBOM
   - [ ] Dependency/coverage thresholds as CI gates

Acceptance Criteria
- Contracts: Provider verifies latest broker pacts for target tags; consumer pacts published on PR/branch.
- OpenAPI: Generated at build; gateway serves openapi.json; CI test asserts required paths.
- Load: PR quick run passes; nightly load meets P95 and error thresholds.
- Evals: Golden suites pass; artifacts uploaded in CI per run.
- Staging: Canary + shadow scripts callable from CI; rollback script available; dry‑run passes.

Runbooks (initial)
- Golden: uv run python evals/run_golden.py --suite chat --out golden-chat.json
- k6 quick: k6 run k6/quick.js (BASE_URL=http://localhost:3333)
- Pact publish: pnpm -F @cortex-os/gateway exec node scripts/publish-pacts.cjs

Owners
- Contracts/API: Core platform
- Load/Resilience: Platform SRE
- Evals/Golden: Applied Research
- Security/Governance: Security Eng

Notes
- Staging CI assumes environment variables and credentials are provided; otherwise runs in dry‑run mode.
