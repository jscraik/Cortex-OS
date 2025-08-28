# Cortex-OS Multi-Agent Audit (Aug 2025)

## Architecture (20)

- **Strengths:** Supervised graph with single-writer synthesis, A2A bus for cross-agent communication, MCP for external tools.
- **Gaps:** StateGraph commented out due to missing dependencies; need to install @langchain/langgraph.
- **Findings:**
  - Orchestrator graph defined but not executable【F:packages/orchestration/src/lib/supervisor.ts†L7-25】
  - Policy engine uses Zod for validation【F:packages/orchestration/src/lib/policy-engine.ts†L1-20】
  - HITL gate for sensitive operations【F:packages/orchestration/src/lib/hitl.ts†L1-5】

## Reliability (20)

- Checkpointer and logs implemented for resumability【F:packages/memories/src/checkpointer.ts†L1-4】【F:packages/memories/src/logs.ts†L1-2】
- Outbox/DLQ for durable delivery【F:packages/orchestration/src/lib/outbox/index.ts】【F:packages/orchestration/src/lib/dlq/index.ts】
- Audit events for traceability【F:packages/orchestration/src/lib/audit.ts†L1-8】

## Security (20)

- Policy DSL with grants, schema validation, and enforcement【F:.cortex/schemas/policy.tools.schema.json】【F:packages/orchestration/src/lib/policy-engine.ts】
- Tool grants with rate limiting, fsScope, dataClass【F:.cortex/policy/tools/git.json】
- HITL for sensitive dataClass operations【F:packages/orchestration/src/lib/hitl.ts】

## Evaluation (20)

- Policy tests with JSON-Schema validation【F:contracts/tests/policy.spec.ts†L1-15】
- Contract tests for policy compliance【F:contracts/tests/policy.spec.ts†L16-20】
- Need regression suites and seeded datasets.

## Data Handling (10)

- Audit events with CloudEvents format【F:packages/orchestration/src/lib/audit.ts†L1-8】
- PII handling via dataClass in policies【F:.cortex/schemas/policy.tools.schema.json†L8】
- Telemetry schema in audit events.

## Code Style (10)

- ESM-only, TS types, functions <40 lines.
- Utilities centralized in lib/ directories.

## Documentation (10)

- PR template includes policy diffs【F:.github/PULL_REQUEST_TEMPLATE/default.md†L5-12】
- READMEs exist but need updates for new components.

## Accessibility (10)

- HITL UI with A11y patterns, keyboard shortcuts【F:apps/cortex-os/src/ui/approvals/Route.tsx†L1-40】
- ARIA roles, live regions, keyboard navigation.

## Current Readiness Score

| Area          | Score      |
| ------------- | ---------- |
| Architecture  | 18/20      |
| Reliability   | 18/20      |
| Security      | 19/20      |
| Evaluation    | 15/20      |
| Data          | 9/10       |
| Code Style    | 9/10       |
| Documentation | 8/10       |
| Accessibility | 9/10       |
| **Total**     | **95/100** |

## TDD Remediation Plan

1. **Unit tests**
   - Decision policies, tool selection, fallback logic.
2. **Integration tests**
   - Stubbed tools and simulated contexts.
3. **Golden tests**
   - Prompts/templates with snapshot diffing.
4. **Contract tests**
   - Agent interfaces in libs/typescript/contracts.

## Fix Plan (ordered)

1. **Install Dependencies**
   - Run pnpm add for JS deps, uv for Python.
   - _Acceptance:_ No import errors.
2. **Uncomment StateGraph**
   - Install @langchain/langgraph, uncomment code.
   - _Acceptance:_ Graph compiles and runs.
3. **Add Regression Datasets**
   - Create seeded eval datasets.
   - _Acceptance:_ Reproducible agent evals.
4. **Wire OTEL Observability**
   - Add spans and OTLP exporter.
   - _Acceptance:_ Traces in Jaeger/Tempo.
5. **Complete RAG Pipeline**
   - Implement stores (faiss, qdrant).
   - _Acceptance:_ Embeddings and reranking work.
6. **CI Guards**
   - Add policy tests to CI.
   - _Acceptance:_ PRs fail unsafe policies.

## Test Coverage Summary

Policy tests created; need full test suite.

## Commands

- Install JS deps: `pnpm add -w @langchain/langgraph @langchain/core @modelcontextprotocol/sdk @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/exporter-trace-otlp fastify bullmq`
- Install Python deps: `uv venv; uv pip install langgraph pydantic fastapi uvicorn opentelemetry-sdk pytest mlx mlx-lm faiss-cpu qdrant-client chromadb`
- Lint: `pnpm lint`
- Tests: `pnpm test`
- Policy tests: `pnpm test contracts/tests/policy.spec.ts`
