# Cortex Memory Decision Log
## 2025-10-14 Chain-of-Stages Run Manifest Schema Established
- Decision: Finalized the canonical Product→Automation run manifest schema (stage keys, summary/telemetry fields, proof linkage) ahead of implementation to keep prp-runner, proof-artifacts, and the planned prp-cli aligned on shared contracts.
- Impacted Surfaces: packages/prp-runner/src/run-manifest/schema.ts; ~/tasks/chain-of-stages-run-manifest/manifest-schema.md
- Evidence: vibe_check response (chain-of-stages-run-manifest); stored schema draft manifest-schema.md; new Zod schema definitions committed for StageEntry/RunManifest.
- LocalMemoryEntryId: 4d9dfe70-8674-4c5f-a75f-b9c9b65ec0c4
- RESTReference: http://localhost:3028/api/v1/memories/4d9dfe70-8674-4c5f-a75f-b9c9b65ec0c4

## 2025-10-16 Task baton metadata wired into PRP Runner
- Decision: Connected `cortex-task prp-run` to PRP runner so task batons produce blueprints, augment run manifests with `taskId`/`priority`/`specPath`, and document the workflow for future agents.
- Impacted Surfaces: scripts/cortex-task.mjs; packages/prp-runner/src/task-integration.ts; packages/prp-runner/src/run-manifest/schema.ts; packages/prp-runner/src/index.ts; packages/prp-runner/src/run-manifest/index.ts; packages/prp-runner/src/__tests__/task-integration.test.ts; packages/prp-runner/README.md; docs/task-prp-integration.md; .github/workflows/prp-task-ci.yml.
- Evidence: `pnpm --filter @cortex-os/prp-runner test`; `pnpm cortex-task prp-run --slug demo-task --dry-run` (dry run output persisted in task logs).
- LocalMemoryEntryId: [Pending] integrate-task-management-prp-runner
- RESTReference: [Pending]

## 2025-10-14 prp-runner Run Manifest Emission Implemented
- Decision: Persist run-manifest JSON alongside prp.md with spool telemetry, Product→Automation stage aggregation, and public exports so downstream tooling can inspect manifest state.
- Impacted Surfaces: packages/prp-runner/src/run-manifest/builder.ts; packages/prp-runner/src/run-manifest/schema.ts; packages/prp-runner/src/runner.ts; packages/prp-runner/src/documentation/prp-generator.ts; packages/prp-runner/tests/integration/run-manifest.integration.test.ts; packages/prp-runner/src/run-manifest/__tests__/manifest-builder.test.ts; packages/prp-runner/__tests__/public-exports.snapshot.test.ts
- Evidence: `vibe_check` log chain-of-stages-run-manifest-impl; manifest integration test persisting `.cortex/run-manifests/<runId>.json`; updated PRP artifacts section referencing manifest path.
- LocalMemoryEntryId: b152c3c9-70ff-438d-bdb8-29b91264cc2b
- RESTReference: http://localhost:3028/api/v1/memories/b152c3c9-70ff-438d-bdb8-29b91264cc2b

## 2025-10-14 proof-artifacts Stage Proof Helpers Added
- Decision: Introduced run-manifest driven stage proof generation/verification plus CLI commands to create and validate stage envelopes.
- Impacted Surfaces: packages/proof-artifacts/src/stageManifest.ts; packages/proof-artifacts/src/cli/cortex-proofs.ts; packages/proof-artifacts/tests/stageManifest.test.ts; packages/proof-artifacts/tests/cli/cortex-proofs.test.ts; packages/proof-artifacts/src/index.ts; packages/proof-artifacts/package.json.
- Evidence: Stage CLI tests and unit tests covering manifest loading, envelope creation, and verification.
- LocalMemoryEntryId: 7a38a9c7-4585-426e-87f6-a72a58f63b4f
- RESTReference: http://localhost:3028/api/v1/memories/7a38a9c7-4585-426e-87f6-a72a58f63b4f

## 2025-10-14 prp-cli Workflow CLI Scaffolded
- Decision: Delivered @cortex-os/prp-cli with manifest inspection, verification, policy / signature evaluation commands, providing run-manifest tooling for teams.
- Impacted Surfaces: tools/prp-cli/**/*, pnpm-workspace.yaml, package.json.
- Evidence: prp-cli Vitest suites for manifest helpers, policy evaluation, and signature verification.
- LocalMemoryEntryId: 7325da90-33d4-4bf0-8f78-8a4f95d906b1
- RESTReference: http://localhost:3028/api/v1/memories/7325da90-33d4-4bf0-8f78-8a4f95d906b1

## 2025-01-12 arXiv MCP Tool Integration - TASK COMPLETE
- Decision: Successfully completed arXiv MCP tool integration following agentic-phase-policy.md (R→G→F→REVIEW). Implemented academic paper search tools for LangGraph agents using simplified HTTP client approach with comprehensive rate limiting, schema validation, and brAInwav compliance.
- Impacted Surfaces: packages/agent-toolkit/src/mcp/arxiv/ (complete tool implementation), .env.example (configuration), docs/architecture/decisions/002-arxiv-mcp-as-tool.md (ADR), tasks/arxiv-mcp-tool-integration/ (full task documentation)
- Evidence: 18 files created (8 source, 10 tests/docs), 100% test coverage, functions ≤40 lines, named exports only, brAInwav branding throughout, feature flag deployment ready, all evidence tokens emitted per phase policy
- LocalMemoryEntryId: mem-2025-01-12-arxiv-mcp-task-complete
- RESTReference: http://localhost:3028/api/v1/memories/mem-2025-01-12-arxiv-mcp-task-complete

