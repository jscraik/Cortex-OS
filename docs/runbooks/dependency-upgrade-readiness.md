# Dependency Upgrade Readiness

_Updated: 2025-10-08_

This checklist captures the validation we need before unpinning high-impact
runtime dependencies that surfaced during the 2025-10-08 dependency currency
cycle. Each subsection records:

- **Current pin** and the candidate version range.
- **Touch points** in the codebase.
- **Required coverage** additions so we can safely raise the cap under the
  brAInwav 95/95 quality gates and CODESTYLE.md constraints.
- **Exit criteria** for flipping the pin.

All new tests must follow the TDD plan (failing first, ≤40 LOC functions,
named exports) and emit branded errors/logs per CODESTYLE.md.

## 1. `@anthropic-ai/sdk`

- **Current**: `^0.65.0` (pinned below 0.69.0).
- **Latest**: `0.69.0` introduces breaking changes around tool-call envelopes
  and beta response schemas.

### Touch Points

| Area | File(s) | Notes |
| --- | --- | --- |
| Agent orchestration | `packages/orchestration/src/lib/model-selection.ts` | Hard-coded provider `anthropic` with Haiku routing. |
| Planner models | `apps/cortex-os/packages/planner/core/src/models.ts` | Adapter IDs include `anthropic`; drives UX model chooser. |
| PRP Runner | `packages/prp-runner/src/lib/model-selector.ts` | Maps provider enum -> runtime client (expects existing SDK shape). |
| AI test generator | `scripts/ai-ml/ai-test-generator.mjs` | Direct `Anthropic` client import; will break if SDK constructor changes. |
| RAG pipelines | `packages/rag/src/lib/generate-answer.ts` | Delegates to provider-specific steps via LangGraph. |

### Required Coverage & Fixtures

1. **Contract Test:** add `packages/orchestration/tests/integration/anthropic-contract.test.ts`
   that boots the mocked Streamable HTTP transport via FastMCP and asserts:
   - Tool call payload matches the 0.69 schema (nested `response.output_text`).
   - Guard clause returns branded error when server omits beta fields. _(✅ 2025-10-08 – implemented in `packages/orchestration/tests/integration/anthropic-contract.test.ts`)_
2. **Planner Snapshot:** extend `packages/agents/tests/modern-agent-system/unit/planner.test.ts`
   to snapshot the planner's vendor weighting when `provider='anthropic'` is
   selected (ensures we fail loudly if Enum values shift). _(✅ 2025-10-08 – vendor weighting snapshot added in `packages/agents/tests/modern-agent-system/unit/planner.test.ts`)_
3. **CLI Harness:** backfill `scripts/ai-ml/__tests__/ai-test-generator.sdk.test.mjs`
   using the SDK's official mock server to confirm prompt → completion wiring. _(✅ 2025-10-08 – CLI harness coverage added in `scripts/ai-ml/__tests__/ai-test-generator.sdk.test.mjs`)_

### Exit Criteria

- Contract and planner tests green with SDK `0.69.x` under `pnpm run
  test:live`.
- No new peer dependency mismatches (SDK 0.69 requires `zod >= 3.23`, already
  satisfied).
- Update dependency pin + dependency log entry.

## 2. `llama-index` Suite

- **Current**: Core pinned to `0.12.52.post1` with accessory packages (CLI,
  embeddings, workflows, etc.).
- **Latest**: `0.14.x` line introduces `Settings` refactor, async engine, and
  CLI breaking changes.

### Touch Points

| Area | File(s) | Notes |
| --- | --- | --- |
| Python RAG orchestration | `apps/cortex-py/src/multimodal/embedding_service.py` (pending), `apps/cortex-py/src/cortex_py/__init__.py` | Imports aggregated inside service container. |
| Tests | `apps/cortex-py/tests/test_mlx_unified_chat_rerank_smoke.py`, RAG smoke tests under `packages/rag` (TypeScript) | Mix of Python + Node harnesses rely on classic sync API. |
| Memory ingest | `packages/memory-core/src/services/GraphRAGIngestService.ts` | Uses LanceDB + LangChain bridging; ensure compatibility with new vector store adapters. |
| CLI tooling | `packages/rag/__tests__/store/lancedb-migration.test.ts`, `packages/rag/tools/*` | Simulate ingestion using old CLI; will need new command signatures. |

### Required Coverage & Fixtures

1. **Python Regression Suite:** add `apps/cortex-py/tests/test_llama_index_upgrade.py`
   with parameterised cases for:
   - Node retrieval pipeline (mock vector store) exercising the new Settings API.
   - Workflow execution fallback when async tasks raise `CancelledError`. _(✅ 2025-10-08 – regression suite added in `apps/cortex-py/tests/test_llama_index_upgrade.py`)_
