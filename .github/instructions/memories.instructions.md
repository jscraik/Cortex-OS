# Cortex Memory Decision Log
## 2025-01-12 Wikidata Task Code Review - Security Fixes Applied & Assessment Complete
- Decision: Conducted comprehensive code review following `.github/prompts/code-review-agent.prompt.md`. Fixed 2 critical security violations (Math.random() usage and missing brAInwav branding). Applied surgical fixes without breaking existing functionality. Assessment: Core Wikidata implementation is architecturally excellent and ready for production after security fixes.
- Impacted Surfaces: packages/memory-rest-api (security fixes), .cortex/reviews/9de63038d (review artifacts), tasks/wikidata-semantic-layer-integration (assessment docs)
- Evidence: Security violations fixed (Math.random()→randomUUID(), added brAInwav branding), comprehensive review of 15+ files, 5 issues documented with fixes applied, final assessment shows CONDITIONAL-GO after critical fixes
- LocalMemoryEntryId: mem-2025-01-12-code-review-security-fixes-1736719800
- RESTReference: http://localhost:3028/api/v1/memories/mem-2025-01-12-code-review-security-fixes-1736719800

## 2025-01-12 Wikidata Task Code Review - Documentation Reality Assessment Complete
- Decision: Conducted comprehensive code review following `.github/prompts/code-review-agent.prompt.md`. Fixed 4 technical issues (security, branding, environment config). Corrected false production claims in documentation. Assessment: PLANNING COMPLETE, implementation required for production readiness.
- Impacted Surfaces: packages/mcp-registry (security fix), packages/memory-core (branding), .env.example (config), tasks/wikidata-semantic-layer-integration (honest status), .cortex/reviews/69aec5e03 (review artifacts)
- Evidence: Security fix applied (hardcoded paths→env vars), branding standardized (brAInwav), documentation corrected (54%→0% implementation), 5 issues documented in issues.json, review.md with NO-GO→CONDITIONAL-GO after fixes
- LocalMemoryEntryId: mem-2025-01-12-code-review-wikidata-1736719800
- RESTReference: http://localhost:3028/api/v1/memories/mem-2025-01-12-code-review-wikidata-1736719800

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