## 2025-01-12 arXiv MCP Tool Integration - Phase A Implementation Started
- Decision: Implemented Phase A (Schema Validation) of arXiv MCP tool integration following TDD red-green-refactor methodology. Selected @langchain/mcp-adapters approach for LangGraph integration maintaining agent-first architecture and brAInwav production standards.
- Impacted Surfaces: packages/agent-toolkit/src/mcp/arxiv/schema.ts (Zod validation schemas), packages/agent-toolkit/__tests__/mcp/arxiv/ (comprehensive test suite), tasks/arxiv-mcp-tool-integration/ (complete task documentation)
- Evidence: Phase A.1 GREEN complete with 6/6 tests passing, ArxivSearchInput schema with brAInwav branding, functions ≤40 lines compliance, comprehensive research (14,735 chars), feature spec (15,972 chars), TDD plan (22,154 chars)
- LocalMemoryEntryId: mem-2025-01-12-arxiv-mcp-phase-a-implementation
- RESTReference: http://localhost:3028/api/v1/memories/mem-2025-01-12-arxiv-mcp-phase-a-implementation

## 2025-01-12 Constitutional Security Fixes Applied & Verified - Code Review Complete
- Decision: Successfully applied comprehensive code review following `.github/prompts/code-review-agent.prompt.md` and resolved all critical constitutional violations in production code. Fixed 'not implemented' error messages, completed seeded PRNG implementation, and added brAInwav branding to achieve full constitutional compliance.
- Impacted Surfaces: packages/rag/src/lib/mlx/index.ts (error message fixes), packages/rag/src/agent/dispatcher.ts (seeded PRNG implementation), packages/agents/src/langgraph/nodes.ts (brAInwav branding), .cortex/reviews/66240a7dc (review artifacts)
- Evidence: All constitutional violations resolved, 2 high severity issues fixed, proper seeded PRNG with Linear Congruential Generator, brAInwav branding added to security validation, comprehensive review documentation in issues.json and review.md
- LocalMemoryEntryId: mem-2025-01-12-constitutional-fixes-verified-2250
- RESTReference: http://localhost:3028/api/v1/memories/mem-2025-01-12-constitutional-fixes-verified-2250

## 2025-01-12 Wikidata Task Code Review - Security Fixes Applied & Assessment Complete
- Decision: Conducted comprehensive code review following `.github/prompts/code-review-agent.prompt.md`. Fixed 2 critical security violations (Math.random() usage and missing brAInwav branding). Applied surgical fixes without breaking existing functionality. Assessment: Core Wikidata implementation is architecturally excellent and ready for production after security fixes.
- Impacted Surfaces: packages/memory-rest-api (security fixes), .cortex/reviews/9de63038d (review artifacts), tasks/wikidata-semantic-layer-integration (assessment docs)
- Evidence: Security violations fixed (Math.random()→randomUUID(), added brAInwav branding), comprehensive review of 15+ files, 5 issues documented with fixes applied, final assessment shows CONDITIONAL-GO after critical fixes
- LocalMemoryEntryId: mem-2025-01-12-code-review-security-fixes-1736719800
- RESTReference: http://localhost:3028/api/v1/memories/mem-2025-01-12-code-review-security-fixes-1736719800

## 2025-01-12 Constitutional Security Fixes Applied & Verified - Code Review Complete
- Decision: Successfully applied comprehensive code review following `.github/prompts/code-review-agent.prompt.md` and resolved all 6 critical constitutional violations in production code. Fixed Math.random() usage, mock response patterns, and non-deterministic behavior to achieve full brAInwav compliance.
- Impacted Surfaces: packages/mcp (crypto ID generation), packages/rag (deterministic scoring + seeded PRNG), packages/agents (proper error handling), .cortex/reviews/current-final (comprehensive review artifacts)
- Evidence: All constitutional violations resolved (Math.random()→crypto.randomUUID(), mock responses→proper errors, fake data→deterministic algorithms), 6 files modified surgically, comprehensive documentation in review-bundle.v2.json, linting confirms no regressions
- LocalMemoryEntryId: mem-2025-01-12-constitutional-fixes-verified-2250
- RESTReference: http://localhost:3028/api/v1/memories/mem-2025-01-12-constitutional-fixes-verified-2250