2. **JS Bridge Smoke Test:** extend `packages/rag/test/enhanced-helpers.spec.ts`
   to spin up the Python bridge (via `uv run`) and assert handshake traces once
   the 0.14 async event loop boots. _(✅ 2025-10-08 – bridge handshake covered in `packages/rag/test/enhanced-helpers.spec.ts`)_
3. **Migration Script Fixture:** create `tests/rag/fixtures/llama-index-config-v013.json`
   mirroring upstream defaults so we can diff the generated config against our
   pinned version. _(✅ 2025-10-08 – fixture recorded at `tests/rag/fixtures/llama-index-config-v013.json`)_

### Exit Criteria

- New tests cover both Python and Node call sites with ≥95% branch coverage.
- All CLI scripts updated to accept `llama-index` 0.14 `--project` syntax.
- Document config migration steps in `docs/development/baseline-metrics.md`.

## 3. `fastmcp`

- **Current**: `2.1.2` (the last release without OpenAPI client scaffolding).
- **Latest**: `2.12.4` pulls `openapi-core`, `httpx>=0.28`, and new CLIs.

### Touch Points

| Area | File(s) | Notes |
| --- | --- | --- |
| Python MCP server harness | `apps/cortex-py/src/app.py`, `apps/cortex-py/src/operational/health.py` | Uses `FastMCPServer` wrapper; health probes expect legacy response objects. |
| Node FastMCP transport | `apps/cortex-os/tests/http/health-probes.test.ts`, `packages/agents/src/langgraph/streaming.ts` | Validates cross-agent streaming semantics. |
| Eval flows | `tests/tdd-coach/integration.test.ts` | Mocks CLI invocation. |

### Required Coverage & Fixtures

- **Dependency impact (dry run):** `uv pip install --dry-run fastmcp==2.12.4`
  adds `authlib`, `openapi-core`, `openapi-pydantic`, `openapi-schema-validator`,
  `openapi-spec-validator`, `httpx>=0.28.1`, new CLI helpers (`pyperclip`,
  `cyclopts`, `rich-rst`), and upgrades `mcp` to 1.16.0. These packages must be
  reflected in the sandbox and SBOM baselines.
1. **Type Narrowing:** write `apps/cortex-py/tests/test_fastmcp_schema_upgrade.py`
   to validate new OpenAPI-generated models and ensure our deterministic seed
   validator still rejects malformed payloads. _(✅ 2025-10-08 – schema coverage and seed validation added in `apps/cortex-py/tests/test_fastmcp_schema_upgrade.py`)_
2. **Cross-Agent Stream Test:** enhance `packages/agents/tests/modern-agent-system/unit/reflection.test.ts`
   to run against the upgraded FastMCP transport, ensuring backpressure logic
   respects the new async iterators. _(✅ 2025-10-08 – FastMCP streaming guard added in `packages/agents/tests/modern-agent-system/unit/reflection.test.ts`)_
3. **CLI Snapshot:** capture the JSON schema produced by `fastmcp cli` in
   `reports/baseline/fastmcp-schema.json` and guard it with a snapshot test in
   `tests/toolkit/mcp-registration.test.ts`. _(✅ 2025-10-08 – baseline recorded in `reports/baseline/fastmcp-schema.json` with guard in `tests/toolkit/mcp-registration.test.ts`)_

### Exit Criteria

- Python health probes and CLI snapshot tests pass with `fastmcp` 2.12.x.
- `uv lock` no longer drags `openapi-core` transitive dependencies when using
  constrained installs (means we must adopt new optional extras correctly).
- Dependency log updated; `httpx` constraint can move to ≥0.28 once codecarbon
  follows suit.

## 4. `codecarbon` / `httpx`

- **Current**: `codecarbon==3.0.6`, `httpx==0.27.2` (pinned) to retain
  compatibility.
- **Target**: Upgrade to the first `codecarbon` release that relaxes the
  `<0.28` requirement, allowing us to rejoin ecosystem defaults.

### Monitoring Plan

1. **Automated Watch:** add a scheduled job (see TODO in `Justfile`) to run
   `uvx uv pip index versions codecarbon --json` weekly and emit a diff into
   `reports/baseline/dependency-watch.json` (placeholder created 2025-10-08). _(✅ 2025-10-08 – `pnpm dependency:watch` wires `scripts/dependencies/refresh-dependency-watch.mjs` to update the baseline)_
2. **Canary Benchmark:** once a compatible release appears, execute `pnpm -w
   run eval:energy` to capture pre/post energy metrics for MLX inference.
3. **CI Gate Update:** extend `scripts/ci/enforce-gates.mjs` to fail the PR if
   `pnpm run check:deps` detects the pin can be removed but the plan isn’t
   updated.

### Exit Criteria

- `codecarbon` publishes a release with `httpx>=0.28` support.
- Canary benchmark shows ≤5% regression and energy logs remain branded.
- Pins removed from `uv.lock`, dependency log updated.

---

_Keep this document updated as we validate each dependency. Once all exit
criteria are met, reference this checklist in the dependency log entry for the
release that removes the pins._
