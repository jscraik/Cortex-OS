# Cortex Memory Decision Log
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