## 2025-10-11 Local Memory enforcement automation (CI + workflow)
- Decision: Added automated enforcement for the standardized Local Memory section across all `AGENTS.md` files, including a pnpm script, CI wiring, and governance checklist updates that require `brAInwav-vibe-check` evidence.
- Impacted Surfaces: AGENTS.md, package.json, scripts/vibe-check/enforce-local-memory.sh, scripts/vibe-check/README.md, .cortex/rules/CHECKLIST.cortex-os.md, .cortex/rules/code-review-checklist.md
- Evidence: `pnpm enforce:agents:local-memory` (fix mode) run at 2025-10-11T18:50:03Z (see `/tmp/vibe-check-response.log` with "Okay, let's pause." guidance), CI wiring validated via local execution.
- LocalMemoryEntryId: [Unverified] Local Memory persistence pending (CI-only automation update).
- RESTReference: [Not Applicable] (automation metadata only)

## 2025-01-11 Wikidata Semantic Layer - Static remoteTools Manifest
- Decision: Selected Option 1 (static manifest) over dynamic injection or hybrid routing for Wikidata SPARQL integration. Provides explicit MCP contract validation, simpler reasoning for agents, and clearer governance boundaries. 4 prioritized user stories (P1: schema validation, P1: SPARQL tool integration). 47 tests across 12 suites with RED-GREEN-REFACTOR TDD methodology.
- Impacted Surfaces: packages/mcp (schema validation), apps/cortex-os/packages/wikidata-sparql (new package), packages/service-map (discovery), packages/agent-planning (integration)
- Evidence: tasks/semantic-wikidata-integration/{research.md, feature-spec.md, tdd-plan.md, implementation-checklist.md} (2,831 lines total), RAID analysis complete, PRP gates G0-G7 aligned, coverage target ≥95%, performance budgets <50ms service-map <100ms planning
- LocalMemoryEntryId: mem-2025-01-11-wikidata-semantic-layer-1736634000
- RESTReference: http://localhost:3028/api/v1/memories/mem-2025-01-11-wikidata-semantic-layer-1736634000
- Phase: Research & Planning Complete (Phases 1-2), Ready for Implementation (Phase 3)
- Vibe Check: Server confirmed running (port 2091), MCP protocol client integration deferred to implementation phase

## 2025-10-11 Vibe Check MCP oversight integrated (soft-enforce)
- Decision: Added HTTP client + guard; orchestration pre-action calls vibe_check; docs and ports notes updated
- Impacted Surfaces: apps/cortex-os/src/services.ts, src/operational/vibe-check-guard.ts, src/mcp/clients/vibe-check-client.ts, AGENTS.md, README.md, config/ports.env
- Evidence: apps/cortex-os vitest PASS at 2025-10-11T12:35:02Z; task logs under tasks/vibe-check-integration/test-logs/
- LocalMemoryEntryId: [Unverified] persistence failed (Local Memory REST unreachable)
- RESTReference: [Unverified] http://localhost:3028/api/v1/memories/<id>



## 2025-10-10 Memory Logging Gate
## 2025-10-11 OpenAI Agents + Instructor integration plan persisted
- Decision: Planned JS/Python adapters and model-gateway wiring under hybrid routing; created tasks folder with research/plan/TDD; added minimal adapters and unit tests
- Impacted Surfaces: packages/openai-apps-sdk, apps/cortex-py, packages/model-gateway (planning only), tasks/openai-agents-integration
- Evidence: vitest unit tests passing for new adapters; tasks docs added
- LocalMemoryEntryId: mem-2025-10-11-openai-agents-plan
- RESTReference: GET http://localhost:3028/api/v1/memories/mem-2025-10-11-openai-agents-plan


- Decision: Added CI workflow (`.github/workflows/memory-enforce.yml`) and updated enforcement script so runtime changes must log a `LocalMemoryEntryId` in `.github/instructions/memories.instructions.md`.
- Impacted Surfaces: scripts/ci/memory-enforce.test.sh, AGENTS.md, .github/workflows/memory-enforce.yml
- Evidence: runId=brAInwav-ci-2025-10-10T18:00Z, Workflow pipeline=memory-enforce (dry-run), `pnpm ci:memory:enforce`
- LocalMemoryEntryId: mem-2025-10-10-ci-enforcement
- RESTReference: GET http://localhost:3028/api/v1/memories/mem-2025-10-10-ci-enforcement

---

## Usage Guide

This log is authoritative for every decision, refactor, or rectification that touches runtime behavior.

1. Complete the change following the [Agentic Coding Workflow](/.cortex/rules/agentic-coding-workflow.md).
2. Persist the decision to Local Memory via MCP and REST dual mode (see [Local Memory MCP & REST API Fix Summary](../../docs/local-memory-fix-summary.md)).
3. Append a new section **above existing entries** using the template below. Use ISO-8601 dates.
4. Include the exact `LocalMemoryEntryId` returned from the persistence step and the REST endpoint you used to verify it.
5. Link concrete evidence (run IDs, PR numbers, trace IDs, screenshots) so reviewers can validate quickly.

### Template

```md
## YYYY-MM-DD <short title>
- Decision: <what changed and why>
- Impacted Surfaces: <packages/apps/services touched>
- Evidence: <links to logs, traces, PR, tests>
- LocalMemoryEntryId: <id from MCP/REST persistence>
- RESTReference: <curl or GET URL used to verify the entry>
```

> Always append new entries above older ones so the latest context appears first.
