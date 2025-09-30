# MCP & Memory Test Matrix (Baseline)

This matrix captures the current automated test coverage prior to the unified MCP + memory refactor. It documents which areas of the new architecture already have support, and highlights the gaps that must be filled in the upcoming phases.

| Package | Current Suites / Files | Maps to New Architecture | Gaps & Notes |
| --- | --- | --- | --- |
| `@cortex-os/agent-toolkit` | `src/__tests__/diagnostics.integration.test.ts`, `diagnostics.cli.e2e.test.ts`, `integration.test.ts`, `integration-clean.test.ts`, `semantic-chunker.test.ts`, `tree-sitter-and-budget.test.ts`, codemap suite (`codemap-adapter.test.ts`, `toolkit-codemap.test.ts`), session/context suites (`session-management.test.ts`, `usecases-context.test.ts`), contract guards (`contracts.test.ts`) | Partial. Exercises diagnostics flows, codemap generation, session management, and semantic chunking which will continue to exist in the new architecture. Does **not** validate MCP exposure or path resolution priorities. | No coverage for tools path resolver priority order, adapters resolving from `$HOME/.Cortex-OS`, or MCP tool registration/events. No direct coverage for token budgeting, resilient executor, or A2A emission. |
| `@cortex-os/memory-core` | `src/__tests__/memoryWorkflowEngine.test.ts` | Minimal. Validates workflow orchestration logic that remains relevant, but focuses on legacy store interactions. | Missing coverage for SQLite-only canonical writes, Qdrant fallback logic, deduplication enforcement, performance guards, and A2A instrumentation expectations. |
| `@cortex-os/mcp-server` | _No automated tests present._ | None. Planned thin-adapter architecture is untested. | Need suites for MCP transport delegation (STDIO + HTTP), agent-toolkit tool registration, and event emission. |
| `@cortex-os/memory-rest-api` | _No automated tests present._ | None. Planned thin REST adapter is untested. | Require endpoint delegation, HTTP semantics, parity with MCP responses, and OpenAPI validation. |
| `packages/memories` (legacy) | Legacy adapters with their own test harnesses (see `packages/memories/tests`). | Legacy-focused. Will be deprecated/removed during refactor. | Tests should either migrate to memory-core or be archived once package is removed. |
| `packages/cortex-mcp` (Python) | pytest-based smoke tests (see `packages/cortex-mcp/tests`). | Legacy-focused. Will be deprecated/converted to proxy. | Needs replacement tests that verify proxy behavior or will be removed alongside package. |

## Coverage Gaps for Unified Architecture

1. **Path Resolution & CLI** – Missing coverage for `resolveToolsDir()` precedence, adapter integration, and CLI environment setup validation. *(Phase 1 requirements).*  
2. **Memory Deduplication & Fallbacks** – No current tests enforcing SQLite canonical writes, Qdrant fallback, or detection of legacy imports. *(Phase 2 requirements).*  
3. **MCP Tool Integration** – No automation verifying `agent_toolkit_*` MCP tools, A2A event envelopes, token budgeting, or resilient execution. *(Phase 3 requirements).*  
4. **Thin Adapter Delegation** – MCP and REST transports need delegation + parity test coverage. *(Phases 4 & 5 requirements).*  
5. **Docker Stack Health** – No automated checks for Docker Compose startup order, health endpoints, or data persistence. *(Phase 6 requirements).*  
6. **CI/CD Enforcement** – Missing scripts and CI jobs for the new enforcement flows. *(Phase 7 requirements).*  
7. **Legacy Removal Validation** – Need safety nets ensuring no regression when removing legacy packages. *(Phase 8 requirements).*  
8. **Final Verification & Documentation** – Requires scripted verification and documentation diffs aligning with final architecture. *(Phase 9 requirements).*  

> Baseline prepared on 2025-09-30. Future phases must update this matrix as new suites are added.
