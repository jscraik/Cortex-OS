# Agent Toolkit Plan Review and Integration Recommendations

Date: 2025-09-23

This document reviews the current `agent-toolkit` TDD plan and proposes practical enhancements and integration patterns across Cortex-OS packages and apps. It also outlines concrete CI/pnpm wiring and enforcement of Local Memory as the first layer.

## Summary

The TDD plan is strong: it targets session-aware context, semantic parsing, resilient execution, and multi-MCP support. The largest gaps are: (1) early, verifiable integration points in CI/pnpm; (2) cross-package adoption recipes; (3) governance guardrails for memory layer defaults.

## Key Improvements to the TDD Plan

1) Session Context & Pruning (Phase 1)
- Add a minimal, pluggable `TokenBudget` interface with unit tests to enforce 40k cap and 20k trim policy without binding to any specific tokenizer.
- Persist session metadata via `@cortex-os/memories` (local-first) under a `agents:toolkit:session` namespace; include opt-in summaries for tool-call logs to avoid unbounded growth.

1) DeepContext (Phase 2)
- Reuse root `build:wasm` output for `web-tree-sitter` grammars. Define a small `LanguageSupport` registry to keep function lengths <40 lines and avoid switch statements.
- Provide a default in-process vector index (e.g., cosine over normalized embeddings) for dev-mode to avoid hard dependency on external DBs in unit tests.

1) Context Engineering (Phase 3)
- Store task context files under `./.agent-tasks/<taskId>/` to avoid polluting repo directories; add a cleanup command.
- Couple research/planning write-outs with an integration test that snapshots `research.md`/`plan.md` and validates required sections.

1) Production Infrastructure (Phase 4)
- Introduce a `ResilientExecutor` with: (a) bounded concurrency, (b) circuit breaker, (c) jittered retries; isolate metrics to a small adapter so functions remain <40 lines.
- Add a tiny “sandboxed shell” abstraction to reject dangerous args (e.g., `;`, `&&`) with allowlist; cover with unit tests.

1) MCP & A2A (Phase 5)
- Define a single `ToolExecutionEnvelope` schema under `libs/typescript/contracts` with optional fields only; add contract tests and a consumer example in `packages/orchestration`.
- Split MCP registration by protocol module to keep functions short and avoid conditional sprawl.

1) Advanced Features (Phase 6)
- Keyed caching by `{tool, inputsHash, repoRev}` to ensure cache correctness across revisions; expose a `CacheStats` API for visibility.
- Context-aware selection should remain declarative: rule table + score, not imperative chains.

1) DX & Docs (Phase 7)
- Generate a one-page “Playbook” with runnable commands and troubleshooting. Link it from `CONTRIBUTING.md`.

## Cross-Package Utilization Patterns

- apps/cortex-os
  - Provide a dev command that runs `at:multi` for hotspots found in logs.
  - Emit `tool.execution.started/completed` A2A events around orchestrated workflows.

- apps/cortex-code
  - Gate `cargo`/Rust checks through the toolkit’s `cargo_verify.sh` for consistent output.
  - Add a `ctl` subcommand to trigger `validate:project` before TUI builds.

- packages/agents
  - Use MCP tools from the toolkit for research/planning steps; persist interim context via Local Memory defaults.
  - Add policy tags to memories (e.g., `scope=session`, `confidential=false`) to enable downstream governance.

- packages/orchestration
  - Bind to `tool.execution.*` events and route to observability; correlate with `traceparent`.
  - Provide a sample orchestrated job that demonstrates search → plan → codemod → validate.

- packages/kernel
  - Use toolkit multi-search to build code-intel context; cache by `repoRev`.

- packages/prp-runner
  - Insert a pre-run check using `validate:project`; collect diagnostics as evidence artifacts.

- packages/rag
  - Use search to generate candidate files and validate diffs before indexing; attach memory references to RAG chunks.

- packages/memories
  - Offer `createPolicyAwareStoreFromEnv()` and document Local Memory as the default short-term layer; ensure `LOCAL_MEMORY_BASE_URL` health check exists.

## CI, PNPM, and GitHub Apps Integration

Implemented:
- `pnpm ci:agent-toolkit:validate` — project validation via toolkit
- `pnpm ci:memory:enforce` — enforces Local Memory first layer
- Wired into `.github/workflows/tdd-enforcement.yml` and ensured `packages/agent-toolkit` is built before use.

Recommended next:
- Add the same two steps to `cortex-review.yml` and `cortex-agent.yml` as required checks.
- Add a pre-commit hook (`husky`) invoking `pnpm at:validate:changed` and `pnpm ci:memory:enforce`.
- Publish a GitHub Check Run summary for agent-toolkit validation results (use `actions/github-script`).

## Local Memory Enforcement (Governance)

- First layer must be Local Memory via MCP/REST: set `MEMORIES_SHORT_STORE=local` and `LOCAL_MEMORY_BASE_URL`.
- Optional: `LOCAL_MEMORY_NAMESPACE`, `LOCAL_MEMORY_API_KEY`.
- CI bypass envs for emergencies: `CI_SKIP_LOCAL_MEMORY_ENFORCE=1` or `CI_SKIP_MEMORY_ENFORCE=1`.

## Quick Wins (Week 1)

- Land CI hooks (done), add docs (done), add pre-commit recipe, add minimal A2A event emission around toolkit calls.

## Phase Rollout

- Phase A (2 weeks): SessionContextManager + TokenBudget, minimal ResilientExecutor, A2A envelopes + tests.
- Phase B (2 weeks): Tree-sitter parsing and semantic chunking with in-memory vector index; cache keyed by repoRev.
- Phase C (2 weeks): Research/Planning workflow with `.agent-tasks/` storage; integration tests snapshotting outputs.

## Acceptance Criteria (Highlights)

- 95% coverage in `packages/agent-toolkit` (unit + integration)
- Tool execution emits A2A events and metrics with correlation IDs
- CI requires Local Memory enforcement and agent-toolkit validation to pass
- All public functions ≤ 40 lines; named exports only

## Risks & Mitigations

- External tool flakiness → circuit breaker + retry + test doubles
- Tokenizer variance → pluggable TokenBudget
- WASM portability → reuse root build artifacts and pin versions

---

For details, see `packages/agent-toolkit/agent-toolkit-tdd-plan.md` and the integration guide `docs/agent-toolkit-integration.md`.
